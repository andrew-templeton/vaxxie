const RADIUS_OF_EARTH_IN_KM = 6371
const MILES_PER_KM = 0.621371
const DEGREES_IN_CIRCLE = 360
const RADIANS_PER_CIRCLE = Math.PI * 2
const RADIANS_PER_DEGREE = RADIANS_PER_CIRCLE / DEGREES_IN_CIRCLE


// distance along sphere surface of earth b/w gps coords
const spheric = (a, b) => {
  const dLat = (b.latitude - a.latitude) * RADIANS_PER_DEGREE
  const dLong = (b.longitude - a.longitude) * RADIANS_PER_DEGREE
  const z = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(a.latitude * RADIANS_PER_DEGREE) * Math.cos(b.latitude * RADIANS_PER_DEGREE) *
    Math.sin(dLong / 2) * Math.sin(dLong / 2)
  const c = 2 * Math.atan2(Math.sqrt(z), Math.sqrt(1 - z))
  const d = RADIUS_OF_EARTH_IN_KM * c
  return d * MILES_PER_KM
}

module.exports = spheric
