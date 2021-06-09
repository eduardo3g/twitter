const chance = require('chance').Chance();
const retry = require('async-retry');
const given = require('../../steps/given');
const when = require('../../steps/when');
const { HashTagModes, TweetTypes } = require('../../../lib/constants');

describe('Given an authenticated user', () => {
  let userA, userAsProfile;
  const hashTag = `#${chance.string({ length: 16, alpha: true })}`;
  beforeAll(async () => {
    userA = await given.an_authenticated_user();
    userAsProfile = await when.a_user_calls_getMyProfile(userA);
    await when.a_user_calls_editMyProfile(userA, {
      name: userAsProfile.name,
      imageUrl: userAsProfile.imageUrl,
      backgroundImageUrl: userAsProfile.backgroundImageUrl,
      bio: `My bio has a hashtag: ${hashTag}`,
      location: userAsProfile.location,
      website: userAsProfile.website,
      birthdate: userAsProfile.birthdate,
    })
  });

  it('Should find himself when he gets the hash tag with PEOPLE', async () => {
    await retry(async () => {
      const { results, nextToken } = await when.a_users_calls_getHashTag(
        userA,
        HashTagModes.PEOPLE,
        hashTag,
        10
      );

      expect(nextToken).toBeNull();
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        __typename: 'MyProfile',
        id: userAsProfile.id,
        name: userAsProfile.name,
        screenName: userAsProfile.screenName,
      });
    }, {
      retries: 10,
      maxTimeout: 1000,
    });
  }, 30000);

  describe('When the user sends a tweet', () => {
    let tweet;
    const text = chance.string({ length: 16 }) + ' ' + hashTag;
    beforeAll(async () => {
      tweet = await when.a_user_calls_tweet(userA, text);
    });

    it('Should find his tweet when he gets the hash tag with LATEST', async () => {
      await retry(async () => {
        const { results, nextToken } = await when.a_users_calls_getHashTag(
          userA,
          HashTagModes.LATEST,
          hashTag,
          10
        );
  
        expect(nextToken).toBeNull();
        expect(results).toHaveLength(1);
        expect(results[0]).toMatchObject({
          __typename: TweetTypes.TWEET,
          id: tweet.id,
          text,
        });
      }, {
        retries: 10,
        maxTimeout: 1000,
      });
    }, 30000);

    describe('When the user replies to the tweet', () => {
      let reply;
      const replyText = chance.string({ length: 16 }) + ' ' + hashTag;
      beforeAll(async () => {
        reply = await when.a_user_calls_reply(userA, tweet.id, replyText);
      });
      
      it('Should find his reply when he gets the hash tag with LATEST', async () => {
        await retry(async () => {
          const { results, nextToken } = await when.a_users_calls_getHashTag(
            userA,
            HashTagModes.LATEST,
            hashTag,
            10
          );
    
          expect(nextToken).toBeNull();
          expect(results).toHaveLength(2);
          expect(results[0]).toMatchObject({
            __typename: TweetTypes.REPLY,
            id: reply.id,
            text: replyText,
          });
          expect(results[1]).toMatchObject({
            __typename: TweetTypes.TWEET,
            id: tweet.id,
            text,
          });
        }, {
          retries: 10,
          maxTimeout: 2000,
        });
      }, 30000);
    });
  });
});