
module.exports = fn => async (...args) => {
  try {
    return [undefined, await fn(...args)]
  } catch (err) {
    return [err, undefined]
  }
}
