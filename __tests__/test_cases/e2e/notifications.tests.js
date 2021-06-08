global.WebSocket = require('ws');
require('isomorphic-fetch');
const gql = require('graphql-tag');
const { AWSAppSyncClient, AUTH_TYPE } = require('aws-appsync');
const chance = require('chance').Chance();
const retry = require('async-retry');

const given = require('../../steps/given');
const when = require('../../steps/when');

console.warn = jest.fn(); // silence warning console logs thrown by Apollo regarding the usage of unions in GraphQL
console.error = jest.fn(); // silence error console logs thrown by Apollo regarding the usage of unions in GraphQL

describe('Gven two authenticated users', () => {
  let userA, userB, userAsProfile, userAsTweet;
  const text = chance.string({ length: 16 });

  beforeAll(async () => {
    userA = await given.an_authenticated_user();
    userAsProfile = await when.a_user_calls_getMyProfile(userA);
    userB = await given.an_authenticated_user();
    userAsTweet = await when.a_user_calls_tweet(userA, text);
  });

  describe('Given user A subscribes to notifications', () => {
    let client, subscription;
    let notifications = [];

    beforeAll(async () => {
      client = new AWSAppSyncClient({
        url: process.env.API_URL,
        region: process.env.AWS_REGION,
        auth: {
          type: AUTH_TYPE.AMAZON_COGNITO_USER_POOLS,
          jwtToken: () => userA.idToken,
        },
        disableOffline: true,
      });

      subscription = client.subscribe({
        query: gql `
          subscription onNotified($userId: ID!) {
            onNotified(userId: $userId) {
              ... on iNotification {
                id
                type
                userId
                createdAt
              }
              ... on Retweeted {
                tweetId
                retweetedBy
                retweetId
              }
              ... on Liked {
                tweetId
                likedBy
              }
              ... on Replied {
                tweetId
                replyTweetId
                repliedBy
              }
              ... on Mentioned {
                mentionedBy
                mentionedByTweetId
              }
              ... on DMed {
                otherUserId
                message
              }
            }
          }
        `,
        variables: {
          userId: userA.username
        }
      }).subscribe({
        next: response => {
          notifications.push(response.data.onNotified)
        }
      });

      return new Promise(resolve => setTimeout(resolve, 10000));
    });

    afterAll(() => {
      subscription.unsubscribe();
    });

    describe("When user B retweets user A's tweet", () => {
      let userBsRetweet;

      beforeAll(async () => {
        userBsRetweet = await when.a_user_calls_retweet(userB, userAsTweet.id);
      });

      it('User A should receive a notification', async () => {
        await retry(async () => {
          expect(notifications).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                type: 'Retweeted',
                userId: userA.username,
                tweetId: userAsTweet.id,
                retweetId: userBsRetweet.id,
                retweetedBy: userB.username,
              }),
            ]),
          );
        }, {
          retries: 10,
          maxTimeout: 1000,
        });
      }, 15000);
    });

    describe("When user B likes user A's tweet", () => {
      beforeAll(async () => {
        await when.a_user_calls_like(userB, userAsTweet.id);
      });

      it('User A should receive a notification', async () => {
        await retry(async () => {
          expect(notifications).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                type: 'Liked',
                userId: userA.username,
                tweetId: userAsTweet.id,
                likedBy: userB.username,
              }),
            ]),
          );
        }, {
          retries: 10,
          maxTimeout: 1000,
        });
      }, 15000);
    });

    describe("When user B replies to user A's tweet", () => {
      let userBsReply;
      const replyText = chance.string({ length: 16 });

      beforeAll(async () => {
        userBsReply = await when.a_user_calls_reply(
          userB,
          userAsTweet.id,
          replyText
        );
      });

      it('User A should receive a notification', async () => {
        await retry(async () => {
          expect(notifications).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                type: 'Replied',
                userId: userA.username,
                tweetId: userAsTweet.id,
                repliedBy: userB.username,
                replyTweetId: userBsReply.id,
              }),
            ]),
          );
        }, {
          retries: 10,
          maxTimeout: 1000,
        });
      }, 15000);
    });

    describe("When user B mentions user A in a tweet", () => {
      let userBsTweet;

      beforeAll(async () => {
        const text = `Hey @${userAsProfile.screenName}`;
        userBsTweet = await when.a_user_calls_tweet(userB, text);
      });

      it('User A should receive a notification', async () => {
        await retry(async () => {
          expect(notifications).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                type: 'Mentioned',
                userId: userA.username,
                mentionedByTweetId: userBsTweet.id,
                mentionedBy: userB.username,
              }),
            ]),
          );
        }, {
          retries: 10,
          maxTimeout: 1000,
        });
      }, 15000);
    });

    describe('When user B DMs user A', () => {
      const message = chance.string({ length: 16 });

      beforeAll(async () => {
        await when.a_user_calls_sendDirectMessage(userB, userA.username, message);
      });

      it('User A should receive a notification', async () => {
        await retry(async () => {
          expect(notifications).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                userId: userA.username,
                type: "DMed",
                otherUserId: userB.username,
                message,
              })
            ])
          )
        }, {
          retries: 10,
          maxTimeout: 1000
        });
      }, 15000);
    });
  });
});