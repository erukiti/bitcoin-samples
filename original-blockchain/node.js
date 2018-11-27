const { randomBytes } = require('crypto')

const {
  sha256s,
  createBlock,
  createCoinbaseTx,
  createTx,
  deserialize,
  evaluateTxs,
  validateBlocks
} = require('./blockchain')

class Node {
  constructor(seed = null) {
    this.address = sha256s(seed || randomBytes(32))
    this.pendingTxs = []
    this.blocks = []
    this.peers = []
    this.prevHash = '0000000000000000000000000000000000000000'
  }

  _getAllTx() {
    return [].concat(
      ...this.blocks.map(block => {
        return deserialize(block).data.txs.map(tx => deserialize(tx).data)
      }),
      this.pendingTxs.map(tx => deserialize(tx).data)
    )
  }
  getBalance(address = this.address) {
    const txs = this._getAllTx()
    const wallets = evaluateTxs(txs)
    return wallets[address] || 0
  }

  generate() {
    const coinbaseTx = createCoinbaseTx(this.address)
    const txs = [coinbaseTx.serialized, ...this.pendingTxs]
    const block = createBlock(txs, this.prevHash)
    this.pendingTxs = []
    this.prevHash = block.hash
    this.blocks.push(block.serialized)
    this.broadcast(block.serialized)
  }

  send(sendTo, amount) {
    if (amount > this.getBalance()) {
      throw new Error('Wallet error: Insufficient funds')
    }
    const tx = createTx(this.address, sendTo, amount)
    this.pendingTxs.push(tx.serialized)
    this.broadcast(tx.serialized)
  }

  connect(peer) {
    this.peers.push(peer)
    peer.peers.push(this)
  }

  broadcast(packet) {
    this.peers.forEach(peer => {
      peer.recv(packet)
    })
  }

  _receiveTx(packet) {
    const { from } = deserialize(packet).data
    if (from === null) {
      throw new Error('Invalid Tx: reject CoinbaseTx')
    }
    const txs = this._getAllTx()
    txs.push(deserialize(packet).data)
    evaluateTxs(txs)

    this.pendingTxs.push(packet)
  }

  _receiveBlock(packet) {
    const blocks = [...this.blocks, packet]
    validateBlocks(blocks)

    this.blocks.push(packet)
  }

  recv(packet) {
    const { type } = deserialize(packet).data
    switch (type) {
      case 'tx': {
        this._receiveTx(packet)
        break
      }
      case 'block': {
        this._receiveBlock(packet)
        break
      }
    }
  }
}

module.exports = {
  Node
}
