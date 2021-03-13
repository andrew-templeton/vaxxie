
// sometimes I pretend I am funny during naming

const AWS = require('aws-sdk')
const CloudWatch = new AWS.CloudWatch()
const Axios = require('axios')

const {
  BOT_USER_ID_EN,
  BOT_USER_ID_ES,
  BOT_GROUP_IDENTIFIER
} = process.env

const BOT_USER_IDS = {
  en: BOT_USER_ID_EN,
  es: BOT_USER_ID_ES
}
const LANGS = ['en', 'es']
const langCounter = () => LANGS.reduce((l, lang) => ({ ...l, [lang]: 0 }), {})

const SLACK_API = 'https://slack.com/api/chat.postMessage'
const BOT_METRICS_NAMESPACE = 'Vaxxie'
const SLACK_API_CONCURRENCY = 10

const loc = ({ lat, lon }) => `https://www.google.com/maps/place/${lat},${lon}`


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

const meterNotifications = async ({
  notificationsSentByLanguage,
  notificationsErroredByLanguage,
  totalNotificationsSent,
  totalNotificationsErrored
}) => {
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
}

const slideIntoDms = async ({ Records }) => {

  const authTokens = await SlackInboundSecret()

  const notificationTasks = Records
    .map(({ body }) => JSON.parse(body))
    .map(({ lang, channel, blocks }) => ({
      lang,
      channel,
      blocks: blocks.map(RESPONSES.slotHitMessage)
    }))
  let totalNotificationsSent = 0
  let totalNotificationsErrored = 0
  let notificationsSentByLanguage = langCounter()
  let notificationsErroredByLanguage = langCounter()
  const INIT_UTIME_MILLIS = Date.now()

  const hitThoseDms = async ({ lang, ...slackBody }) => {
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

  const worker = async (results=[]) => notificationTasks.length
    ? await worker(results.concat(await hitThoseDms(notificationTasks.shift())))
    : results

  const workers = new Array(SLACK_API_CONCURRENCY).fill().map(worker)

  const notificationResults = (await Promise.all(workers)).flat()

  console.log('%j', notificationResults)

  await meterNotifications({
    totalNotificationsSent,
    totalNotificationsErrored,
    notificationsSentByLanguage,
    notificationsErroredByLanguage
  })

  console.log('%j', {
    totalNotificationsSent,
    totalNotificationsErrored,
    notificationsSentByLanguage,
    notificationsErroredByLanguage
  })

  return 'ok'
}

module.exports = slideIntoDms
