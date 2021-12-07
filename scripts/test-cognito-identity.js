require('dotenv').config();
const AWS = require('aws-sdk');

const providerName = process.env.COGNITO_USER_POOL_PROVIDER_NAME;

AWS.config.credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: process.env.COGNITO_IDENTITY_POOL_ID,
  Logins: {
    [providerName]: '12131312',
  },
});

AWS.config.credentials.get(() => {
  const { accessKeyId, secretAccessKey, sessionToken } = AWS.config.credentials;
  process.env.AWS_ACCESS_KEY_ID = accessKeyId;
  process.env.AWS_SECRET_ACCESS_KEY = secretAccessKey;
  process.env.AWS_SESSION_TOKEN = sessionToken;

  const Firehose = new AWS.Firehose();
  Firehose.putRecord({
    DeliveryStreamName: process.env.FIREHOSE_STREAM_NAME,
    Record: {
      Data: JSON.stringify({
        eventType: 'impression',
        tweetId: '123',
      }),
    },
  }).promise()
  .then(() => console.log('all done'))
  .catch(e => console.error('failed', e));
});