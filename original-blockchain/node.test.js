const { Node } = require('./node')

const {
  deserialize,
  createTx,
  createCoinbaseTx,
  createBlock
} = require('./blockchain')

test('Node1', () => {
  const node = new Node()
  expect(node.getBalance()).toBe(0)

  node.generate()
  expect(node.getBalance()).toBe(50)

  node.send('fuga', 10)
  expect(node.getBalance()).toBe(40)
  expect(node.getBalance('fuga')).toBe(10)

  node.generate()
  expect(node.getBalance()).toBe(90)
  expect(node.getBalance('fuga')).toBe(10)
})

describe('connected nodes', () => {
  test('sync block', () => {
    const node1 = new Node()
    const node2 = new Node()
    node1.connect(node2)
    expect(node1.blocks.length).toBe(0)
    expect(node2.blocks.length).toBe(0)
    node1.generate()
    expect(node1.blocks.length).toBe(1)
    expect(node2.blocks.length).toBe(1)
    expect(node1.getBalance()).toBe(50)
    expect(node1.getBalance(node2.address)).toBe(0)
    expect(node2.getBalance(node1.address)).toBe(50)
    expect(node2.getBalance()).toBe(0)
  })

  test('sync tx', () => {
    const node1 = new Node()
    const node2 = new Node()
    node1.connect(node2)
    node1.generate()
    node1.send(node2.address, 10)
    expect(node1.getBalance()).toBe(40)
    expect(node1.getBalance(node2.address)).toBe(10)
    expect(node2.getBalance(node1.address)).toBe(40)
    expect(node2.getBalance()).toBe(10)
  })

  test('invalid tx', () => {
    const node = new Node()
    expect(() =>
      node.recv(createTx(node.address, 'hoge', 100000).serialized)
    ).toThrowError('Invalid Tx: wallet is deficit')
    expect(node.pendingTxs).toEqual([])
  })

  test('reject CoinbaseTx', () => {
    const node = new Node()
    expect(() => node.recv(createCoinbaseTx('hoge').serialized)).toThrowError(
      'Invalid Tx: reject CoinbaseTx'
    )
    expect(node.pendingTxs).toEqual([])
  })

  test('invalid block', () => {
    const node = new Node()
    expect(() =>
      node.recv(
        createBlock(
          [createTx(node.address, 'hoge', 100000).serialized],
          '0000000000000000000000000000000000000000'
        ).serialized
      )
    ).toThrowError('Invalid Block: first Tx must be CoinbaseTx')
    expect(node.blocks.length).toEqual(0)
    expect(node.pendingTxs).toEqual([])
  })
})
