
const AWS = require('aws-sdk')
const DynamoDB = new AWS.DynamoDB.DocumentClient()
const { PREFERENCES_TABLE:TableName } = process.env

const Response = require('./response')

const isSpanishBot = name => !!name.match(/Es$/)

const RESPONSES = {
  en: {
    noSearchesYet: () => 'You actually don\'t have any searches yet! Just ask me to help you find a vaccine.',
    noSearchesNow: () => 'You actually don\'t have any searches right now! Just ask me to help you find a vaccine.',
    listCurrentSearches: ({ user }) => `Sure! You asked me to look here:

${user.queries.map(({ zipcode, radius, requestedAt }, index) => `[${index + 1}] On ${localizeToCentral(requestedAt)}, you asked me to look near zipcode ${zipcode || '???'} within ${radius} miles.`).join('\n')}

If you want to edit or stop any of these searches, let me know. For example, you could say "I want to change one of my searches", or "I want to remove one of my searches."`
  },
  es: {
    noSearchesYet: () => 'En realidad, no tienes alguna búsquedas todavía! Me acaba de pedir para ayudar a encontrar una vacuna.',
    noSearchesNow: () => 'En realidad, no tienes alguna búsquedas ahora! Me acaba de pedir para ayudar a encontrar una vacuna.',
    listCurrentSearches: ({ user }) => `¡Por supuesto! Me pediste que mira aquí:

${user.queries.map(({ zipcode, radius, requestedAt }, index) => `[${index + 1}] On ${localizeToCentral(requestedAt)}, Usted me pidió que buscar una vacuna cerca de ${zipcode || '???'} dentro de ${radius} millas.`).join('\n')}

Si desea modificar o suspender cualquiera de estos registros, que me haga saber. Por ejemplo, se podría decir "Quiero cambiar una de mis búsquedas", o "Quiero eliminar una de mis búsquedas."`
  }
}

const localizeToCentral = utime => new Date(utime * 1000 - 3600 * 6 * 1000).toISOString().slice(5, 10).replace('-', '/')

const listSearches = async ({ userId:fullId, bot: { name } }) => {
  const userId = fullId.split(':').pop()
  const lang = isSpanishBot(name) ? 'es' : 'en'
  const responseLibrary = RESPONSES[lang]
  const result = await (DynamoDB.get({ TableName, Key: { userId } }).promise())
  const { Item:user } = result
  if (!user)  {
    return Response(responseLibrary.noSearchesYet())
  }

  if (!user.queries || !Array.isArray(user.queries) || !user.queries.length) {
    return Response(responseLibrary.noSearchesNow())
  }

  return Response(responseLibrary.listCurrentSearches({ user }))

}

module.exports = listSearches
