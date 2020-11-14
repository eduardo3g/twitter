const given = require('../../steps/given');
const when = require('../../steps/when');
const then = require('../../steps/then');
const chance = require('chance').Chance();

describe('When confirmUserSignUp runs', () => {
  it('The user profile shuold be saved in DynamoDB', async () => {
    const { name, email } = given.a_random_user();

    const username = chance.guid();

    await when.we_invoke_confirmUserSignup(username, name, email);

    const ddbUser = await TouchEvent.user_exists_in_UsersTable(username);

    expect(ddbUser).toEqual({

    });
  });
});