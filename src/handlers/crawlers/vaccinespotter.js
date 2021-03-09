
const HtmlParser = require('node-html-parser')
const Axios = require('axios')

const Zips = require('../../data/zips.json')
const Parallelizer = require('../../parallelizer')
const SlotConsistentHash = require('../../slotConsistentHash')
const { BatchPutSlotsToTable } = require('../../putToTable')

const API_ORIGIN = 'https://www.vaccinespotter.org'
const DATASET_URI_REGEX = /^(https:\/\/www\.vaccinespotter\.org)?\/api\/v0\/states\/([A-Z]{2})\.json$/
const DOM_SELECTOR_FOR_ANCHORS = 'li code a'
const APPOINTMENT_ACCESS_PARALLELISM = 10

const nowUtime = () => Math.round(Date.now() / 1000) // ?
const isInFuture = stringUtimeMillisOrDate => Date.now() < new Date(stringUtimeMillisOrDate).getTime()
const latLon = ({ latitude, longitude, postal_code }) => (latitude && longitude ? { lat: latitude, lon: longitude } : Zips[postal_code] ? Zips[postal_code] : { lat: 0, lon: 0 })
const fullAddress = ({ address, city, state, postal_code }) => `${address}, ${city}, ${state} ${postal_code}`
const apppointmentIsInFuture = stringOrObj => isInFuture(toTimeOnly(stringOrObj))
const toTimeOnly = stringOrObj => 'string' == typeof stringOrObj ? stringOrObj : stringOrObj.time

const queryDomForDatasets = document => [].map.call(document.querySelectorAll(DOM_SELECTOR_FOR_ANCHORS), anchor => anchor.getAttribute('href')).filter(href => href.match(DATASET_URI_REGEX))

const vaccinespotter = async () => {
  const htmlString = (await Axios.get(`${API_ORIGIN}/api`)).data
  const documentHtml = HtmlParser.parse(htmlString)
  const datasetUris = queryDomForDatasets(documentHtml)
  const getVaccineAppointmentsThrottled = Parallelizer(async relative => (await Axios.get(`${API_ORIGIN}${relative}`)).data.features, APPOINTMENT_ACCESS_PARALLELISM)
  const allAppts = await getVaccineAppointmentsThrottled(datasetUris)
  const withOnlyFuture = allAppts
    .map(({ properties, properties: { appointments }, ...rest }) => ({ ...rest, properties, appointments: (appointments || []).filter(apppointmentIsInFuture).map(toTimeOnly) }))
    .filter(({ appointments=[] }) => appointments.length)
  const insertables = withOnlyFuture.map(({
    properties: {
      address,
      appointments_available,
      appointments_last_fetched,
      provider: brand,
      carries_vaccine,
      city,
      id,
      name,
      postal_code,
      state,
      time_zone,
      url
    },
    geometry: {
      coordinates: [longitude, latitude]
    },
    appointments
  }) => ({
    id: SlotConsistentHash({
      utime: new Date(appointments_last_fetched).getTime(),
      provider: brand,
      from: 'internal',
      geolocation: {
        lat: latitude,
        lon: longitude
      },
      address: fullAddress({ address, city, state, postal_code }),
      location: name,
      url,
      slots: appointments.length
    }),
    utime: new Date(appointments_last_fetched).getTime(),
    provider: brand,
    from: 'internal',
    latitude,
    longitude,
    address: fullAddress({ address, city, state, postal_code }),
    location: name,
    url,
    slots: appointments.length
  }))

  console.log('For insert:')
  console.log('%j', insertables)
  const results = await BatchPutSlotsToTable(insertables)

  console.log('Batching results: ')
  console.log('%j', results)

  return 'ok'

}

module.exports = vaccinespotter

if (!module.parent) {
  vaccinespotter()
}
