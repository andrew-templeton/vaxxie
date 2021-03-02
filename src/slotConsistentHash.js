const Crypto = require('crypto')

const SlotConsistentHash = ({
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
}) => Crypto.createHash('sha512').update([
  utime,
  provider,
  from,
  latitude,
  longitude,
  address,
  location,
  url,
  slots
].join('||')).digest('hex')

module.exports = SlotConsistentHash
