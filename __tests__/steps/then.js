require('dotenv').config();
const _ = require('lodash');
const AWS = require('aws-sdk');
const http = require('axios');
const fs = require('fs');

const user_exists_in_UsersTable = async (id) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.get({
    TableName: process.env.USERS_TABLE,
    Key: {
      id,
    },
  }).promise();

  expect(response.Item).toBeTruthy();

  return response.Item;
};

const tweetsCount_is_updated_in_UsersTable = async (id, newCount) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.get({
    TableName: process.env.USERS_TABLE,
    Key: {
      id,
    },
  }).promise();

  expect(response.Item).toBeTruthy();
  expect(response.Item.tweetsCount).toEqual(newCount);

  return response.Item;
};

const tweet_exists_in_TweetsTable = async (id) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.get({
    TableName: process.env.TWEETS_TABLE,
    Key: {
      id,
    },
  }).promise();

  expect(response.Item).toBeTruthy();

  return response.Item;
};

const retweet_exists_in_TweetsTable = async (userId, tweetId) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.query({
    TableName: process.env.TWEETS_TABLE,
    IndexName: 'retweetsByCreator',
    KeyConditionExpression: 'creator = :creator AND retweetOf = :tweetId',
    ExpressionAttributeValues: {
      ':creator': userId,
      ':tweetId': tweetId,
    },
    Limit: 1,
  }).promise();

  const retweet = _.get(response, 'Items.0');

  expect(retweet).toBeTruthy();

  return retweet;
};

const reply_exists_in_TweetsTable = async (userId, tweetId) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.query({
    TableName: process.env.TWEETS_TABLE,
    IndexName: 'repliesForTweet',
    KeyConditionExpression: 'inReplyToTweetId = :tweetId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':tweetId': tweetId,
    },
    FilterExpression: 'creator = :userId',
  }).promise();

  const reply = _.get(response, 'Items.0');

  expect(reply).toBeTruthy();

  return reply;
};

const retweet_does_not_exist_in_TweetsTable = async (userId, tweetId) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.query({
    TableName: process.env.TWEETS_TABLE,
    IndexName: 'retweetsByCreator',
    KeyConditionExpression: 'creator = :creator AND retweetOf = :tweetId',
    ExpressionAttributeValues: {
      ':creator': userId,
      ':tweetId': tweetId,
    },
    Limit: 1,
  }).promise();

  expect(response.Items).toHaveLength(0);

  return null;
};

const retweet_exists_in_RetweetsTable = async (userId, tweetId) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.get({
    TableName: process.env.RETWEETS_TABLE,
    Key: {
      userId,
      tweetId,
    },
  }).promise();

  expect(response.Item).toBeTruthy();

  return response.Item;
};

const retweet_does_not_exist_in_RetweetsTable = async (userId, tweetId) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.get({
    TableName: process.env.RETWEETS_TABLE,
    Key: {
      userId,
      tweetId,
    },
  }).promise();

  expect(response.Item).not.toBeTruthy();

  return response.Item;
};

const tweet_exists_in_TimelinesTable = async (userId, tweetId) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.get({
    TableName: process.env.TIMELINES_TABLE,
    Key: {
      userId,
      tweetId,
    },
  }).promise();

  expect(response.Item).toBeTruthy();

  return response.Item;
};

const tweet_does_not_exist_in_TimelinesTable = async (userId, tweetId) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.get({
    TableName: process.env.TIMELINES_TABLE,
    Key: {
      userId,
      tweetId,
    },
  }).promise();

  expect(response.Item).not.toBeTruthy();

  return response.Item;
};

const there_are_N_tweets_in_TimelinesTable = async (userId, n) => {
  const DynamoDB = new AWS.DynamoDB.DocumentClient();

  const response = await DynamoDB.query({
    TableName: process.env.TIMELINES_TABLE,
    KeyConditionExpression: 'userId = :userId',
    ExpressionAttributeValues: {
      ':userId': userId,
    },
    ScanIndexForward: false,
  }).promise();

  expect(response.Items).toHaveLength(n);

  return response.Items;
};

const user_can_upolad_image_to_url = async (url, filePath, contentType) => {
  const data = fs.readFileSync(filePath);

  await http({
    method: 'put',
    url,
    headers: {
      'Content-Type': contentType,
    },
    data,
  });
};

const user_can_download_image_from = async (url) => {
  const response = await http(url);

  return response.data;
};

module.exports = {
  user_exists_in_UsersTable,
  user_can_upolad_image_to_url,
  user_can_download_image_from,
  tweet_exists_in_TweetsTable,
  tweet_exists_in_TimelinesTable,
  tweet_does_not_exist_in_TimelinesTable,
  retweet_exists_in_TweetsTable,
  reply_exists_in_TweetsTable,
  retweet_exists_in_RetweetsTable,
  retweet_does_not_exist_in_TweetsTable,
  retweet_does_not_exist_in_RetweetsTable,
  there_are_N_tweets_in_TimelinesTable,
  tweetsCount_is_updated_in_UsersTable,
};