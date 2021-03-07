
module.exports = (functor, parallelism) => async tasks => {
  const queue = tasks.slice()
  const thread = async results => queue.length ? await thread(results.concat(await functor(queue.pop()))) : results
  return (await Promise.all(new Array(parallelism).fill(null).map(async n => await thread([])))).flat()
}
