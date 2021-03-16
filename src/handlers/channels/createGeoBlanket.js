

const { PutToPreferencesTable } = require('../../putToTable')
const Zips = require('../../data/zips.json')
const MAX_RADIUS = require('../../schemas/preference.dynamodb.jsonschema.json').properties.queries.items.properties.radius.maximum

const Response = require('../../response')

const LANGS = ['en', 'es']
const BLANKET_RADIUS = 20

const createGeoBlanket = async event => {
  console.log('%j', event)
  const { pathParameters: { channelId:userId, lang }, body } = event
  let json = null

  try {
    json = JSON.parse(body)
  } catch (jsonParseError) {
    console.log('Body was not json: ', body)
    return Response(400, { valid: false, errors: [{ property: '#', message: `root was not parseable as json` } ] })
  }

  if (!~LANGS.indexOf(lang)) {
    console.log('Bad lang')
    return Response(400, { valid: false, errors: [{ property: '#', message: `lang was not one of: ${LANGS}` } ] })
  }

  if (!Array.isArray(json) || !json.length || !json.every(piece => Zips[piece])) {
    console.log('Invalid zips %j', json)
    return Response(400, { valid: false, errors: [{ property: '#[n]', message: `root[n] was not parseable as valid zip` } ] })
  }

  const now = Math.floor(Date.now() / 1000)
  const insertable = {
    lang,
    createdAt: now,
    queries: json.map(zip => ({
      latitude: Zips[zip].lat,
      longitude: Zips[zip].lon,
      radius: BLANKET_RADIUS,
      requestedAt: now,
      zipcode: zip.toString()
    })),
    userId
  }

  const [putError] = await PutToPreferencesTable(insertable)
  if (putError) {
    console.error('Put Error:', putError)
    return Response(500, { message: 'Internal Error', putError })
  }
  return Response(201, insertable)
}

module.exports = createGeoBlanket
