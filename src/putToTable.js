
const { SLOTS_TABLE, PREFERENCES_TABLE } = process.env

const PreferencesDynamoSchema = require('./schemas/preference.dynamodb.jsonschema.json')
const SlotsDynamoSchema = require('./schemas/slot.dynamodb.jsonschema.json')
const QuerySchema = PreferencesDynamoSchema.properties.queries.items

const AWS = require('aws-sdk')
const DynamoDB = new AWS.DynamoDB.DocumentClient()
const Validate = require('jsonschema').validate;
const Maybe = require('./maybe')
const Parallelizer = require('./parallelizer')

const BULK_BATCH_SIZE = 25

const putter = ({ TableName, schema }) => async (item, other={}) => {
  const { errors, valid } = Validate(item, schema)
  if (!valid) {
    console.log('%j', JSON.parse(JSON.stringify(errors)))
    return [errors, undefined]
  }
  return await (Maybe(async Item => (await (DynamoDB.put({ Item, TableName, ...other }).promise())).Item)(item))
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
  PutToPreferencesTable: putter({ TableName: PREFERENCES_TABLE, schema: PreferencesDynamoSchema }),
  AppendQueryToPreferences: async ({ userId, query, lang }) => {
    const { valid, errors } = Validate(query, QuerySchema)
    if (!valid) {
      return [errors]
    }
    return await (Maybe(async ({ query, userId, lang }) => await (DynamoDB.update({
      TableName: PREFERENCES_TABLE,
      Key: { userId },
      UpdateExpression: 'SET queries = list_append(queries, :q), lang = :l',
      ExpressionAttributeValues: {
        ':q': [query],
        ':l': lang
      }
    }).promise()))({ query, userId, lang }))
  },
  ReplaceQueryInPreferences: async ({ index, userId, query, lang }) => {
    const { valid, errors } = Validate(query, QuerySchema)
    if (!valid) {
      return [errors]
    }
    return await (Maybe(async ({ query, userId, index, lang }) => await (DynamoDB.update({
      TableName: PREFERENCES_TABLE,
      Key: { userId },
      // making sure it's an int, prevents injection attacks
      UpdateExpression: `SET queries[${parseInt(index).toString()}] = :q, lang = :l`,
      ExpressionAttributeValues: {
        ':q': query,
        ':l': lang
      }
    }).promise()))({ query, userId, index, lang }))
  },
  RemoveQueryByIndex: async ({ index, userId, lang }) => await (Maybe(async ({ userId, index, lang }) => await (DynamoDB.update({
    TableName: PREFERENCES_TABLE,
    Key: { userId },
    UpdateExpression: `REMOVE queries[${parseInt(index).toString()}] SET lang = :l`,
    ExpressionAttributeValues: {
      ':l': lang
    }
  }).promise()))({ userId, index, lang }))
}
