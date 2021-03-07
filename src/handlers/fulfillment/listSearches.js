
const AWS = require('aws-sdk')
const DynamoDB = new AWS.DynamoDB.DocumentClient()
const { PREFERENCES_TABLE:TableName } = process.env

const Response = require('./response')

const localizeToCentral = utime => new Date(utime * 1000 - 3600 * 6 * 1000).toISOString().slice(5, 10).replace('-', '/')

const listSearches = async ({ userId:fullId }) => {
  const userId = fullId.split(':').pop()
  const result = await (DynamoDB.get({ TableName, Key: { userId } }).promise())
  const { Item:user } = result
  if (!user)  {
    return Response('You actually don\'t have any searches yet! Just ask me to help you find a vaccine.')
  }

  if (!user.queries || !Array.isArray(user.queries) || !user.queries.length) {
    return Response('You actually don\'t have any searches right now! Just ask me to help you find a vaccine.')
  }

  return Response(`
Sure! You asked me to look here:

${user.queries.map(({ zipcode, radius, requestedAt }, index) => `[${index + 1}] On ${localizeToCentral(requestedAt)}, you asked me to look near zipcode ${zipcode || '???'} within ${radius} miles.`).join('\n')}

If you want to edit or stop any of these searches, let me know. For example, you could say "I want to change one of my searches", or "I want to remove one of my searches."
  `)

}

module.exports = listSearches
