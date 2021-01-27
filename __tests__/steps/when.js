require('dotenv').config();
const AWS = require('aws-sdk');
const fs = require('fs');
const velocityMapper = require('amplify-appsync-simulator/lib/velocity/value-mapper/mapper');
const velocityTemplate = require('amplify-velocity-template');
const { GraphQL, registerFragment } = require('../lib/graphql');

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

const retweetFragment = `
fragment retweetFields on Retweet {
  id
  profile {
    ... iProfileFields
  }
  createdAt
  retweetOf {
    ... on Tweet {
      ... tweetFields
    }

    ... on Reply {
      ... replyFields
    }
  }
}
`;

const replyFragment = `
fragment replyFields on Reply {
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
  inReplyToTweet {
    id
    profile {
      ... iProfileFields
    }
    createdAt
    ... on Tweet {
      replies
    }
    ... on Reply {
      replies
    }
  }
  inReplyToUsers {
    ... iProfileFields
  }
}
`;

const iTweetFragment = `
fragment iTweetFields on ITweet {
  ... on Tweet {
    ... tweetFields
  }

  ... on Retweet {
    ... retweetFields
  }

  ... on Reply {
    ... replyFields
  }
}
`;

registerFragment('myProfileFields', myProfileFragment);
registerFragment('otherProfileFields', otherProfileFragment);
registerFragment('iProfileFields', iProfileFragment);
registerFragment('tweetFields', tweetFragment);
registerFragment('retweetFields', retweetFragment);
registerFragment('replyFields', replyFragment);
registerFragment('iTweetFields', iTweetFragment);

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

const we_invoke_retweet = async (username, tweetId) => {
  const handler = require('../../functions/retweet').handler;

  const context = {};

  const event = {
    identity: {
      username
    },
    arguments: {
      tweetId,
    },
  };

  return await handler(event, context);
};

const we_invoke_unretweet = async (username, tweetId) => {
  const handler = require('../../functions/unretweet').handler;

  const context = {};

  const event = {
    identity: {
      username
    },
    arguments: {
      tweetId,
    },
  };

  return await handler(event, context);
};

const we_invoke_reply = async (username, tweetId, text) => {
  const handler = require('../../functions/reply').handler;

  const context = {};

  const event = {
    identity: {
      username
    },
    arguments: {
      tweetId,
      text,
    },
  };

  return await handler(event, context);
};

const we_invoke_distributeTweets = async (event) => {
  const handler = require('../../functions/distribute-tweets').handler;
  const context = {};

  return await handler(event, context);
};

