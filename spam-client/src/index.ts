#!/usr/bin/env node
import fs from 'fs'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import {
  Keypair,
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js'

/**
 * Connection to the network
 */
let connection: Connection

/**
 * Keypair associated to the fees' payer
 */
let payer: Keypair

/**
 * Establish a connection to the cluster
 */
export async function establishConnection(): Promise<void> {
  const rpcUrl = 'http://localhost:8899'
  connection = new Connection(rpcUrl, 'confirmed')
  const version = await connection.getVersion()
  console.log('Connection to cluster established:', rpcUrl, version)
}

/**
 * Create accounts and fund tokens
 */
export function createAccountsAndFundTokens(): Keypair {
  return Keypair.generate()
}

async function createAccounts(number: number) {
  const accounts = new Array(number)
    .fill(0)
    .map(() => createAccountsAndFundTokens())
  for (let i = 0; i < accounts.length; i++) {
    let fees = LAMPORTS_PER_SOL * 10000
    try {
      const sig = await connection.requestAirdrop(accounts[i].publicKey, fees)
      const result = await connection.confirmTransaction(sig, 'processed');
      if (!result.value.err) {
        fs.appendFile('accounts.json', JSON.stringify(accounts[i], null, 0), function (err) {
          if (err) throw err;
          console.log(`Created and saved ${i + 1} accounts in accounts.json.`);
        });
      }
    } catch (e) {
      console.log(e);
    }
  }
}

/**
 * Tranfer token
 */

export async function TransferToken(account1, account2): Promise<void> {
  account1 = Keypair.fromSecretKey(account1)
  account2 = Keypair.fromSecretKey(account2)
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: account1.publicKey,
      toPubkey: account2.publicKey,
      lamports: 1,
    })
  )

  try {
    console.log(await connection.sendTransaction(transaction, [account1]))
  } catch (e) {
    console.log(e)
  }

  // const hash = await sendAndConfirmTransaction(connection, transaction, [
  //   account1,
  // ])
  // console.log(hash)
}

interface spamOptions {
  duration: number
  rate: number
}

yargs(hideBin(process.argv))
  .command(
    'spam',
    'spam nodes for [duration] seconds at [rate] tps',
    () => { },
    async (argv: spamOptions) => {
      await establishConnection()
      spam(argv)
    }
  )
  .option('duration', {
    alias: 'd',
    type: 'number',
    description: 'The duration (in seconds) to spam the network',
  })
  .option('rate', {
    alias: 'r',
    type: 'number',
    description: 'The rate (in tps) to spam the network at',
  }).argv

function sleep(ms) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve(true)
    }, ms)
  })
}


interface accountsOptions {
  number: number
}

yargs(hideBin(process.argv))
  .command(
    'accounts',
    'generate accounts --number [number]',
    () => { },
    async (argv: accountsOptions) => {
      await establishConnection()
      await createAccounts(argv.number);
    }
  )
  .option('type', {
    alias: 'number',
    type: 'number',
    description: 'number of accounts',
  }).argv

function shuffle(array) {
  let currentIndex = array.length, randomIndex;

  // While there remain elements to shuffle...
  while (currentIndex != 0) {

    // Pick a remaining element...
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}

const spam = async (argv: spamOptions) => {
  let tps = argv.rate
  let duration = argv.duration
  let txCount = tps * duration
  let accounts
  try {
    accounts = fs.readFileSync('accounts.json', 'utf8')
    accounts = accounts.replaceAll('}}}{', '}}},{')
    accounts = '[' + accounts + ']'
    accounts = JSON.parse(accounts)
    console.log(
      `Loaded ${accounts.length} account${accounts.length > 1 ? 's' : ''
      } from accounts.json`
    )
  } catch (error) {
    console.log(`Couldn't load accounts from file: ${error.message}`)
    return
  }
  // Shuffling the accounts array not to run into issue when another client is also spamming at the same time
  shuffle(accounts)
  const filteredAccount = accounts.slice(0, txCount)
  for (var i in filteredAccount) {
    filteredAccount[i]._keypair.secretKey = Uint8Array.from(
      Object.values(filteredAccount[i]._keypair.secretKey)
    )
    filteredAccount[i]._keypair.secretKey = Keypair.fromSecretKey(filteredAccount[i]._keypair.secretKey)
  }
  let k = 0
  let LatestBlockBeforeSpamming: any = await connection.getSlot()
  console.log('LatestBlockBeforeSpamming', LatestBlockBeforeSpamming)
  const waitTime = (1 / tps) * 1000
  let lastTime = Date.now()
  let currentTime
  let sleepTime
  let elapsed
  let account1
  let account2
  let combineSleepTime = 0
  let spamStartTime = Math.floor(Date.now() / 1000)
  for (let i = 0; i < txCount; i++) {
    // console.log('Injected tx:', i + 1)
    if (k >= filteredAccount.length - 1) {
      k = 0
    }
    account1 = filteredAccount[k]._keypair.secretKey
    account2 = filteredAccount[k + 1]._keypair.secretKey
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: account1.publicKey,
        toPubkey: account2.publicKey,
        lamports: 1,
      })
    )

    try {
      await connection.sendTransaction(transaction, [account1], { preflightCommitment: 'processed' })
    } catch (e) {
      console.log(e)
    }

    k++
    currentTime = Date.now()
    elapsed = currentTime - lastTime
    sleepTime = waitTime - elapsed
    if (sleepTime < 0) sleepTime = 0
    await sleep(sleepTime)


    // This technique is by combining all the sleep time below 500 and make sleep the combine time
    // combineSleepTime += sleepTime
    // if (combineSleepTime > 500) {
    //   await sleep(combineSleepTime)
    //   combineSleepTime = 0;
    // }


    lastTime = Date.now()
  }
  let spamEndTime = Math.floor(Date.now() / 1000)
  var timeDiff = spamEndTime - spamStartTime; //in ms
  // strip the ms
  // timeDiff /= 1000;
  // get seconds 
  var seconds = Math.round(timeDiff);

  // let latestBlockHash = await connection.getRecentBlockhashAndContext()
  // console.log(latestBlockHash)
  let LatestBlockAfterSpamming = await connection.getSlot()
  console.log('LatestBlockAfterSpamming', LatestBlockAfterSpamming)
  console.log('totalSpammingTime', seconds)
}


