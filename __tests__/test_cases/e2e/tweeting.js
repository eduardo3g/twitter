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
  });
});