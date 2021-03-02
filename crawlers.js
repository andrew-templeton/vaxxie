


const HebCheater = require('heb-cheater')

const { BatchPutSlotsToTable } = require('./src/putToTable')
const Maybe = require('./src/maybe')

const Zips = require('./src/data/zips.json')
const Validate = require('jsonschema').validate
const PutSlotApiSchema = require('./src/schemas/putslot.api.jsonschema.json')

const SlotConsistentHash = require('./src/slotConsistentHash')

const response = (statusCode, body) => ({
  statusCode,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS,PUT',
    'Access-Control-Max-Age': '300',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(body)
})


const external = async ({ pathParameters: { provider, utime }, body }) => {
  const [parseError, json] = await ((Maybe(JSON.parse))(body))
  console.log('%j', { json, provider, utime })
  if (!parseInt(utime) || parseInt(utime).toString() !== utime) {
    return response(400, { valid: false, errors: [ { property: 'utime', message: `utime ${utime} was not parseable as integer` } ] })
  }

  const { valid, errors } = Validate(json, PutSlotApiSchema)
  if (!valid) {
    return response(400, { valid, errors })
  }
  // Run a validation first
  const insertables = json.map(({
    from,
    latitude,
    longitude,
    zipcode,
    address,
    location,
    url,
    slots
  }) => {
    const geo = latitude && longitude ? { lat: latitude, lon: longitude } : (Zips[zipcode] || null)
    const formatted = geo ? { latitude: geo.lat, longitude: geo.lon } : { latitude: 0, longitude: 0 }
    return {
      ...formatted,
      provider,
      utime: parseInt(utime),
      from,
      address,
      location,
      url,
      slots
    }
  }).map(({
    utime,
    provider,
    from,
    latitude,
    longitude,
    address,
    location,
    url,
    slots
  }) => ({
    id: SlotConsistentHash({
      utime,
      provider,
      from,
      geolocation: {
        lat: latitude,
        lon: longitude
      },
      address,
      location,
      url,
      slots
    }),
    utime,
    provider,
    from,
    latitude,
    longitude,
    address,
    location,
    url,
    slots
  }))
  console.log('For insert:')
  console.log('%j', insertables)
  const results = await BatchPutSlotsToTable(insertables)

  console.log('Batching results: ')
  console.log('%j', results)

  return response(200, { results })
}

const heb = async event => {
  const [error, slots] = await (Maybe(HebCheater)({ distance: 10000, minimum: 1 }))
  console.log('%j', slots)

  if (!slots || !slots.length) {
    return 'ok'
  }

  const insertables = slots.map(({
    latitude,
    longitude,
    url,
    openAppointmentSlots:slots,
    address,
    location
  }) => ({
    utime: Math.floor(Date.now() / 1000),
    provider: 'heb',
    from: 'internal',
    latitude,
    longitude,
    address,
    location,
    url,
    slots
  })).map(({
    utime,
    provider,
    from,
    latitude,
    longitude,
    address,
    location,
    url,
    slots
  }) => ({
    id: SlotConsistentHash({
      utime,
      provider,
      from,
      geolocation: {
        lat: latitude,
        lon: longitude
      },
      address,
      location,
      url,
      slots
    }),
    utime,
    provider,
    from,
    latitude,
    longitude,
    address,
    location,
    url,
    slots
  }))

  console.log('For insert:')
  console.log('%j', insertables)

  const results = await BatchPutSlotsToTable(insertables)

  console.log('Batching results: ')
  console.log('%j', results)

  return 'ok'
}

module.exports = {
  external,
  heb
}
