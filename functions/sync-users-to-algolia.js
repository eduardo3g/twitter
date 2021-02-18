const { initUsersIndex } = require('../lib/algolia');

const { STAGE, ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY } = process.env;

module.exports.handler = async (event) => {
  const index = await initUsersIndex(ALGOLIA_APP_ID, ALGOLIA_WRITE_KEY, STAGE);

  for (let record of event.Records) {
    if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
      const profile = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);

      // Algolia uses a unique key named 'objectID' to find objects whithin an index
      profile.objectID = profile.id;

      await index.saveObjects([profile]);
    } else if (record.eventName === 'REMOVE') {
      const profile = DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);

      await index.deleteObjects([profile.id]);
    }
  }
};