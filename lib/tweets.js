const DynamoDB = require('aws-sdk/clients/dynamodb');
const DocumentClient = new DynamoDB.DocumentClient();

const { TWEETS_TABLE } = process.env;

const getTweetById = async (tweetId) => {
  const response = await DocumentClient.get({
    TableName: TWEETS_TABLE,
    Key: {
      id: tweetId,
    }
  }).promise();

  return response.Item;
};

module.exports = {
  getTweetById,
};