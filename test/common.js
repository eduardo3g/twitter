const chance = require('chance').Chance();
const AWS = require('aws-sdk');
const l = require('../lib/log');
const _ = require('lodash');
const http = require('axios');
const fs = require('fs');

if (!AWS.config.region) {
    AWS.config.update({
        region: 'us-east-1'
    });
}

const init_common_env = () => {
    process.env['COGNITO_USER_POOL_ID'] = "us-east-1_FLEjUkAVd";
    process.env['WEB_COGNITO_USER_POOL_CLIENT_ID'] = "271nhoi8urg0nu280012rvmuug";
    process.env['USERS_TABLE'] = "twitter-dev-UsersTable-2QQ76ZFVEJ04";
    process.env['TWEETS_TABLE'] = "twitter-dev-TweetsTable-1KN7I690E0QV8";
    process.env['TIMELINES_TABLE'] = "twitter-dev-TimelinesTable-AX9IVG4IDOPG";
}

init_common_env();

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

const user_exists_in_UsersTable = async (id) => {
    const DynamoDB = new AWS.DynamoDB.DocumentClient();

    const response = await DynamoDB.get({
        TableName: process.env.USERS_TABLE,
        Key: {
            id,
        },
    }).promise();

    l.i(response);

    return response.Item;
};

const dev_authenticated_user = async () => {
    const password = '12345678';
    const name = 'test';
    const email = 'test@facedao.pro';
    const cognito = new AWS.CognitoIdentityServiceProvider();

    const username = 'fa9fb464-c60d-4eef-90e8-b81685d600fb';
    const userPoolId = process.env.COGNITO_USER_POOL_ID;
    const clientId = process.env.WEB_COGNITO_USER_POOL_CLIENT_ID;

    const auth = await cognito.initiateAuth({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
        }
    }).promise();

    return {
        username,
        name,
        email,
        idToken: auth.AuthenticationResult.IdToken,
        accessToken: auth.AuthenticationResult.AccessToken,
    };
};

const we_invoke_tweet = async (username, text) => {
    const handler = require('../functions/tweet').handler;

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

const tweet_exists_in_TweetsTable = async (id) => {
    const DynamoDB = new AWS.DynamoDB.DocumentClient();

    const response = await DynamoDB.get({
        TableName: process.env.TWEETS_TABLE,
        Key: {
            id,
        },
    }).promise();

    return response.Item;
};

module.exports = {
    a_random_user,
    a_users_signsup,
    user_exists_in_UsersTable,
    dev_authenticated_user,
    we_invoke_tweet,
    tweet_exists_in_TweetsTable,
};
