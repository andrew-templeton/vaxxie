
const AWS = require('aws-sdk')
const DynamoDB = new AWS.DynamoDB.DocumentClient()
const Fs = require('fs')
const Path = require('path')

const BATCH_SIZE = 25
const BATCH_CONCURRENCY = 5
const TABLE_NAME = 'vaxxbot3-PreferenceTable-JP87XSW2DPBF' // Switch for other installs

const group = (list, size, set=[]) => list.length ? group(list.slice(size), size, set.concat([list.slice(0, size)])) : set

const cleanOldUsers = async list => {
  const groups = group(list, BATCH_SIZE)
  const requests = groups.map(group => ({
    RequestItems: {
      [TABLE_NAME]: group.map(userId => ({
        DeleteRequest: {
          Key: {
            userId
          }
        }
      }))
    }
  }))
  const runBatch = async batch => await (DynamoDB.batchWrite(batch).promise())
  const runBatchesInParallel = parallel(runBatch, BATCH_CONCURRENCY)
  const results = await runBatchesInParallel(requests)
  return results
}

const parallel = (functor, concurrency) => async list => {
  const thread = async (results=[]) => list.length ? await thread(results.concat(await functor (list.shift()))) : results
  return await Promise.all(new Array(concurrency).fill().map(thread))
}



const SLACK_CSV_USERID_COL = 6
const SLACK_CSV_USERID_PATTERN = /^U[A-Z0-9]{10}$/
if (!module.parent) {
  const list = Fs.readFileSync(Path.resolve(process.cwd(), process.argv[2])).toString()
    .split('\n').map(line => line.split(',')[SLACK_CSV_USERID_COL])
    .filter(userId => userId && userId.match(SLACK_CSV_USERID_PATTERN))
  cleanOldUsers(list).then(console.log)
}
