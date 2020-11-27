const given = require('../../steps/given');
const when = require('../../steps/when');
const chance = require('chance').Chance();
const path = require('path');

describe('TimelinePage.tweets.request template', () => {
  it('Should returne empty array if source.tweets is empty', () => {
    const templatePath = path.resolve(
      __dirname,
      '../../../mapping-templates/TimelinePage.tweets.request.vtl'
    );

    const username = chance.guid();
    const context = given.an_appsync_context({ username }, {}, {},{ tweets: [] });
    const result = when.we_invoke_an_appsync_template(templatePath, context)

    expect(result).toEqual([]);
  });
});