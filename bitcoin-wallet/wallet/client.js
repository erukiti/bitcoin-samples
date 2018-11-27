const rp = require('request-promise')

const createClient = ({ host, rpcport, user, pass }) => {
  return async (method, ...params) => {
    const body = JSON.stringify({ method, params })
    console.log(`\x1b[32m${method}(${params.join(', ')})\x1b[m`)
    const { result, error } = JSON.parse(
      await rp(`http://${host}:${rpcport}`, {
        method: 'POST',
        body,
        auth: { user, pass }
      }).catch(e => {
        if (e.statusCode) {
          return JSON.stringify({ error: JSON.parse(e.error).error })
        } else {
          return JSON.stringify({ error: e.error })
        }
      })
    )
    if (error) {
      throw error
    } else {
      console.log('\x1b[33m', result, '\x1b[m')
      return result
    }
  }
}

module.exports = { createClient }
