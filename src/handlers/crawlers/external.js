
const SlotConsistentHash = require('../../slotConsistentHash')
const { BatchPutSlotsToTable } = require('../../putToTable')
const Maybe = require('../../maybe')

const Zips = require('../../data/zips.json')
const Validate = require('jsonschema').validate
const PutSlotApiSchema = require('../../schemas/putslot.api.jsonschema.json')

const Response = require('../../response')

const external = async ({ pathParameters: { provider, utime }, body }) => {
  const [parseError, json] = await ((Maybe(JSON.parse))(body))
  console.log('%j', { json, provider, utime })
  if (!parseInt(utime) || parseInt(utime).toString() !== utime) {
    return Response(400, { valid: false, errors: [ { property: 'utime', message: `utime ${utime} was not parseable as integer` } ] })
  }

  const { valid, errors } = Validate(json, PutSlotApiSchema)
  if (!valid) {
    return Response(400, { valid, errors })
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

  return Response(200, { results })
}

module.exports = external
