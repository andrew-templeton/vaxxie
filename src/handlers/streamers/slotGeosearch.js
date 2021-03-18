
const AWS = require('aws-sdk')
const SQS = new AWS.SQS()

const Axios = require('axios')

const MESSAGE_UPLOAD_CONCURRENCY = 10
const SQS_BATCH_SIZE = 10
const {
  PREFERENCES_INDEX,
  SLOTS_INDEX,
  ES_DOMAIN_ENDPOINT,
  BOT_GROUP_IDENTIFIER,
  NOTIFICATION_QUEUE_URL:QueueUrl,
  HARD_SHUTOFF
} = process.env

const headers = {
  'Content-Type': 'application/x-ndjson' // Lovely one from ES docs
}

const SlotConsistentHash = require('../../slotConsistentHash')

const SEARCH_CHUNK_CONCURRENCY = 25

const SphericDistance = require('../../SphericDistance')

const closeEnoughQueries = ({ searchHit: { queries }, slot: { geolocation: { lat: latitude, lon: longitude } } }) => queries
  .map(({ requestedAt, zipcode, geoSearch: { geo_distance: { geolocation: { lat, lon }, distance } } }) => ({
    zipcode,
    requestedAt,
    computedDistance: SphericDistance({ latitude: lat, longitude: lon }, { latitude, longitude }),
    distance: parseInt(distance.replace('mi', ''))
  }))
  .filter(({ distance, computedDistance }) => computedDistance <= distance)

const slotGeosearch = async ({ Records }) => {
  if (HARD_SHUTOFF === 'true') {
    console.log('HARD SHUTOFF!')
    return 'ok'
  }
  console.log('%j', Records)
  const allItems = Records.map(({ body }) => JSON.parse(body))
  const hashes = allItems.map(SlotConsistentHash)
  const allSearches = hashes.map(hash => ({
    query: {
      nested: {
        path: 'queries',
        query: {
          percolate: {
            field: 'queries.geoSearch',
            index: SLOTS_INDEX,
            id: hash
          }
        }
      }
    },
    size: 10000
  }))

  const processChunkOfSearches = async ({ searches, items }) => {
    const msearchBody = searches.reduce((body, search) => body.concat([
      JSON.stringify({}),
      JSON.stringify(search)
    ]), []).concat('').join('\n')
    const result = (await Axios.post(`https://${ES_DOMAIN_ENDPOINT}/${PREFERENCES_INDEX}/_msearch`, msearchBody, { headers })).data

    console.log('%j', result)

    const collectedHitsByUser = items.reduce((collection, slot, index) => {
      const resp = result.responses[index]
      if (!resp || !resp.hits || !Array.isArray(resp.hits.hits)) {
        console.log('WARN: %j', resp)
        return collection
      }
      const relevantSubscriberSearches = resp.hits.hits.map(hit => hit._source)
      relevantSubscriberSearches.forEach(searchHit => {
        const { userId, lang='en' } = searchHit
        const queries = closeEnoughQueries({ searchHit, slot })
        collection[userId] = (collection[userId] || []).concat({ index, queries, lang })
      })
      return collection
    }, {})
    // [userId] => [index of slots to notify them about]

    const notificationTasks = Object.keys(collectedHitsByUser).map(userId => ({
      lang: collectedHitsByUser[userId].reduce((currLang, { lang }) => currLang || lang, undefined) || 'en',
      channel: userId,
      blocks: collectedHitsByUser[userId]
        .map(({ index, queries, lang }) => ({ slot: items[index], queries, lang }))
    }))

    return notificationTasks

  }

  const taskBundles = []

  while (allSearches.length) {
    taskBundles.push(await processChunkOfSearches({
      searches: allSearches.splice(0, SEARCH_CHUNK_CONCURRENCY),
      items: allItems.splice(0, SEARCH_CHUNK_CONCURRENCY)
    }))
  }

  const flatTasks = taskBundles.flat()
  const batches = []
  while (flatTasks.length) {
    batches.push({
      QueueUrl,
      Entries: flatTasks.splice(0, SQS_BATCH_SIZE).map((task, index) => ({
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

module.exports = slotGeosearch
