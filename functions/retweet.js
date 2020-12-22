const DynamoDB = require('aws-sdk/clients/dynamodb');
const DocumentClient = new DynamoDB.DocumentClient();
const ulid = require('ulid');
const { TweetTypes } = require('../lib/constants');

const {
  USERS_TABLE,
  TWEETS_TABLE,
  TIMELINES_TABLE,
  RETWEETS_TABLE
} = process.env;

module.exports.handler = async (event) => {
  const { tweetId } = event.arguments;
  const { username } = event.identity;
  const id = ulid.ulid();
  const timestamp = new Date().toJSON();

  const getTweetResponse = await DocumentClient.get({
    TableName: TWEETS_TABLE,
    Key: {
      id: tweetId,
    }
  }).promise();

  const tweet = getTweetResponse.Item;

  if (!tweet) {
    throw new Error('Tweet was not found');
  }

  const newRetweet = {
    __typename: TweetTypes.RETWEET,
    id,
    creator: username,
    createdAt: timestamp,
    retweetOf: tweetId,
  };

  // Save a new tweet in the TWEETS_TABLE
  // Save a new entry in the RETWEETS_TABLE
  // Increment the retweets count of the original tweet by one
  // Increment the tweets count of the user by one
  const transactItems = [{
    Put: {
      TableName: TWEETS_TABLE,
      Item: newRetweet,
    },
  }, {
    Put: {
      TableName: RETWEETS_TABLE,
      Item: {
        userId: username,
        tweetId,
        createdAt: timestamp,
      },
      ConditionExpression: 'attribute_not_exists(tweetId)'
    },
  }, {
    Update: {
      TableName: TWEETS_TABLE,
      Key: {
        id: tweetId,
      },
      UpdateExpression: 'ADD retweets :one',
      ExpressionAttributeValues: {
        ':one': 1,
      },
      ConditionExpression: 'attribute_exists(id)',
    },
  }, {
    Update: {
      TableName: USERS_TABLE,
      Key: {
        id: username,
      },
      UpdateExpression: 'ADD tweetsCount :one',
      ExpressionAttributeValues: {
        ':one': 1,
      },
      ConditionExpression: 'attribute_exists(id)',
    },
  }];

  console.log(`creator: [${tweet.creator}]; current user: [${username}]`);

  // If the current user is not the creator of the original tweet, add an entry to his timeline
  if (tweet.creator !== username) {
    transactItems.push({
      Put: {
        TableName: TIMELINES_TABLE,
        Item: {
          userId: username,
          tweetId: id,
          retweetOf: tweetId,
          timestamp,
        },
      },
    });
  }

  await DocumentClient.transactWrite({
    TransactItems: transactItems 
  }).promise();

  return newRetweet;
};