const we_invoke_distributeTweetsToFollower = async (event) => {
  const handler = require('../../functions/distribute-tweets-to-follower').handler;
  const context = {};

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
      ...myProfileFields

      tweets {
        nextToken
        tweets {
          ... iTweetFields
        }
      }
    }
  }`;

  const data = await GraphQL(process.env.API_URL, getMyProfile, {}, user.accessToken);

  const profile = data.getMyProfile;

  return profile;
};

const a_user_calls_getProfile = async (user, screenName) => {
  const getProfile = `query getProfile($screenName: String!) {
    getProfile(screenName: $screenName) {
      ...otherProfileFields

      tweets {
        nextToken
        tweets {
          ... iTweetFields
        }
      }
    }
  }`;

  const variables = {
    screenName,
  }

  const data = await GraphQL(process.env.API_URL, getProfile, variables, user.accessToken);

  const profile = data.getProfile;

  return profile;
};

const a_users_calls_getFollowers = async (user, userId, limit, nextToken) => {
  const getFollowers = `query getFollowers($userId: ID!, $limit: Int!, $nextToken: String) {
    getFollowers(userId: $userId, limit: $limit, nextToken: $nextToken) {
      profiles {
        ... iProfileFields
      }
    }
  }`;

  const variables = {
    userId,
    limit,
    nextToken,
  }

  const data = await GraphQL(process.env.API_URL, getFollowers, variables, user.accessToken);

  const profile = data.getFollowers;

  return profile;
};

const a_user_calls_editMyProfile = async (user, input) => {
  const editMyProfile = `mutation editMyProfile($input: ProfileInput!) {
    editMyProfile(newProfile: $input) {
      ...myProfileFields

      tweets {
        nextToken
        tweets {
          ... iTweetFields
        }
      }
    }
  }`;

  const variables = {
    input,
  };

  const data = await GraphQL(process.env.API_URL, editMyProfile, variables, user.accessToken);
  const profile = data.editMyProfile;

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

  return url;
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
  const newTeet = data.tweet;

  return newTeet;
};

const a_user_calls_getTweets = async (user, userId, limit, nextToken) => {
  const getTweets = `query getTweets($userId: ID!, $limit: Int!, $nextToken: String) {
    getTweets(userId: $userId, limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        ... iTweetFields
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

  return tweets;
};

const a_user_calls_getMyTimeline = async (user, limit, nextToken) => {
  const getMyTimeline = `query getMyTimeline($limit: Int!, $nextToken: String) {
    getMyTimeline(limit: $limit, nextToken: $nextToken) {
      nextToken
      tweets {
        ... iTweetFields
      }
    }
  }`;

  const variables = {
    limit,
    nextToken,
  };

  const data = await GraphQL(process.env.API_URL, getMyTimeline, variables, user.accessToken);
  const result = data.getMyTimeline;

  return result;
};

const a_user_calls_like = async (user, tweetId) => {
  const like = `mutation like($tweetId: ID!) {
    like(tweetId: $tweetId)
  }`;

  const variables = {
    tweetId,
  };

  const data = await GraphQL(process.env.API_URL, like, variables, user.accessToken);
  const result = data.like;

  return result;
};

const a_user_calls_unlike = async (user, tweetId) => {
  const like = `mutation unlike($tweetId: ID!) {
    unlike(tweetId: $tweetId)
  }`;

  const variables = {
    tweetId,
  };

  const data = await GraphQL(process.env.API_URL, like, variables, user.accessToken);
  const result = data.like;

  return result;
};

const a_user_calls_getLikes = async (user, userId, limit, nextToken) => {
  const getLikes = `query getLikes($userId: ID!, $limit: Int!, $nextToken: String) {
    getLikes(userId: $userId, limit: $limit, nextToken: $nextToken) {
      nextToken,
      tweets {
        ... iTweetFields
      }
    }
  }`;

  const variables = {
    userId,
    limit,
    nextToken,
  };

  const data = await GraphQL(process.env.API_URL, getLikes, variables, user.accessToken);
  const result = data.getLikes;

  return result;
};

const a_user_calls_retweet = async (user, tweetId) => {
  const retweet = `mutation retweet($tweetId: ID!) {
    retweet(tweetId: $tweetId) {
      ... retweetFields
    }
  }`;

  const variables = {
    tweetId,
  };

  const data = await GraphQL(process.env.API_URL, retweet, variables, user.accessToken);
  const result = data.retweet;

  return result;
};

const a_user_calls_unretweet = async (user, tweetId) => {
  const unretweet = `mutation unretweet($tweetId: ID!) {
    unretweet(tweetId: $tweetId)
  }`;

  const variables = {
    tweetId,
  };

  const data = await GraphQL(process.env.API_URL, unretweet, variables, user.accessToken);
  const result = data.unretweet;

  return result;
};

const a_user_calls_reply = async (user, tweetId, text) => {
  const reply = `mutation reply($tweetId: ID!, $text: String!) {
    reply(tweetId: $tweetId, text: $text) {
      ... replyFields
    }
  }`;

  const variables = {
    tweetId,
    text,
  };

  const data = await GraphQL(process.env.API_URL, reply, variables, user.accessToken);
  const result = data.reply;

  return result;
};

const a_user_calls_follow = async (user, userId) => {
  const follow = `mutation follow($userId: ID!) {
    follow(userId: $userId)
  }`;

  const variables = {
    userId,
  };

  const data = await GraphQL(process.env.API_URL, follow, variables, user.accessToken);
  const result = data.follow;

  return result;
};

const a_user_calls_unfollow = async (user, userId) => {
  const unfollow = `mutation unfollow($userId: ID!) {
    unfollow(userId: $userId)
  }`;

  const variables = {
    userId,
  };

  const data = await GraphQL(process.env.API_URL, unfollow, variables, user.accessToken);
  const result = data.unfollow;

  return result;
};

module.exports = {
  we_invoke_confirmUserSignUp,
  we_invoke_getImageUploadUrl,
  we_invoke_tweet,
  we_invoke_retweet,
  we_invoke_unretweet,
  we_invoke_reply,
  we_invoke_distributeTweets,
  we_invoke_distributeTweetsToFollower,
  a_users_signsup,
  we_invoke_an_appsync_template,
  a_user_calls_getMyProfile,
  a_user_calls_editMyProfile,
  a_user_calls_getImageUploadUrl,
  a_user_calls_tweet,
  a_user_calls_getTweets,
  a_user_calls_getMyTimeline,
  a_user_calls_like,
  a_user_calls_unlike,
  a_user_calls_getLikes,
  a_user_calls_retweet,
  a_user_calls_unretweet,
  a_user_calls_reply,
  a_user_calls_follow,
  a_user_calls_unfollow,
  a_user_calls_getProfile,
  a_users_calls_getFollowers,
};