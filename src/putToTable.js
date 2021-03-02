
const { SLOTS_TABLE, PREFERENCES_TABLE } = process.env

const PreferencesDynamoSchema = require('./schemas/preference.dynamodb.jsonschema.json')
const SlotsDynamoSchema = require('./schemas/slot.dynamodb.jsonschema.json')

const AWS = require('aws-sdk')
const DynamoDB = new AWS.DynamoDB.DocumentClient()
const Validate = require('jsonschema').validate;
const Maybe = require('./maybe')
const Parallelizer = require('./parallelizer')

const BULK_BATCH_SIZE = 25

const putter = ({ TableName, schema }) => async item => {
  const { errors, valid } = Validate(item, schema)
  if (!valid) {
    console.log('%j', JSON.parse(JSON.stringify(errors)))
    return [errors, undefined]
  }
  return await (Maybe(async Item => (await (DynamoDB.put({ Item, TableName }).promise())).Item)(item))
}

const batchPutter = ({ TableName, schema }) => async items => {
  const validations = items.map(item => Validate(item, SlotsDynamoSchema))
  if (!items.length || validations.some(validation => !validation.valid)) {
    console.log('Some non-valid items:')
    console.log('%j', JSON.parse(JSON.stringify(validations)))
    return [validations]
  }
  const bulk = async params => await (DynamoDB.batchWrite(params).promise())
  const list = items.slice()
  const batches = []
  while (list.length) {
    batches.push({
      RequestItems: {
        [TableName]: list.splice(0, 25).map(Item => ({ PutRequest: { Item } }))
      }
    })
  }
  console.log('Batches: ')
  console.log('%j', batches)
  const results = []
  for (let ii = 0; ii < batches.length; ii++) {
    results.push(await bulk(batches[ii]))
  }
  return results
}

module.exports = {
  BatchPutSlotsToTable: batchPutter({ TableName: SLOTS_TABLE, schema: SlotsDynamoSchema }),
  PutToSlotsTable: putter({ TableName: SLOTS_TABLE, schema: SlotsDynamoSchema }),
  PutToPreferencesTable: putter({ TableName: PREFERENCES_TABLE, schema: PreferencesDynamoSchema })
}
