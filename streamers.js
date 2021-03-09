
const AWS = require('aws-sdk')
const Axios = require('axios')

const { PREFERENCES_INDEX, SLOTS_INDEX, ES_DOMAIN_ENDPOINT } = process.env

const SLACK_API = 'https://slack.com/api/chat.postMessage'

const headers = {
  'Content-Type': 'application/x-ndjson' // Lovely one from ES docs
}

const loc = ({ lat, lon }) => `https://www.google.com/maps/place/${lat},${lon}`

const SlotConsistentHash = require('./src/slotConsistentHash')

const SEARCH_CHUNK_CONCURRENCY = 25

const {
  BulkToPreferencesIndex,
  BulkToSlotsIndex
} = require('./src/bulkToIndex')

const SlackInboundSecret = require('./src/slackInboundSecret')

const slots = async ({ Records }) => {
  console.log('%j', Records)
  const items = Records.filter(({ eventName }) => eventName !== 'REMOVE').map(({ dynamodb: { NewImage } }) => AWS.DynamoDB.Converter.unmarshall(NewImage)).map(({
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

  if (!items.length) {
    return 'ok'
  }

  await BulkToSlotsIndex(items)
  const hashes = items.map(SlotConsistentHash)
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

  while (allSearches.length) {
    await processChunkOfSearches(allSearches.splice(0, SEARCH_CHUNK_CONCURRENCY))
  }

  const processChunkOfSearches = async searches => {
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
      const relevantSubscriberUserIds = resp.hits.hits.map(hit => hit._source.userId)
      relevantSubscriberUserIds.forEach(userId => {
        collection[userId] = (collection[userId] || []).concat(index)
      })
      return collection
    }, {})
    // [userId] => [index of slots to notify them about]

    const notificationTasks = Object.keys(collectedHitsByUser).map(userId => ({
      channel: userId,
      blocks: collectedHitsByUser[userId].map(index => items[index]).map(({
        geolocation: {
          lat,
          lon,
        },
        url,
        provider,
        slots,
        location
      }) => ({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `Found ${slots || 'an unknown number of '} slots from ${provider} at <${loc({ lat, lon })}|this location (${location || 'unknown store name'})>. Click <${url}|THIS LINK> to book!`
        }
      }))
    }))

    if (!notificationTasks.length) {
      console.log('No notification tasks.')
      return 'ok'
    }

    const authToken = await SlackInboundSecret()

    for (let ii = 0; ii < notificationTasks.length; ii++) {
      const { data } = await Axios.post(SLACK_API, notificationTasks[ii], {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      })
      console.log(data)
    }
  }

  console.log('%j', result)
  return 'ok'
}

const preferences = async ({ Records }) => {
  console.log('%j', Records)
  const items = Records.filter(({ eventName }) => eventName !== 'REMOVE').map(({ dynamodb: { NewImage } }) => AWS.DynamoDB.Converter.unmarshall(NewImage)).map(({
    userId,
    queries,
    createdAt
  }) => ({
    id: userId,
    userId,
    createdAt,
    queries: queries.map(({
      requestedAt,
      latitude:lat,
      longitude:lon,
      radius,
      zipcode
    }) => ({
      requestedAt,
      zipcode,
      geoSearch: {
        geo_distance: {
          distance: `${radius}mi`,
          geolocation: {
            lat,
            lon
          }
        }
      }
    }))
  }))
  if (!items.length) {
    return 'ok'
  }
  console.log('%j', items)
  await BulkToPreferencesIndex(items)
  return 'ok'
}

module.exports = {
  slots,
  preferences
}
