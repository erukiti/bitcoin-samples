const { createHash } = require('crypto')

const sha256s = buf => {
  const hash = createHash('sha256')
  // hash はハッシュ値を扱えるストリームオブジェクト
  hash.write(buf)
  return hash
    .digest()
    .toString('hex')
    .substr(-40)
}

const serialize = (type, data) => JSON.stringify({ type, ...data })

const createPacket = (type, data) => {
  const serialized = serialize(type, data)
  const hash = sha256s(serialized)
  return { serialized, hash }
}

const createTx = (from, sendTo, amount) => {
  return createPacket('tx', { from, sendTo, amount })
}

const createCoinbaseTx = sendTo => {
  return createTx(null, sendTo, 50)
}

const createBlock = (txs, prevHash) => {
  return createPacket('block', { txs, prevHash })
}

const deserialize = serialized => {
  const hash = sha256s(serialized)
  const data = JSON.parse(serialized)
  return { hash, data }
}

const createInvalidTxError = message => new Error(`Invalid Tx: ${message}`)

const isCoinbaseTx = tx => tx.from === null

const evaluateTxs = txs => {
  const wallets = {}

  txs.forEach(tx => {
    if (tx.from === null && tx.amount !== 50) {
      throw createInvalidTxError('CoinbaseTx amount must be 50')
    }

    if (!isCoinbaseTx(tx)) {
      wallets[tx.from] = (wallets[tx.from] || 0) - tx.amount
      if (wallets[tx.from] < 0) {
        throw createInvalidTxError(
          `wallet is deficit ${tx.from}'s wallet ${wallets[tx.from]}`
        )
      }
    }

    wallets[tx.sendTo] = (wallets[tx.sendTo] || 0) + tx.amount
  })

  return wallets
}

const createInvalidBlockError = message =>
  new Error(`Invalid Block: ${message}`)

const validateBlocks = serializedBlocks => {
  let allTx = []
  let prevHash = '0000000000000000000000000000000000000000'

  serializedBlocks.forEach(serializedBlock => {
    const { data, hash } = deserialize(serializedBlock)
    if (prevHash !== data.prevHash) {
      throw createInvalidBlockError(
        `block hash error: ${prevHash} !== ${data.prevHash}`
      )
    }
    prevHash = hash

    const txs = data.txs.map(serialized => {
      const tx = deserialize(serialized).data
      if (tx.type !== 'tx') {
        throw createInvalidBlockError(`Tx packet type error: ${tx.type} !== tx`)
      }
      return tx
    })

    if (txs.length < 1) {
      throw createInvalidBlockError('Empty Txs')
    }
    if (!isCoinbaseTx(txs[0])) {
      throw createInvalidBlockError('first Tx must be CoinbaseTx')
    }
    if (txs.length > 1 && !txs.slice(1).every(tx => !isCoinbaseTx(tx))) {
      throw createInvalidBlockError('Illegal CoinbaseTx')
    }
    allTx = allTx.concat(txs)
  })

  return evaluateTxs(allTx)
}

module.exports = {
  sha256s,
  serialize,
  createPacket,
  createTx,
  createCoinbaseTx,
  createBlock,
  deserialize,
  evaluateTxs,
  validateBlocks
}
