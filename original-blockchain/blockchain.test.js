const {
  sha256s,
  serialize,
  createPacket,
  createTx,
  createCoinbaseTx,
  createBlock,
  deserialize,
  evaluateTxs,
  validateBlocks
} = require('./blockchain')

test('sha256', () => {
  expect(sha256s('hoge')).toBe('642bf4d160aabb76f56c0069c71ea25b1e926825')
})

test('serialize', () => {
  expect(serialize('hoge', { fuga: 'ふが' })).toBe(
    '{"type":"hoge","fuga":"ふが"}'
  )
})

test('createPacket', () => {
  expect(createPacket('hoge', { fuga: 'ふが' })).toEqual({
    hash: 'aaba4230b6fffc4c2a828e82899b35dc56b2f2e6',
    serialized: '{"type":"hoge","fuga":"ふが"}'
  })
})

const txPacket = {
  hash: '078730a4dbd572483608e76fa6971a28a0dfd492',
  serialized: '{"type":"tx","from":"hoge","sendTo":"fuga","amount":10}'
}

const coinbasePacket = {
  hash: 'd6c00913690b37c2adf997cc6a24b02e3bb2bc88',
  serialized: '{"type":"tx","from":null,"sendTo":"hoge","amount":50}'
}

it('createTx', () => {
  expect(createTx('hoge', 'fuga', 10)).toEqual(txPacket)
})

it('createCoinbaseTx', () => {
  expect(createCoinbaseTx('hoge')).toEqual(coinbasePacket)
})

test('createBlock', () => {
  const prevHash = 'deadbeaf'
  const packet = createPacket(
    'block',
    {
      txs: [coinbasePacket, txPacket],
      prevHash
    },
    {
      txs: [coinbasePacket, txPacket],
      prevHash
    }
  )
  expect(createBlock([coinbasePacket, txPacket], prevHash)).toEqual(packet)
})

test('deserialize', () => {
  expect(deserialize('{"type":"hoge","fuga":"ふが"}')).toEqual({
    hash: 'aaba4230b6fffc4c2a828e82899b35dc56b2f2e6',
    data: {
      fuga: 'ふが',
      type: 'hoge'
    }
  })
})

describe('evaluateTxs', () => {
  test('valid: empty array', () => {
    expect(evaluateTxs([])).toEqual({})
  })

  test('valid: coinbaseTx', () => {
    expect(evaluateTxs([{ from: null, sendTo: 'hoge', amount: 50 }])).toEqual({
      hoge: 50
    })
  })

  test('invalid: wrong coinbaseTx', () => {
    expect(() =>
      evaluateTxs([{ from: null, sendTo: 'hoge', amount: 100 }])
    ).toThrowError('CoinbaseTx amount must be 50')
  })

  test('invlaid: Tx only', () => {
    expect(() =>
      evaluateTxs([{ from: 'hoge', sendTo: 'fuga', amount: 1 }])
    ).toThrowError('wallet is deficit')
  })

  test('valid: coinbaseTx + Tx', () => {
    expect(
      evaluateTxs([
        { from: null, sendTo: 'hoge', amount: 50 },
        { from: 'hoge', sendTo: 'fuga', amount: 50 }
      ])
    ).toEqual({ hoge: 0, fuga: 50 })
  })

  test('invalid: coinbaseTx + Tx', () => {
    expect(() =>
      evaluateTxs([
        { from: null, sendTo: 'hoge', amount: 50 },
        { from: 'hoge', sendTo: 'fuga', amount: 50 },
        { from: 'hoge', sendTo: 'piyo', amount: 50 }
      ])
    ).toThrowError('wallet is deficit')

    expect(() =>
      evaluateTxs([
        { from: null, sendTo: 'hoge', amount: 50 },
        { from: 'hoge', sendTo: 'fuga', amount: 51 }
      ])
    ).toThrowError('wallet is deficit')

    expect(() =>
      evaluateTxs([
        { from: null, sendTo: 'hoge', amount: 50 },
        { from: 'fuga', sendTo: 'piyo', amount: 1 }
      ])
    ).toThrowError('wallet is deficit')
  })
})

describe('validateBlocks', () => {
  const genesisHash = '0000000000000000000000000000000000000000'

  test('valid: 1 block (coinbase)', () => {
    expect(() =>
      validateBlocks([
        createBlock([createCoinbaseTx('hoge').serialized], genesisHash)
          .serialized
      ])
    )
  })

  test('valid: 1 block(coinbase + send', () => {
    expect(() =>
      validateBlocks([
        createBlock(
          [
            createCoinbaseTx('hoge').serialized,
            createTx('hoge', 'fuga', 50).serialized
          ],
          genesisHash
        ).serialized
      ])
    )
  })

  test('valid: 2block', () => {
    const block1 = createBlock(
      [
        createCoinbaseTx('hoge').serialized,
        createTx('hoge', 'fuga', 25).serialized
      ],
      genesisHash
    )
    const block2 = createBlock(
      [
        createCoinbaseTx('other').serialized,
        createTx('hoge', 'piyo', 25).serialized
      ],
      block1.hash
    )
    expect(() => validateBlocks([block1.serialized, block2.serialized]))
  })

  test('invalid: 1block (no Tx)', () => {
    expect(() =>
      validateBlocks([createBlock([], genesisHash).serialized])
    ).toThrowError(`Invalid Block: Empty Txs`)
  })

  test('invalid: 1block (no CoinbaseTx)', () => {
    expect(() =>
      validateBlocks([
        createBlock([createTx('hoge', 'fuga', 1).serialized], genesisHash)
          .serialized
      ])
    ).toThrowError(`Invalid Block: first Tx must be CoinbaseTx`)
  })

  test('invalid: 1block (dup CoinbaseTx)', () => {
    expect(() =>
      validateBlocks([
        createBlock(
          [
            createCoinbaseTx('hoge').serialized,
            createCoinbaseTx('hoge').serialized
          ],
          genesisHash
        ).serialized
      ])
    ).toThrowError(`Invalid Block: Illegal CoinbaseTx`)
  })

  test('invalid: 1block (wrong prevHash)', () => {
    expect(() =>
      validateBlocks([
        createBlock([createCoinbaseTx('hoge').serialized], 'wronghash')
          .serialized
      ])
    ).toThrowError('Invalid Block: block hash error:')
  })

  test('invalid: 1block (wrong tx type)', () => {
    const tx = createPacket('wrongTx', {
      from: 'hoge',
      sendTo: 'fuga',
      amount: 50
    }).serialized
    expect(() =>
      validateBlocks([
        createBlock([createCoinbaseTx('hoge').serialized, tx], genesisHash)
          .serialized
      ])
    ).toThrowError('Invalid Block: Tx packet type error:')
  })

  test('invalid: 2block (duplicate send)', () => {
    const block1 = createBlock(
      [
        createCoinbaseTx('hoge').serialized,
        createTx('hoge', 'fuga', 50).serialized
      ],
      genesisHash
    )
    const block2 = createBlock(
      [
        createCoinbaseTx('other').serialized,
        createTx('hoge', 'piyo', 50).serialized
      ],
      block1.hash
    )
    expect(() =>
      validateBlocks([block1.serialized, block2.serialized])
    ).toThrowError('Invalid Tx: wallet is deficit')
  })
})
