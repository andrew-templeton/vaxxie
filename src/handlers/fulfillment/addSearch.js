
const {
  PutToPreferencesTable,
  AppendQueryToPreferences
} = require('../../putToTable')
const Zips = require('../../data/zips.json')
const MAX_RADIUS = require('../../schemas/preference.dynamodb.jsonschema.json').properties.queries.items.properties.radius.maximum

const Response = require('./response')

const isSpanishBot = name => !!name.match(/Es$/)

const RESPONSES = {
  en: {
    badZip: ({ Zipcode }) => `Sorry, but ${Zipcode} doesn't seem to be a valid Zipcode!`,
    tooFarZip: ({ Zipcode }) => 'Sorry, but I can only search up to 200 miles at a time. Could you try something a little smaller?',
    addedFirstSearch: ({ radius, Zipcode }) => `Thanks, I set up your search! I\'ll send you appointments within ${radius}mi of ${Zipcode} when they come.`,
    internalSearchError: ({ radius, Zipcode }) => 'Sorry, something went wrong when I tried to record your preferences! Contact a developer.',
    addedAnotherSearch: ({ radius, Zipcode }) => `Thanks, I added this new search! I\'ll send you appointments within ${radius}mi of ${Zipcode} when they come.`
  },
  es: {
    badZip: ({ Zipcode }) => `Lo sentimos pero ${Zipcode} no es un código postal valido`,
    tooFarZip: ({ Zipcode }) => `Lo sentimos, pero sólo puedo buscar hasta 200 millas a la vez. Podrías probar algo un poco más pequeño?`,
    addedFirstSearch: ({ radius, Zipcode }) => `Gracias, lo establecieron su búsqueda! Te remitimos citas dentro de un radio de ${radius} millas de ${Zipcode} cuando vienen.`,
    internalSearchError: ({ radius, Zipcode }) => `Que pena. Algo paso mal cuando intenti anotar sus preferencias. Quizas puede contactar un desarrolador.`,
    addedAnotherSearch: ({ radius, Zipcode }) => `Gracias, lo establecieron su búsqueda! Te remitimos citas dentro de un radio de ${radius} millas de ${Zipcode} cuando vienen.`
  }
}

const addSearch = async event => {
  console.log('%j', event)
  const { userId, bot: { name }, currentIntent: { slots: { Zipcode, Distance } } } = event
  const slackUserId = userId.split(':').pop()
  const radius = parseFloat(Distance)
  const lang = isSpanishBot(name) ? 'es' : 'en'
  const responseLibrary = RESPONSES[lang]
  if (!Zips[Zipcode]) {
    return Response(responseLibrary.badZip({ Zipcode }))
  }
  const { lat:latitude, lon:longitude } = Zips[Zipcode]
  const now = Math.floor(Date.now() / 1000)
  if (radius > MAX_RADIUS) {
    return Response(responseLibrary.tooFarZip({ Zipcode }))
  }
  const query = { requestedAt: now, latitude, longitude, radius, zipcode: Zipcode }
  const [putError] = await PutToPreferencesTable({
    lang,
    userId: slackUserId,
    queries: [ query ],
    createdAt: now
  }, {
    ConditionExpression: 'attribute_not_exists(userId)'
  })
  if (!putError) {
    return Response(responseLibrary.addedFirstSearch({ radius, Zipcode }))
  }
  const [updateError] = await AppendQueryToPreferences({ query, userId: slackUserId, lang })
  if (updateError) {
    console.error(updateError)
  }
  return Response(updateError
    ? responseLibrary.internalSearchError({ radius, Zipcode })
    : responseLibrary.addedAnotherSearch({ radius, Zipcode })
  )
}

module.exports = addSearch
