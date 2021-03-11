
const { RemoveQueryByIndex } = require('../../putToTable')

const Response = require('./response')

const isSpanishBot = name => !!name.match(/Es$/)

const RESPONSES = {
  en: {
    badSearchNumber: ({ Searchnumber }) => `Sorry, but ${Searchnumber} seemed to not be a valid number 1 or above...`,
    successfulSearchRemoval: ({ Searchnumber }) => `Great! Your search number ${Searchnumber} has been removed.`,
    failedSearchRemoval: ({ Searchnumber }) => `There was something wrong with your removal. Did you pick a search number (${Searchnumber}) that didn't exist? Try listing again then retrying.`
  },
  es: {
    badSearchNumber: ({ Searchnumber }) => `Lo sentimos, pero ${Searchnumber} parecía no ser un número válido 1 o superior...`,
    successfulSearchRemoval: ({ Searchnumber }) => `¡Genial! Su número de búsqueda ${Searchnumber} se ha eliminado.`,
    failedSearchRemoval: ({ Searchnumber }) => `Había algo mal con su eliminación. Ud. eligió un número de búsqueda (${Searchnumber}) que no existía? PIde la lista de nuevo y volver a intentar por favor.`
  }
}

const removeSearch = async ({ userId:fullId, bot: { name }, currentIntent: { slots: { Searchnumber } } }) => {
  const userId = fullId.split(':').pop()
  const zeroIndex = parseInt(Searchnumber)
  const lang = isSpanishBot(name) ? 'es' : 'en'
  const responseLibrary = RESPONSES[lang]
  if (!zeroIndex || zeroIndex < 1 || zeroIndex.toString() !== Searchnumber) {
    return Response(responseLibrary.badSearchNumber({ Searchnumber }))
  }
  const index = zeroIndex - 1
  const [removeError] = await RemoveQueryByIndex({ userId, index, lang })
  if (removeError) {
    console.error(removeError)
  }
  return Response(removeError
    ? responseLibrary.failedSearchRemoval({ Searchnumber })
    : responseLibrary.successfulSearchRemoval({ Searchnumber }))
}


module.exports = removeSearch
