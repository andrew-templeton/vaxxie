
const HtmlParser = require('node-html-parser')
const Axios = require('axios')

const Zips = require('../../data/zips.json')
const Parallelizer = require('../../parallelizer')
const SlotConsistentHash = require('../../slotConsistentHash')
const { BatchPutSlotsToTable } = require('../../putToTable')

const API_ORIGIN = 'https://www.vaccinespotter.org'
const DATASET_URI_REGEX = /^(https:\/\/www\.vaccinespotter\.org)?\/api\/v0\/stores\/([A-Z]{2})\/([a-z_]+)\.json$/
const DOM_SELECTOR_FOR_ANCHORS = 'li code a'
const APPOINTMENT_ACCESS_PARALLELISM = 10

const nowUtime = () => Math.round(Date.now() / 1000) // ?
const isInFuture = stringUtimeMillisOrDate => Date.now() < new Date(stringUtimeMillisOrDate).getTime()
const latLon = ({ latitude, longitude, postal_code }) => (latitude && longitude ? { lat: latitude, lon: longitude } : Zips[postal_code] ? Zips[postal_code] : { lat: 0, lon: 0 })
const fullAddress = ({ address, city, state, postal_code }) => `${address}, ${city}, ${state} ${postal_code}`
const apppointmentIsInFuture = stringOrObj => isInFuture(toTimeOnly(stringOrObj))
const toTimeOnly = stringOrObj => 'string' == typeof stringOrObj ? stringOrObj : stringOrObj.time

const queryDomForDatasets = document => [].map.call(document.querySelectorAll(DOM_SELECTOR_FOR_ANCHORS), anchor => anchor.getAttribute('href')).filter(href => href.match(DATASET_URI_REGEX))


const urlForBrand = ({
  address,
  appointments_available,
  appointments_last_fetched,
  brand,
  brand_id,
  carries_vaccine,
  city,
  id,
  latitude,
  longitude,
  name,
  postal_code,
  state,
  time_zone,
  appointments
}) => `https://${brand}.com` // This is a pain

const vaccinespotter = async () => {
  const htmlString = (await Axios.get(`${API_ORIGIN}/api`)).data
  const documentHtml = HtmlParser.parse(htmlString)
  const datasetUris = queryDomForDatasets(documentHtml)
  const getVaccineAppointmentsThrottled = Parallelizer(async relative => (await Axios.get(`${API_ORIGIN}${relative}`)).data, APPOINTMENT_ACCESS_PARALLELISM)
  const appointments = await getVaccineAppointmentsThrottled(datasetUris)
  const withOnlyFuture = appointments
    .map(({ appointments, ...rest }) => ({ ...rest, appointments: (appointments || []).filter(apppointmentIsInFuture).map(toTimeOnly) }))
    .filter(({ appointments=[] }) => appointments.length)

  const insertables = withOnlyFuture.map(({
    address,
    appointments_available,
    appointments_last_fetched,
    brand,
    brand_id,
    carries_vaccine,
    city,
    id,
    latitude,
    longitude,
    name,
    postal_code,
    state,
    time_zone,
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
      url: urlForBrand({
        address,
        appointments_available,
        appointments_last_fetched,
        brand,
        brand_id,
        carries_vaccine,
        city,
        id,
        latitude,
        longitude,
        name,
        postal_code,
        state,
        time_zone,
        appointments
      }),
      slots: appointments.length
    }),
    utime: new Date(appointments_last_fetched).getTime(),
    provider: brand,
    from: 'internal',
    latitude,
    longitude,
    address: fullAddress({ address, city, state, postal_code }),
    location: name,
    url: urlForBrand({
      address,
      appointments_available,
      appointments_last_fetched,
      brand,
      brand_id,
      carries_vaccine,
      city,
      id,
      latitude,
      longitude,
      name,
      postal_code,
      state,
      time_zone,
      appointments
    }),
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