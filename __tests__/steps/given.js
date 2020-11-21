require('dotenv').config();
const AWS = require('aws-sdk');
const chance = require('chance').Chance();
const velocityUtil = require('amplify-appsync-simulator/lib/velocity/util');

const a_random_user = () => {
  const firstName = chance.first({ nationality: 'en' });
  const lastName = chance.first({ nationality: 'en' });
  const suffix = chance.string({ length: 4, pool: 'abcdefghijklmnopqrstuvwxyz' });
  const name = `${firstName} ${lastName} ${suffix}`;
  const password = chance.string({ length: 8 });
  const email = `${firstName}-${lastName}-${suffix}@twitterappsync.com`;

  return {
    name,
    password,
    email,
  };
};

const an_appsync_context = (identity, args) => {
  const util = velocityUtil.create([], new Date(), Object());
  const context = {
    identity,
    args,
    arguments: args,
  };

  return {
    context,
    ctx: context,
    util,
    utils: util,
  };
};

const an_authenticated_user = async (user) => {
  const { name, email, password } = a_random_user();

  const cognito = new AWS.CognitoIdentityServiceProvider();

  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.WEB_COGNITO_USER_POOL_CLIENT_ID;

  const signUpResponse = await cognito.signUp({
    ClientId: clientId,
    Username: email,
    Password: password,
    UserAttributes: [
      { Name: 'name', Value: name },
    ],
  }).promise();

  const username = signUpResponse.UserSub;

  await cognito.adminConfirmSignUp({
    UserPoolId: userPoolId,
    Username: username,
  }).promise();

  const auth = await cognito.initiateAuth({
    AuthFlow: 'USER_PASSWORD_AUTH',
    ClientId: clientId,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  }).promise();

  console.log(`[${email}] - signed in`);

  return {
    username,
    name,
    email,
    idToken: auth.AuthenticationResult.IdToken,
    accessToken: auth.AuthenticationResult.AccessToken,
  };
};

module.exports = {
  a_random_user,
  an_appsync_context,
  an_authenticated_user,
};