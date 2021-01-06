const _ = require('lodash');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const DocumentClient = new DynamoDB.DocumentClient();
const Constants = require('../lib/constants');

const { TWEETS_TABLE, TIMELINES_TABLE, MAX_TWEETS } = process.env;
const MaxTweets = parseInt(MAX_TWEETS);

module.exports.handler = async (event) => {
  for (let record of event.Records) {
    if (record.eventName === 'INSERT') {
      const relationship = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

      const [relationshipType] = relationship.sk.split('_');

      if (relationshipType === 'FOLLOWS') {
        const tweets = await getTweets(relationship.otherUserId);

        await distribute(tweets, relationship.userId);
      }
    } else if (record.eventName === 'REMOVE') {
      const relationship = DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);

      const [relationshipType] = relationship.sk.split('_');

      if (relationshipType === 'FOLLOWS') {
        const tweets = await getTimelineEntriesBy(
          relationship.otherUserId,
          relationship.userId
        );

        await undistribute(tweets, relationship.userId);
      }
    }
  }
};

async function getTweets(userId) {
  const loop = async (accumulator, exclusiveStartKey) => {
    const response = await DocumentClient.query({
      TableName: TWEETS_TABLE,
      KeyConditionExpression: 'creator = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      IndexName: 'byCreator',
      ExclusiveStartKey: exclusiveStartKey
    }).promise();
  
    const tweets = response.Items || [];
    const newAccumulator = accumulator.concat(tweets);

    // there are more results available
    if (response.LastEvaluatedKey && newAccumulator.length < MaxTweets) {
      return await loop(newAccumulator, response.LastEvaluatedKey);
    } else {
      return newAccumulator;
    }
  }

  return await loop([]);
}

async function getTimelineEntriesBy(distributedFrom, userId) {
  const loop = async (accumulator, exclusiveStartKey) => {
    const response = await DocumentClient.query({
      TableName: TIMELINES_TABLE,
      KeyConditionExpression: 'userId = :userId AND distributedFrom = :distributedFrom',
      ExpressionAttributeValues: {
        ':userId': userId,
        ':distributedFrom': distributedFrom,
      },
      IndexName: 'byDistributedFrom',
      ExclusiveStartKey: exclusiveStartKey,
    }).promise();
  
    const tweets = response.Items || [];
    const newAccumulator = accumulator.concat(tweets);

    // there are more results available
    if (response.LastEvaluatedKey) {
      return await loop(newAccumulator, response.LastEvaluatedKey);
    } else {
      return newAccumulator;
    }
  }

  return await loop([]);
}

async function distribute(tweets, userId) {
  const timelineEntries = tweets.map(tweet => ({
    PutRequest: {
      Item: {
        userId,
        tweetId: tweet.id,
        timestamp: tweet.createdAt,
        distributedFrom: tweet.creator,
        retweetOf: tweet.retweetOf,
        inReplyToTweetId: tweet.inReplyToTweetId,
        inReplyToUserIds: tweet.inReplyToUserIds,
      },
    },
  }));
  
  const chunks = _.chunk(timelineEntries, Constants.DynamoDB.MAX_BATCH_SIZE);

  const promises = chunks.map(async chunk => {
    await DocumentClient.batchWrite({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    }).promise();
  });

  await Promise.all(promises);
};

async function undistribute(tweets, userId) {
  const timelineEntries = tweets.map(tweet => ({
    DeleteRequest: {
      Key: {
        userId,
        tweetId: tweet.tweetId,
      },
    },
  }));
  
  const chunks = _.chunk(timelineEntries, Constants.DynamoDB.MAX_BATCH_SIZE);

  const promises = chunks.map(async chunk => {
    await DocumentClient.batchWrite({
      RequestItems: {
        [TIMELINES_TABLE]: chunk,
      },
    }).promise();
  });

  await Promise.all(promises);
};