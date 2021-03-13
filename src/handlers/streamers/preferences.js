
const AWS = require('aws-sdk')

const { BulkToPreferencesIndex } = require('../../bulkToIndex')

const preferences = async ({ Records }) => {
  console.log('%j', Records)
  const items = Records.filter(({ eventName }) => eventName !== 'REMOVE').map(({ dynamodb: { NewImage } }) => AWS.DynamoDB.Converter.unmarshall(NewImage)).map(({
    userId,
    queries,
    createdAt,
    lang
  }) => ({
    id: userId,
    userId,
    lang,
    createdAt,
    queries: queries.map(({
      requestedAt,
      latitude:lat,
      longitude:lon,
      radius,
      zipcode
    }) => ({
      requestedAt,
      zipcode,
      geoSearch: {
        geo_distance: {
          distance: `${radius}mi`,
          geolocation: {
            lat,
            lon
          }
        }
      }
    }))
  }))
  if (!items.length) {
    return 'ok'
  }
  console.log('%j', items)
  await BulkToPreferencesIndex(items)
  return 'ok'
}

module.exports = preferences
