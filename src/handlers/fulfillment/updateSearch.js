
const { ReplaceQueryInPreferences } = require('../../putToTable')
const Zips = require('../../data/zips.json')
const MAX_RADIUS = require('../../schemas/preference.dynamodb.jsonschema.json').properties.queries.items.properties.radius.maximum

const Response = require('./response')

const updateSearch = async ({ userId:fullId, currentIntent: { slots: { Searchnumber, Distance, Zipcode } } }) => {
  const userId = fullId.split(':').pop()
  const radius = parseFloat(Distance)
  const oneIndexed = parseInt(Searchnumber)
  if (!oneIndexed || oneIndexed < 1 || oneIndexed.toString() !== Searchnumber) {
    return Response(`Sorry, but ${Searchnumber} seemed to not be a valid number 1 or above...`)
  }
  const index = oneIndexed - 1
  if (!Zips[Zipcode]) {
    return Response(`Sorry, but ${Zipcode} doesn't seem to be a valid Zipcode!`)
  }
  const { lat:latitude, lon:longitude } = Zips[Zipcode]
  const now = Math.floor(Date.now() / 1000)
  if (radius > MAX_RADIUS) {
    return Response('Sorry, but I can only search up to 200 miles at a time. Could you try something a little smaller?')
  }
  const query = { requestedAt: now, latitude, longitude, radius, zipcode: Zipcode }
  const [updateError] = await ReplaceQueryInPreferences({ userId, query, index })
  if (updateError) {
    console.log(updateError)
  }
  return Response(updateError
    ? `There was something wrong with your update. Did you pick a search number (${Searchnumber}) that didn't exist? Try listing again then retrying.`
    : `Great! Your search number ${Searchnumber} has been updated to look for appointments within ${radius}mi of ${Zipcode}.`)
}


module.exports = updateSearch
