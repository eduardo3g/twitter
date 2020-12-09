const _ = require('lodash');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const DocumentClient = new DynamoDB.DocumentClient();

const {
  USERS_TABLE,
  TWEETS_TABLE,
  TIMELINES_TABLE,
  RETWEETS_TABLE
} = process.env;

module.exports.handler = async (event) => {
  const { tweetId } = event.arguments;
  const { username } = event.identity;

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

  const queryResponse = await DynamoDB.query({
    TableName: process.env.TWEETS_TABLE,
    IndexName: 'retweetsByCreator',
    KeyConditionExpression: 'creator = :creator AND retweetOf = :tweetId',
    ExpressionAttributeValues: {
      ':creator': userId,
      ':tweetId': tweetId,
    },
    Limit: 1,
  }).promise();

  const retweet = _.get(queryResponse, 'Items.0');

  if (!retweet) {
    throw new Error('Retweet is not found');
  }

  // Save a new tweet in the TWEETS_TABLE
  // Save a new entry in the RETWEETS_TABLE
  // Increment the retweets count of the original tweet by one
  // Increment the tweets count of the user by one
  const transactItems = [{
    Delete: {
      TableName: TWEETS_TABLE,
      Key: {
        id: retweet.id,
      },
      ConditionExpression: 'attribute_exists(id)',
    },
  }, {
    Delete: {
      TableName: RETWEETS_TABLE,
      Key: {
        userId: username,
        tweetId
      },
      ConditionExpression: 'attribute_exists(tweetId)'
    },
  }, {
    Update: {
      TableName: TWEETS_TABLE,
      Key: {
        id: tweetId,
      },
      UpdateExpression: 'ADD retweets :minusOne',
      ExpressionAttributeValues: {
        ':minusOne': -1,
      },
      ConditionExpression: 'attribute_exists(id)',
    },
  }, {
    Update: {
      TableName: USERS_TABLE,
      Key: {
        id: username,
      },
      UpdateExpression: 'ADD tweetsCount :minusOne',
      ExpressionAttributeValues: {
        ':minusOne': -1,
      },
      ConditionExpression: 'attribute_exists(id)',
    },
  }];

  if (tweet.creator !== username) {
    transactItems.push({
      Delete: {
        TableName: TIMELINES_TABLE,
        Key: {
          userId: username,
          tweetId: retweet.id,
        },
      },
    });
  }

  await DocumentClient.transactWrite({
    TransactItems: transactItems 
  }).promise();

  return true;
};