const chance = require('chance').Chance();
const AWS = require('aws-sdk');
const l = require('../lib/log');
const _ = require('lodash');
const http = require('axios');

if (!AWS.config.region) {
    AWS.config.update({
        region: 'us-east-1'
    });
}

const init_common_env = () => {
    process.env['AWS_REGION'] = 'us-east-1';
    process.env['FIELD_LOG_LEVEL'] = 'ERROR';
    process.env['APPSYNC_API_ID'] = 'qwptwetsmjbbhhetwywaopy3om';
    process.env['GRAPHQL_API_URL'] = 'https://cdgpi6dwgnfjbkvm2dftzm2vre.appsync-api.us-east-1.amazonaws.com/graphql';
    process.env['API_URL'] = process.env.GRAPHQL_API_URL;
    process.env['COGNITO_USER_POOL_ID'] = 'us-east-1_FLEjUkAVd';
    process.env['WEB_COGNITO_USER_POOL_CLIENT_ID'] = '271nhoi8urg0nu280012rvmuug';
    process.env['USERS_TABLE'] = 'twitter-dev-UsersTable-2QQ76ZFVEJ04';
    process.env['TWEETS_TABLE'] = 'twitter-dev-TweetsTable-1KN7I690E0QV8';
    process.env['TIMELINES_TABLE'] = 'twitter-dev-TimelinesTable-AX9IVG4IDOPG';
};

init_common_env();


const fragments = {};
const registerFragment = (name, fragment) => fragments[name] = fragment;

const myProfileFragment = `
fragment myProfileFields on MyProfile {
  id
  name
  screenName
  imageUrl
  backgroundImageUrl
  bio
  location
  website
  birthdate
  createdAt
  followersCount
  followingCount
  tweetsCount
  likesCount
}
`;

const otherProfileFragment = `
fragment otherProfileFields on OtherProfile {
  id
  name
  screenName
  imageUrl
  backgroundImageUrl
  bio
  location
  website
  birthdate
  createdAt
  followersCount
  followingCount
  tweetsCount
  likesCount
  following
  followedBy
}
`;

const iProfileFragment = `
fragment iProfileFields on IProfile {
  ... on MyProfile {
    ... myProfileFields
  }

  ... on OtherProfile {
    ... otherProfileFields
  }
}
`;

const tweetFragment = `
fragment tweetFields on Tweet {
  id
  profile {
    ... iProfileFields
  }
  createdAt
  text
  replies
  likes
  retweets
  retweeted
  liked
}
`;

registerFragment('myProfileFields', myProfileFragment);
registerFragment('otherProfileFields', otherProfileFragment);
registerFragment('iProfileFields', iProfileFragment);
registerFragment('tweetFields', tweetFragment);

const throwOnErrors = ({query, variables, errors}) => {
    if (errors) {
        const errorMessage = `
query: ${query.substr(0, 100)}
  
variales: ${JSON.stringify(variables, null, 2)}
  
error: ${JSON.stringify(errors, null, 2)}
`;
        throw new Error(errorMessage);
    }
}

function* findUsedFragments (query, usedFragments = new Set()) {
    for (const name of Object.keys(fragments)) {
        if (query.includes(name) && !usedFragments.has(name)) {
            usedFragments.add(name);
            yield name;

            const fragment = fragments[name];
            const nestedFragments = findUsedFragments(fragment, usedFragments);

            for (const nestedName of Array.from(nestedFragments)) {
                yield nestedName;
            }
        }
    }
}

const GraphQL = async (url, query, variables = {}, auth) => {
    const headers = {};
    if (auth) {
        headers.Authorization = auth;
    }

    const usedFragments = Array
        .from(findUsedFragments(query))
        .map(name => fragments[name]);

    // l.i('usedFragments:', usedFragments);

    try {
        let opts = {
            method: 'post',
            url,
            headers,
            data: {
                query: [query, ...usedFragments].join('\n'),
                variables: JSON.stringify(variables),
            },
        };
        l.i('opts:', opts);
        const resp = await http(opts);

        const { data, errors } = resp.data;
        throwOnErrors({query, variables, errors});
        return data;
    } catch (error) {
        const errors = _.get(error, 'response.data.errors');
        throwOnErrors({query, variables, errors});
        throw error;
    }
}

const a_random_user = () => {
    const firstName = chance.first({nationality: 'en'});
    const lastName = chance.first({nationality: 'en'});
    const suffix = chance.string({length: 4, pool: 'abcdefghijklmnopqrstuvwxyz'});
    const name = `${firstName} ${lastName} ${suffix}`;
    const password = chance.string({length: 8});
    const email = `${firstName}-${lastName}-${suffix}@twitterappsync.com`;

    return {
        name,
        password,
        email
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
            {Name: 'name', Value: name}
        ]
    }).promise();

    const username = signUpResponse.UserSub;

    await cognito.adminConfirmSignUp({
        UserPoolId: userPoolId,
        Username: username
    }).promise();

    return {
        username,
        name,
        email
    };
};

const user_exists_in_UsersTable = async (id) => {
    const DynamoDB = new AWS.DynamoDB.DocumentClient();

    const response = await DynamoDB.get({
        TableName: process.env.USERS_TABLE,
        Key: {
            id
        }
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
            PASSWORD: password
        }
    }).promise();

    return {
        username,
        name,
        email,
        idToken: auth.AuthenticationResult.IdToken,
        accessToken: auth.AuthenticationResult.AccessToken
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
            text
        }
    };

    return await handler(event, context);
};

const tweet_exists_in_TweetsTable = async (id) => {
    const DynamoDB = new AWS.DynamoDB.DocumentClient();

    const response = await DynamoDB.get({
        TableName: process.env.TWEETS_TABLE,
        Key: {
            id
        }
    }).promise();

    return response.Item;
};

const a_user_calls_tweet = async (user, text) => {
    const tweet = `mutation tweet($text: String!) {
    tweet(text: $text) {
      ... tweetFields
    }
  }`;

    const variables = {
        text
    };

    const data = await GraphQL(process.env.API_URL, tweet, variables, user.accessToken);

    l.i('data:', data);

    const newTeet = data.tweet;

    return newTeet;
};


module.exports = {
    a_random_user,
    a_users_signsup,
    a_user_calls_tweet,
    user_exists_in_UsersTable,
    dev_authenticated_user,
    we_invoke_tweet,
    tweet_exists_in_TweetsTable
};
