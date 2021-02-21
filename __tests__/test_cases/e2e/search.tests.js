const retry = require('async-retry');
const given = require('../../steps/given');
const when = require('../../steps/when');
const { SearchModes } = require('../../../lib/constants');

describe('Given an authenticated user', () => {
  let userA, userAsProfile;
  beforeAll(async () => {
    userA = await given.an_authenticated_user();
    userAsProfile = await when.a_user_calls_getMyProfile(userA);
  });

  it('Should find himself when he searches for his twitter handle', async () => {
    await retry(async () => {
      const { results, nextToken } = await when.a_users_calls_search(
        userA,
        SearchModes.PEOPLE,
        userAsProfile.screenName,
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
      retries: 5,
      maxTimeout: 1000,
    });
  }, 10000);

  it('Should find himself when he searches for his name', async () => {
    await retry(async () => {
      const { results } = await when.a_users_calls_search(
        userA,
        SearchModes.PEOPLE,
        userAsProfile.name,
        10
      );

      expect(results).toEqual(expect.arrayContaining([
        expect.objectContaining({
          __typename: 'MyProfile',
        id: userAsProfile.id,
        name: userAsProfile.name,
        screenName: userAsProfile.screenName,
        }),
      ]));
    }, {
      retries: 5,
      maxTimeout: 1000,
    });
  }, 10000);
});