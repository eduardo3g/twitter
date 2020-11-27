const given = require('../../steps/given');
const when = require('../../steps/when');
const then = require('../../steps/then');
const chance = require('chance').Chance();

describe('Given an authentication user', () => {
  let user;

  beforeAll(async () => {
    user = await given.an_authenticated_user();
  });
  
  describe('When he sends a tweet', () => {
    let tweet;
    const text = chance.string({ length: 16 });

    beforeAll(async () => {
      tweet = await when.a_user_calls_tweet(user, text);
    });

    it('Should return the new tweet', () => {
      expect(tweet).toMatchObject({
        text,
        replies: 0, 
        likes: 0, 
        retweets: 0, 
      });
    });

    describe('When he calls get tweets', () => {
      let tweets, nextToken;
      beforeAll(async () => {
        const result = await when.a_user_calls_getTweets(
          user,
          user.username,
          25
        );

        tweets = result.tweets;
        nextToken = result.nextToken;
      });

      it('He will see the new tweet in the tweets array', () => {  
        expect(nextToken).toBeNull();
        expect(tweets.length).toEqual(1);
        expect(tweets[0]).toMatchObject(tweet);
      });
  
      it('He cannot request more than 25 tweets in a page', async () => {
        await expect(when.a_user_calls_getTweets(
          user,
          user.username,
          26
        ))
          .rejects
          .toMatchObject({
            message: expect.stringContaining('max limit is 25'),
          });
      });
    });
  });
});