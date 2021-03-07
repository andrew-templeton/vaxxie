

const { PutToPreferencesTable } = require('./src/putToTable')
const Zips = require('./src/data/zips.json')
const MAX_RADIUS = require('./src/schemas/preference.dynamodb.jsonschema.json').properties.queries.items.properties.radius.maximum
const { NAMESPACE } = process.env
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
  if (radius > MAX_RADIUS) {
    return response('Sorry, but I can only search up to 200 miles at a time. Could you try something a little smaller?')
  }
  const [putError] = await PutToPreferencesTable({ userId: slackUserId, queries: [ { requestedAt: now, latitude, longitude, radius } ], createdAt: now })
  console.log(putError)
  return response(putError
    ? 'Sorry, something went wrong when I tried to record your preferences! Contact a developer.'
    : `Thanks, I set up your search! I\'ll send you appointments inside this area when they come. Within ${radius}mi of ${Zipcode}`
  )
}

const faqs = async ({ currentIntent: { name, slots={} } }) => {
  console.log({
    name,
    slots
  })
  switch (name) {
    case `${NAMESPACE}CancelAppointmentsFAQ`:
      return response(`Usually the email confirmation will contain a link allowing you to reschedule an appointment.
 HEB/Walgreens/CVS: See email confirmation to cancel
 Walmart: Call the pharmacy
 Bell County: Email Vaccine-cancel-bell@outlook.com`)
    case `${NAMESPACE}RescheduleAppointmentsFAQ`:
      return response('Most providers will not allow you to reschedule your appointment.  You can try calling the provider and seeing if they would be open to it but many times you will need to cancel and make a new appointment.')
    case `${NAMESPACE}TransferAppointmentsFAQ`:
      return response('Most providers will not allow you to transfer appointments to another person. There have been limited exceptions to this, mainly with pharmacies.  Contact the pharmacy to see if it is something they would do.')
  }
  return response('Looks like a developer made a mistake programming me, and I don\'t know what to reply with!')
}


module.exports = {
  preferences,
  faqs
}
