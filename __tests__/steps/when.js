require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const velocityMapper = require('amplify-appsync-simulator/lib/velocity/value-mapper/mapper');
const velocityTemplate = require('amplify-velocity-template');
const GraphQL = require('../lib/graphql');

const we_invoke_confirmUserSignUp = async (username, name, email) => {
  const handler = require('../../functions/confirm-user-signup').handler;

  const context = {};

  const event = {
    'version': '1',
    'region': process.env.AWS_REGION,
    'userPoolId': process.env.COGNITO_USER_POOL_ID,
    'userName': username,
    'triggerSource': 'PostConfirmation_ConfirmSignUp',
    'request': {
      'userAttributes': {
        'sub': username,
        'cognito:email_alias': email,
        'cognito:user_status': 'CONFIRMED',
        'email_verified': 'false',
        'name': name,
        'email': email,
      },
    },
    'response': {},
  };

  await handler(event, context);
};

const we_invoke_getImageUploadUrl = async (username, extension, contentType) => {
  const handler = require('../../functions/get-upload-url').handler;

  const context = {};

  const event = {
    identity: {
      username
    },
    arguments: {
      extension,
      contentType,
    },
  };

  return await handler(event, context);
};

const we_invoke_tweet = async (username, text) => {
  const handler = require('../../functions/tweet').handler;

  const context = {};

  const event = {
    identity: {
      username
    },
    arguments: {
      text,
    },
  };

  return await handler(event, context);
};

const a_users_signsup = async (password, name, email) => {
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

  return {
    username,
    name,
    email,
  };
};

const we_invoke_an_appsync_template = (templatePath, context) => {
  const template = fs.readFileSync(templatePath, { encoding: 'utf-8' });
  const ast = velocityTemplate.parse(template);
  const compiler = new velocityTemplate.Compile(ast, {
    valueMapper: velocityMapper.map,
    escape: false,
  });

  return JSON.parse(compiler.render(context));
};

const a_user_calls_getMyProfile = async (user) => {
  const getMyProfile = `query getMyProfile {
    getMyProfile {
      website
      tweetsCount
      screenName
      name
      location
      likesCount
      imageUrl
      id
      followingCount
      followersCount
      createdAt
      birthdate
      bio
      backgroundImageUrl
    }
  }`;

  const data = await GraphQL(process.env.API_URL, getMyProfile, {}, user.accessToken);

  const profile = data.getMyProfile;

  console.log(`${user.username} - fetched profile`);

  return profile;
};

const a_user_calls_editMyProfile = async (user, input) => {
  const editMyProfile = `mutation editMyProfile($input: ProfileInput!) {
    editMyProfile(newProfile: $input) {
      website
      tweetsCount
      screenName
      name
      location
      likesCount
      imageUrl
      id
      followingCount
      followersCount
      createdAt
      birthdate
      bio
      backgroundImageUrl
    }
  }`;

  const variables = {
    input,
  };

  const data = await GraphQL(process.env.API_URL, editMyProfile, variables, user.accessToken);
  const profile = data.editMyProfile;

  console.log(`${user.username} - edited profile`);

  return profile;
};

const a_user_calls_getImageUploadUrl = async (user, extension, contentType) => {
  const editMyProfile = `query getImageUploadUrl($extension: String, $contentType: String) {
    getImageUploadUrl(extension: $extension, contentType: $contentType)
  }`;

  const variables = {
    extension,
    contentType,
  };

  const data = await GraphQL(process.env.API_URL, editMyProfile, variables, user.accessToken);
  const url = data.getImageUploadUrl;

  console.log(`${user.username} - got image upload url`);

  return url;
};

const a_user_calls_tweet = async (user, text) => {
  const tweet = `mutation tweet($text: String!) {
    tweet(text: $text) {
      id
      profile {
        id
        name
        screenName
      }
      createdAt
      text
      replies
      likes
      retweets
      liked
    }
  }`;

  const variables = {
    text
  };

  const data = await GraphQL(process.env.API_URL, tweet, variables, user.accessToken);
  const newTeet = data.tweet;

  console.log(`${user.username} - posted a new tweet`);

  return newTeet;
};

const a_user_calls_getTweets = async (user, userId, limit, nextToken) => {
  const getTweets = `query getTweets($userId: ID!, $limit: Int!, $nextToken: String) {
    getTweets(userId: $userId, limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        id
        createdAt
        profile {
          id
          name
          screenName
        }

        ... on Tweet {
          text
          replies
          likes
          retweets
          liked
        }
      }
    }
  }`;

  const variables = {
    userId,
    limit,
    nextToken,
  };

  const data = await GraphQL(process.env.API_URL, getTweets, variables, user.accessToken);
  const tweets = data.getTweets;

  console.log(`${user.username} - tweets list`);

  return tweets;
};

const a_user_calls_getMyTimeline = async (user, limit, nextToken) => {
  const getMyTimeline = `query getMyTimeline($limit: Int!, $nextToken: String) {
    getMyTimeline(limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        id
        createdAt
        profile {
          id
          name
          screenName
        }

        ... on Tweet {
          text
          replies
          likes
          retweets
          liked
        }
      }
    }
  }`;

  const variables = {
    limit,
    nextToken,
  };

  const data = await GraphQL(process.env.API_URL, getMyTimeline, variables, user.accessToken);
  const result = data.getMyTimeline;

  console.log(`${user.username} - fetched timeline`);

  return result;
};

module.exports = {
  we_invoke_confirmUserSignUp,
  we_invoke_getImageUploadUrl,
  we_invoke_tweet,
  a_users_signsup,
  we_invoke_an_appsync_template,
  a_user_calls_getMyProfile,
  a_user_calls_editMyProfile,
  a_user_calls_getImageUploadUrl,
  a_user_calls_tweet,
  a_user_calls_getTweets,
  a_user_calls_getMyTimeline,
};