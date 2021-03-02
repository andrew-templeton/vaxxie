
module.exports = (functor, parallelism) => async tasks => (await Promise.all(new Array(parallelism).fill(null).map(() => async function (results) { return tasks.length ? await arguments.callee(results.concat(await functor(tasks.shift()))) : [] }([])))).flat()
