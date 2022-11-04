require('isomorphic-fetch');
const l = require('../../lib/log');
const gql = require('graphql-tag');

const {dev_authenticated_user, a_user_calls_tweet} = require('../common');
const {AWSAppSyncClient, AUTH_TYPE} = require('aws-appsync');

const {GRAPHQL_API_URL, AWS_REGION} = process.env;

async function main() {
    const user = await dev_authenticated_user();
    l.i('authed user:', user);

    // Method 1: http
    let tweet = await a_user_calls_tweet(user, 'My first tweet');
    l.i(tweet);

    // Method 2: AWSAppSyncClient
    const config = {
        url: GRAPHQL_API_URL,
        region: AWS_REGION,
        auth: {
            type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
            jwtToken: user.idToken
        },
        disableOffline: true
    };
    let appSyncClient = new AWSAppSyncClient(config);

    let mutation = gql`mutation tweet($text: String!){tweet(text: $text) {text}}`;
    l.i('mutation:', mutation);

    tweet = await appSyncClient.mutate({mutation, variables: {text: 'My first tweet 1'}});
    l.i(tweet);
}

main().finally();
