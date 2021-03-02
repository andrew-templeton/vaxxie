
const { PREFERENCES_INDEX, SLOTS_INDEX, ES_DOMAIN_ENDPOINT } = process.env

const Axios = require('axios')
const Parallelizer = require('./parallelizer')
const Validate = require('jsonschema').validate
const Maybe = require('./maybe')

const PreferencesEsSchema = require('./schemas/preference.es.jsonschema.json')
const SlotsEsSchema = require('./schemas/slot.es.jsonschema.json')

const SlotConsistentHash = require('./slotConsistentHash')

const headers = {
  'Content-Type': 'application/x-ndjson' // Lovely one from ES docs
}

const BULK_CONCURRENCY = 10
const BULK_CAP = 9 * 1000 * 1000

const bulker = ({ id, _index, schema }) => async items => {
  const list = items.slice()
  const validations = list.map(item => Validate(item, schema))
  if (validations.some(validation => !validation.valid)) {
    console.error('%j', JSON.stringify(validations))
    return [validations]
  }
  const batches = []
  while (list.length) {
    let chunks = []
    let size = 0
    while (list.length && size < BULK_CAP) {
      let record = list.shift()
      let _id = id(record)
      record.id = _id
      let header = JSON.stringify({ index: { _id, _index } })
      let json = JSON.stringify(record)
      chunks.push(header)
      chunks.push(json)
      size += json.length + header.length + 2 // for newlines
    }
    chunks.push('') // All bulks end in newline
    batches.push(chunks.join('\n'))
  }
  const bulk = async body => (await Axios.post(`https://${ES_DOMAIN_ENDPOINT}/_bulk`, body, { headers })).data
  const results = []
  for (let ii = 0; ii < batches.length; ii++) {
    console.log('Bulking')
    console.log(batches[ii])
    results.push(await bulk(batches[ii]))
  }
  console.log('%j', results)
  return [undefined, results]
}

module.exports = {
  BulkToSlotsIndex: bulker({
    id: SlotConsistentHash,
    _index: SLOTS_INDEX,
    schema: SlotsEsSchema
  }),
  BulkToPreferencesIndex: bulker({
    id: ({ userId }) => userId,
    _index: PREFERENCES_INDEX,
    schema: PreferencesEsSchema
  })
}
