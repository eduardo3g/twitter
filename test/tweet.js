const l = require('../lib/log');
const {tweet_exists_in_TweetsTable} = require('./common');
const {we_invoke_tweet} = require('./common');
const {dev_authenticated_user} = require('./common');
const chance = require('chance').Chance();

async function main() {
    const user = await dev_authenticated_user();
    l.i('authed user:', user);
    const text = chance.string({length: 16});
    let tweet = await we_invoke_tweet(user.username, text);
    l.i('init tweet:', tweet);
    tweet = await tweet_exists_in_TweetsTable(tweet.id);
    l.i('ddb tweet:', tweet);
}

main().finally();
