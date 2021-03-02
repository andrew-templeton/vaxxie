

const { PutToPreferencesTable } = require('./src/putToTable')
const Zips = require('./src/data/zips.json')


const response = content => ({
  dialogAction: {
    type: 'Close',
    fulfillmentState: 'Fulfilled',
    message: {
      contentType: 'PlainText',
      content
    }
  }
})

const preferences = async event => {
  console.log('%j', event)
  const { userId, currentIntent: { slots: { Zipcode, Distance } } } = event
  const slackUserId = userId.split(':').pop()
  const radius = parseFloat(Distance)
  if (!Zips[Zipcode]) {
    return response(`Sorry, but ${Zipcode} doesn't seem to be a valid Zipcode!`)
  }
  const { lat:latitude, lon:longitude } = Zips[Zipcode]
  const now = Math.floor(Date.now() / 1000)
  const [putError] = await PutToPreferencesTable({ userId: slackUserId, queries: [ { requestedAt: now, latitude, longitude, radius } ], createdAt: now })
  console.log(putError)
  return response(putError
    ? 'Sorry, something went wrong when I tried to record your preferences! Contact a developer.'
    : `Thanks, I set up your search! I\'ll send you appointments inside this area when they come. Within ${radius}mi of ${Zipcode}`
  )
}


module.exports = {
  preferences
}
