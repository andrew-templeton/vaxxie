
const {
  PutToPreferencesTable,
  AppendQueryToPreferences
} = require('../../putToTable')
const Zips = require('../../data/zips.json')
const MAX_RADIUS = require('../../schemas/preference.dynamodb.jsonschema.json').properties.queries.items.properties.radius.maximum

const Response = require('./response')

const addSearch = async event => {
  console.log('%j', event)
  const { userId, currentIntent: { slots: { Zipcode, Distance } } } = event
  const slackUserId = userId.split(':').pop()
  const radius = parseFloat(Distance)
  if (!Zips[Zipcode]) {
    return Response(`Sorry, but ${Zipcode} doesn't seem to be a valid Zipcode!`)
  }
  const { lat:latitude, lon:longitude } = Zips[Zipcode]
  const now = Math.floor(Date.now() / 1000)
  if (radius > MAX_RADIUS) {
    return Response('Sorry, but I can only search up to 200 miles at a time. Could you try something a little smaller?')
  }
  const query = { requestedAt: now, latitude, longitude, radius, zipcode: Zipcode }
  const [putError] = await PutToPreferencesTable({
    userId: slackUserId,
    queries: [ query ],
    createdAt: now
  }, {
    ConditionExpression: 'attribute_not_exists(userId)'
  })
  if (!putError) {
    return Response(`Thanks, I set up your search! I\'ll send you appointments within ${radius}mi of ${Zipcode} when they come.`)
  }
  const [updateError] = await AppendQueryToPreferences({ query, userId: slackUserId })
  if (updateError) {
    console.error(updateError)
  }
  return Response(updateError
    ? 'Sorry, something went wrong when I tried to record your preferences! Contact a developer.'
    : `Thanks, I added this new search! I\'ll send you appointments within ${radius}mi of ${Zipcode} when they come.`
  )
}

module.exports = addSearch
