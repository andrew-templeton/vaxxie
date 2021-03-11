
const { ReplaceQueryInPreferences } = require('../../putToTable')
const Zips = require('../../data/zips.json')
const MAX_RADIUS = require('../../schemas/preference.dynamodb.jsonschema.json').properties.queries.items.properties.radius.maximum

const Response = require('./response')

const isSpanishBot = name => !!name.match(/Es$/)

const RESPONSES = {
  en: {
    badZip: ({ Zipcode }) => `Sorry, but ${Zipcode} doesn't seem to be a valid Zipcode!`,
    tooFarZip: ({ Zipcode }) => 'Sorry, but I can only search up to 200 miles at a time. Could you try something a little smaller?',
    badSearchNumber: ({ Searchnumber }) => `Sorry, but ${Searchnumber} seemed to not be a valid number 1 or above...`,
    failedSearchUpdate: ({ Searchnumber }) => `There was something wrong with your update. Did you pick a search number (${Searchnumber}) that didn't exist? Try listing again then retrying.`,
    successfulSearchUpdate: ({ radius, Zipcode, Searchnumber }) => `Great! Your search number ${Searchnumber} has been updated to look for appointments within ${radius}mi of ${Zipcode}.`
  },
  es: {
    badZip: ({ Zipcode }) => `Lo sentimos pero ${Zipcode} no es un código postal valido`,
    tooFarZip: ({ Zipcode }) => `Lo sentimos, pero sólo puedo buscar hasta 200 millas a la vez. Podrías probar algo un poco más pequeño?`,
    badSearchNumber: ({ Searchnumber }) => `Lo sentimos, pero ${Searchnumber} parecía no ser un número válido 1 o superior...`,
    failedSearchUpdate: ({ Searchnumber }) => `Había algo mal con su actualización. Ud. eligió un número de búsqueda (${Searchnumber}) que no existía? Pide la lista de nuevo y volver a intentar.`,
    successfulSearchUpdate: ({ radius, Zipcode, Searchnumber }) => `¡Genial! Su número de búsqueda ${Searchnumber} se ha actualizado para buscar citas dentro de un radio de ${radius}$ millas de ${Zipcode}.`
  }
}

const updateSearch = async ({ userId:fullId, bot: { name }, currentIntent: { slots: { Searchnumber, Distance, Zipcode } } }) => {
  const userId = fullId.split(':').pop()
  const radius = parseFloat(Distance)
  const oneIndexed = parseInt(Searchnumber)
  const lang = isSpanishBot(name) ? 'es' : 'en'
  const responseLibrary = RESPONSES[lang]
  if (!oneIndexed || oneIndexed < 1 || oneIndexed.toString() !== Searchnumber) {
    return Response(responseLibrary.badSearchNumber({ Searchnumber }))
  }
  const index = oneIndexed - 1
  if (!Zips[Zipcode]) {
    return Response(responseLibrary.badZip({ Zipcode }))
  }
  const { lat:latitude, lon:longitude } = Zips[Zipcode]
  const now = Math.floor(Date.now() / 1000)
  if (radius > MAX_RADIUS) {
    return Response(responseLibrary.tooFarZip({ Zipcode }))
  }
  const query = { requestedAt: now, latitude, longitude, radius, zipcode: Zipcode }
  const [updateError] = await ReplaceQueryInPreferences({ userId, query, index, lang })
  if (updateError) {
    console.log(updateError)
  }
  return Response(updateError
    ? responseLibrary.failedSearchUpdate({ Searchnumber })
    : responseLibrary.successfulSearchUpdate({ radius, Zipcode, Searchnumber }))
}


module.exports = updateSearch
