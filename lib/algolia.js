const algoliasearch = require('algoliasearch');

let usersIndex, tweetsIndex;

const initUsersIndex = async (appId, apiKey, stage) => {
  if (!usersIndex) {
    const client = algoliasearch(appId, apiKey);
    usersIndex = client.initIndex(`users_${stage}`);

    await usersIndex.setSettings({
      searchableAttributes: [
        "name", "screenName",
      ],
    });
  }

  return usersIndex;
};

const initTweetsIndex = async (appId, apiKey, stage) => {
  if (!tweetsIndex) {
    const client = algoliasearch(appId, apiKey);
    usersIndex = client.initIndex(`tweets_${stage}`);

    await tweetsIndex.setSettings({
      searchableAttributes: [
        "text",
      ],
      customRanking: [
        'desc(createdAt)', // return most recent tweets first
      ]
    });
  }

  return tweetsIndex;
};

module.exports = {
  initUsersIndex,
  initTweetsIndex,
};