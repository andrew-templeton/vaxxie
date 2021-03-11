
const AWS = require('aws-sdk')
const SecretsManager = new AWS.SecretsManager()

const { SLACK_SECRET:SecretId } = process.env

let token = null
let secretPromise = null

module.exports = async () => {
  if (token) {
    return token
  }
  if (secretPromise) {
    const { SecretString } = await secretPromise
    token = JSON.parse(SecretString)
    return token
  }
  secretPromise = SecretsManager.getSecretValue({ SecretId }).promise()
  const { SecretString } = await secretPromise
  token = JSON.parse(SecretString)
  return token
}
