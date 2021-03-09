

const PreferenceIndexDefinition = require('./src/schemas/preference.esindex.json')
const SlotIndexDefinition = require('./src/schemas/slot.esindex.json')

const Axios = require('axios')

const { ES_DOMAIN_ENDPOINT, PREFERENCES_INDEX, SLOTS_INDEX } = process.env

const es = async () => {
  try {
     await Axios.put(`https://${ES_DOMAIN_ENDPOINT}/${PREFERENCES_INDEX}`, PreferenceIndexDefinition)
  } catch (prefPutErr) {
    await Axios.put(`https://${ES_DOMAIN_ENDPOINT}/${PREFERENCES_INDEX}/_mapping`, PreferenceIndexDefinition.mappings)
  }
  try {
    await Axios.put(`https://${ES_DOMAIN_ENDPOINT}/${SLOTS_INDEX}`, SlotIndexDefinition)
  } catch (slotPutErr) {
    await Axios.put(`https://${ES_DOMAIN_ENDPOINT}/${SLOTS_INDEX}/_mappings`, SlotIndexDefinition.mappings)
  }
  return 'ok'
}

const pingEs = async () => {
  const response = (await Axios.get(`https://${ES_DOMAIN_ENDPOINT}/_search`, { params: { size: '1000' } })).data
  console.log('%j', response)
  return JSON.stringify(response, null, 2)
}

const execute = async ({ url, arg, method }) => {
  const response = (await Axios[method](url, arg)).data
  console.log('%j', response)
  return JSON.stringify(response, null, 2)
}

module.exports = {
  es,
  pingEs,
  execute
}
