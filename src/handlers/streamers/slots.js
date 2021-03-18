
const AWS = require('aws-sdk')
const SQS = new AWS.SQS()

const MESSAGE_UPLOAD_CONCURRENCY = 10
const SQS_BATCH_SIZE = 10
const {
  SLOT_GEOSEARCH_QUEUE_URL:QueueUrl,
  HARD_SHUTOFF
} = process.env

const { BulkToSlotsIndex } = require('../../bulkToIndex')

const slots = async ({ Records }) => {
  if (HARD_SHUTOFF === 'true') {
    console.log('HARD SHUTOFF!')
    return 'ok'
  }
  const INIT_UTIME_MILLIS = Date.now()
  console.log('%j', Records)
  const allItems = Records.filter(({ eventName }) => eventName !== 'REMOVE').map(({ dynamodb: { NewImage } }) => AWS.DynamoDB.Converter.unmarshall(NewImage)).map(({
    id,
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
    id,
    utime,
    provider,
    from,
    geolocation: {
      lat: latitude,
      lon: longitude
    },
    location,
    address,
    url,
    slots
  }))

  if (!allItems.length) {
    return 'ok'
  }

  await BulkToSlotsIndex(allItems)

  const batches = []
  while (allItems.length) {
    batches.push({
      QueueUrl,
      Entries: allItems.splice(0, SQS_BATCH_SIZE).map((task, index) => ({
        Id: index.toString(),
        MessageBody: JSON.stringify(task)
      }))
    })
  }

  const worker = async (results=[]) => batches.length
    ? await worker(results.concat(await (SQS.sendMessageBatch(batches.shift()).promise())))
    : results

  const workers = new Array(MESSAGE_UPLOAD_CONCURRENCY).fill().map(worker)

  const sqsSendResults = (await Promise.all(workers)).flat()

  console.log('%j', sqsSendResults)

  return 'ok'
}

module.exports = slots
