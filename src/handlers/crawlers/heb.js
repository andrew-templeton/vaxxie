
const HebCheater = require('heb-cheater')

const SlotConsistentHash = require('../../slotConsistentHash')
const { BatchPutSlotsToTable } = require('../../putToTable')


const heb = async event => {
  const slots = await HebCheater({ distance: 10000, minimum: 1 })
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


module.exports = heb
