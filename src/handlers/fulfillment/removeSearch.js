
const { RemoveQueryByIndex } = require('../../putToTable')

const Response = require('./response')

const removeSearch = async ({ userId:fullId, currentIntent: { slots: { Searchnumber } } }) => {
  const userId = fullId.split(':').pop()
  const zeroIndex = parseInt(Searchnumber)
  if (!zeroIndex || zeroIndex < 1 || zeroIndex.toString() !== Searchnumber) {
    return Response(`Sorry, but ${Searchnumber} seemed to not be a valid number 1 or above...`)
  }
  const index = zeroIndex - 1
  const [removeError] = await RemoveQueryByIndex({ userId, index })
  if (removeError) {
    console.error(removeError)
  }
  return Response(removeError
    ? `There was something wrong with your removal. Did you pick a search number (${Searchnumber}) that didn't exist? Try listing again then retrying.`
    : `Great! Your search number ${Searchnumber} has been removed.`)
}


module.exports = removeSearch
