const { createClient } = require('./client')

const newAddress = async cl => {
  const address = await cl('getnewaddress', 'my address')

  console.log(address)
}

const info = async cl => {
  const addresses = await cl('getaddressesbylabel', 'my address')
  const balance = await cl('getbalance')
  const blockchainInfo = await cl('getblockchaininfo')

  console.log(`addresses: [${Object.keys(addresses).join(', ')}]`)
  console.log(`balance: ${balance}`)
  console.log(`block height: ${blockchainInfo.blocks}`)
}

const send = async (cl, address, amount) => {
  const txid = await cl('sendtoaddress', address, amount)
  console.log(txid)
}

const dump = async (cl, address) => {
  const priv = await cl('dumpprivkey', address)
  console.log(priv)
}

const importPriv = async (cl, priv) => {
  await cl('importprivkey', priv, 'my address')
}

const commands = { newAddress, info, send, dump, importPriv }

const wallet = async () => {
  if (process.argv.length < 3) {
    console.log('usage: wallet <command> [option...]')
    process.exit(1)
  }

  const command = process.argv[2]
  if (!(command in commands)) {
    console.log(`unknown command: ${command}`)
    process.exit(1)
  }

  const conf = {
    host: 'localhost',
    rpcport: 18332,
    user: 'u',
    pass: 'p'
  }
  const cl = createClient(conf)
  await commands[command](cl, ...process.argv.slice(3))
}

wallet().catch(err => console.error(err))
