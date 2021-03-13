
const AWS = require('aws-sdk')
const CloudWatch = new AWS.CloudWatch()
const SQS = new AWS.SQS()

const Axios = require('axios')

const MESSAGE_UPLOAD_CONCURRENCY = 10
const SQS_BATCH_SIZE = 10
const BOT_METRICS_NAMESPACE = 'Vaxxie'
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

const ABORT_SAFETY_DURATION = 13 * 60 * 1000 // mins, seconds, millis

const closeEnoughQueries = ({ searchHit: { queries }, slot: { geolocation: { lat: latitude, lon: longitude } } }) => queries
  .map(({ requestedAt, zipcode, geoSearch: { geo_distance: { geolocation: { lat, lon }, distance } } }) => ({
    zipcode,
    requestedAt,
    computedDistance: SphericDistance({ latitude: lat, longitude: lon }, { latitude, longitude }),
    distance: parseInt(distance.replace('mi', ''))
  }))
  .filter(({ distance, computedDistance }) => computedDistance <= distance)

const {
  BulkToPreferencesIndex,
  BulkToSlotsIndex
} = require('../../bulkToIndex')

const SlackInboundSecret = require('../../slackInboundSecret')

const RESPONSES = {
  slotHitMessage: ({
    lang,
    queries,
    slot: {
      geolocation: {
        lat,
        lon,
      },
      url,
      provider,
      slots,
      location
    }
  }) => {
    switch (lang) {
      case 'es':
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Encontré ${slots || 'un número desconocido de'} citas de ${provider} en <${loc({ lat, lon })}|este lugar (${location || 'nombre de tienda desconocido'})>.
Esto coincide con su${queries.length > 1 ? 's' : ''} búsqueda${queries.length > 1 ? 's' : ''} ${queries.map(({ zipcode, requestedAt, distance, computedDistance }, index, list) => `${index === list.length - 1 && list.length >= 2 ? 'y' : ''} cerca de ${zipcode} dentro de ${distance} millas (sobre ${Math.round(computedDistance * 10) / 10} millas de distancia)`).join(', ')}.
Haga click en <${url}|ESTE ENLACE> para el sitio web del proveedor!`
          }
        }
      case 'en':
      default:
        return {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Found ${slots || 'an unknown number of'} slots from ${provider} at <${loc({ lat, lon })}|this location (${location || 'unknown store name'})>.
This matched your search${queries.length > 1 ? 'es' : ''} ${queries.map(({ zipcode, requestedAt, distance, computedDistance }, index, list) => `${index === list.length - 1 && list.length >= 2 ? 'and' : ''} near ${zipcode} within ${distance}mi (about ${Math.round(computedDistance * 10) / 10}mi away)`).join(', ')}.
Click <${url}|THIS LINK> for the providers's website!`
          }
        }
    }
  }
}

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
    if ((Date.now() - INIT_UTIME_MILLIS) >= ABORT_SAFETY_DURATION) {
      await (CloudWatch.putMetricData({
        Namespace: BOT_METRICS_NAMESPACE,
        MetricData: [
          {
            MetricName: 'SlotProcessingTimeouts',
            Dimensions: [
              {
                Name: 'BotGroupIdentifier',
                Value: BOT_GROUP_IDENTIFIER
              }
            ],
            Value: 1,
            StorageResolution: 60,
            Timestamp,
            Unit: 'Count'
          }
        ]
      }).promise())
      break
    }
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