// This technique do pause after hitting tps rate if it is under 1 sec
// But this doesn't completely solve the excatly hitting as user input

// const spam = async (argv: spamOptions) => {
//   let tps = argv.rate
//   let duration = argv.duration
//   let txCount = tps * duration
//   let accounts
//   try {
//     accounts = JSON.parse(fs.readFileSync('accounts.json', 'utf8'))
//     console.log(
//       `Loaded ${accounts.length} account${accounts.length > 1 ? 's' : ''
//       } from accounts.json`
//     )
//   } catch (error) {
//     console.log(`Couldn't load accounts from file: ${error.message}`)
//     return
//   }
//   // Shuffling the accounts array not to run into issue when another client is also spamming at the same time
//   shuffle(accounts)
//   const filteredAccount = accounts.slice(0, txCount)
//   for (var i in filteredAccount) {
//     filteredAccount[i]._keypair.secretKey = Uint8Array.from(
//       Object.values(filteredAccount[i]._keypair.secretKey)
//     )
//     filteredAccount[i]._keypair.secretKey = Keypair.fromSecretKey(filteredAccount[i]._keypair.secretKey)
//   }
//   let k = 0
//   let LatestBlockBeforeSpamming = await connection.getBlock(await connection.getSlot())
//   console.log('LatestBlockBeforeSpamming', LatestBlockBeforeSpamming)
//   let spamStartTime = Date.now()
//   for (let i = 0; i < duration; i++) {
//     const waitTime = (1 / tps) * 1000
//     let lastTime = Date.now()
//     let tik = lastTime;
//     let account1
//     let account2
//     for (let i = 0; i < tps; i++) {
//       // console.log('Injected tx:', i + 1)
//       if (k >= filteredAccount.length - 1) {
//         k = 0
//       }
//       account1 = filteredAccount[k]._keypair.secretKey
//       account2 = filteredAccount[k + 1]._keypair.secretKey
//       const transaction = new Transaction().add(
//         SystemProgram.transfer({
//           fromPubkey: account1.publicKey,
//           toPubkey: account2.publicKey,
//           lamports: 1,
//         })
//       )

//       try {
//         connection.sendTransaction(transaction, [account1])
//         // This delays about half the duration
//         // console.log(await connection.sendTransaction(transaction, [account1]))
//       } catch (e) {
//         console.log(e)
//       }

//       k++
//     }
//     lastTime = Date.now()
//     while (lastTime < tik + 1000) {
//       lastTime = Date.now()
//     }
//     tik = lastTime
//   }
//   let spamEndTime = Date.now()
//   var timeDiff = spamEndTime - spamStartTime; //in ms
//   // strip the ms
//   timeDiff /= 1000;
//   // get seconds 
//   var seconds = Math.round(timeDiff);

//   // let latestBlockHash = await connection.getRecentBlockhashAndContext()
//   // console.log(latestBlockHash)
//   // let LatestBlockAfterSpamming = await connection.getBlock(await connection.getSlot())
//   // console.log('LatestBlockAfterSpamming', LatestBlockAfterSpamming)
//   console.log('totalSpammingTime', seconds)
// }

interface blockOptions {
  output: string
}

yargs(hideBin(process.argv))
  .command(
    'check_tps',
    'get tps --output file.json',
    () => { },
    async (argv: blockOptions) => {
      await establishConnection()
      getTPS(argv)
    }
  )
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'To save the blocks info into a json file',
  }).argv

const getTPS = async (argv: blockOptions) => {
  let startblock
  let output = argv.output
  let startTime
  let endTime
  let endblock
  let totalTransactions = 0
  let blockInfo: any
  let lastestBlock = await connection.getSlot();
  while (true) {
    try {
      blockInfo = await connection.getBlock(lastestBlock)
    } catch (e) {
      break
    }
    blockInfo.transactionsSize = blockInfo.transactions.length
    const filteredTransactions = blockInfo.transactions.filter(transaction => {
      return transaction?.transaction?.message?.instructions[0]?.data === '3Bxs412MvVNQj175'
    })
    if (endblock && filteredTransactions.length === 0) {
      startblock = lastestBlock
      startTime = blockInfo.blockTime
      fs.appendFile(output, JSON.stringify(blockInfo, null, 2), function (err) {
        if (err) throw err;
      });
      break
    }
    if (filteredTransactions.length > 0) {
      totalTransactions = totalTransactions + parseInt(filteredTransactions.length);
      if (!endblock) {
        endblock = lastestBlock
        endTime = blockInfo.blockTime
      }
      fs.appendFile(output, JSON.stringify(blockInfo, null, 2), function (err) {
        if (err) throw err;
      });
    }
    lastestBlock--
  }
  let averageTime = endTime - startTime;
  console.log('startBlock', startblock, 'endBlock', endblock)
  console.log(`total time`, averageTime)
  console.log(`total txs:`, totalTransactions)
  console.log(`avg tps`, totalTransactions / averageTime)
}
