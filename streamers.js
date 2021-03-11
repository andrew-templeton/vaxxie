
const AWS = require('aws-sdk')
const CloudWatch = new AWS.CloudWatch()
const Axios = require('axios')

const { PREFERENCES_INDEX, SLOTS_INDEX, ES_DOMAIN_ENDPOINT, BOT_USER_ID_EN, BOT_USER_ID_ES, BOT_GROUP_IDENTIFIER } = process.env

const SLACK_API = 'https://slack.com/api/chat.postMessage'
const BOT_METRICS_NAMESPACE = 'Vaxxie'

const headers = {
  'Content-Type': 'application/x-ndjson' // Lovely one from ES docs
}

const loc = ({ lat, lon }) => `https://www.google.com/maps/place/${lat},${lon}`

const SlotConsistentHash = require('./src/slotConsistentHash')

const SEARCH_CHUNK_CONCURRENCY = 25

const SphericDistance = require('./src/SphericDistance')

const BOT_USER_IDS = {
  en: BOT_USER_ID_EN,
  es: BOT_USER_ID_ES
}
const LANGS = ['en', 'es']
const langCounter = () => LANGS.reduce((l, lang) => ({ ...l, [lang]: 0 }), {})

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
} = require('./src/bulkToIndex')

const SlackInboundSecret = require('./src/slackInboundSecret')

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
  console.log('%j', Records)
  let totalNotificationsSent = 0
  let totalNotificationsErrored = 0
  let notificationsSentByLanguage = langCounter()
  let notificationsErroredByLanguage = langCounter()
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
      blocks: collectedHitsByUser[userId].map(({ index, queries, lang }) => ({ slot: items[index], queries, lang })).map(RESPONSES.slotHitMessage)
    }))

    if (!notificationTasks.length) {
      console.log('No notification tasks.')
      return 'ok'
    }

    const authTokens = await SlackInboundSecret()

    for (let ii = 0; ii < notificationTasks.length; ii++) {
      let { lang, ...slackBody } = notificationTasks[ii]
      try {
        const { data } = await Axios.post(SLACK_API, slackBody, {
          headers: {
            Authorization: `Bearer ${authTokens[lang]}`
          }
        })
        console.log('NOTIFICATION SENT: %j', data)
        notificationsSentByLanguage[lang]++
        totalNotificationsSent++
      } catch (notificationError) {
        console.error('NOTIFICATION ERROR: ', notificationError)
        notificationsErroredByLanguage[lang]++
        totalNotificationsErrored++
      }
    }
  }

  while (allSearches.length) {
    await processChunkOfSearches({
      searches: allSearches.splice(0, SEARCH_CHUNK_CONCURRENCY),
      items: allItems.splice(0, SEARCH_CHUNK_CONCURRENCY)
    })
  }

  console.log('Notification statistics: %j', {
    totalNotificationsSent,
    totalNotificationsErrored
  })
  const Timestamp = Math.floor(Date.now() / 1000)
  await (CloudWatch.putMetricData({
    Namespace: BOT_METRICS_NAMESPACE,
    MetricData: [
      ...LANGS.map(lang => [
        {
          MetricName: 'NotificationsSent',
          Dimensions: [
            {
              Name: 'BotGroupIdentifier',
              Value: BOT_GROUP_IDENTIFIER
            },
            {
              Name: 'BotUserId',
              Value: BOT_USER_IDS[lang]
            },
            {
              Name: 'Language',
              Value: lang
            }
          ],
          Value: notificationsSentByLanguage[lang],
          StorageResolution: 60,
          Timestamp,
          Unit: 'Count'
        },
        {
          MetricName: 'NotificationsErrored',
          Dimensions: [
            {
              Name: 'BotGroupIdentifier',
              Value: BOT_GROUP_IDENTIFIER
            },
            {
              Name: 'BotUserId',
              Value: BOT_USER_IDS[lang]
            },
            {
              Name: 'Language',
              Value: lang
            }
          ],
          Value: notificationsErroredByLanguage[lang],
          StorageResolution: 60,
          Timestamp,
          Unit: 'Count'
        }
      ]).flat(),
      {
        MetricName: 'NotificationsSent',
        Dimensions: [
          {
            Name: 'BotGroupIdentifier',
            Value: BOT_GROUP_IDENTIFIER
          }
        ],
        Value: totalNotificationsSent,
        StorageResolution: 60,
        Timestamp,
        Unit: 'Count'
      },
      {
        MetricName: 'NotificationsErrored',
        Dimensions: [
          {
            Name: 'BotGroupIdentifier',
            Value: BOT_GROUP_IDENTIFIER
          }
        ],
        Value: totalNotificationsErrored,
        StorageResolution: 60,
        Timestamp,
        Unit: 'Count'
      }
    ]
  }).promise())

  return 'ok'
}

const preferences = async ({ Records }) => {
  console.log('%j', Records)
  const items = Records.filter(({ eventName }) => eventName !== 'REMOVE').map(({ dynamodb: { NewImage } }) => AWS.DynamoDB.Converter.unmarshall(NewImage)).map(({
    userId,
    queries,
    createdAt,
    lang
  }) => ({
    id: userId,
    userId,
    lang,
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
