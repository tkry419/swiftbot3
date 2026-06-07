/**
 * SwiftBot - plugins/commands/fun/avihack.js
 * Fake Aviator Hack - Predict Exact Bet Time Prank
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function createProgressBar(percent) {
  const filled = Math.floor(percent / 5)
  const empty = 20 - filled
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function formatCash(num) {
  return '$' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function getTimePlus(seconds) {
  const now = new Date()
  now.setSeconds(now.getSeconds() + seconds)
  return now.toLocaleTimeString('en-US', { hour12: false })
}

const HACK_STEPS = [
  'Connecting to Aviator servers...',
  'Bypassing firewall...',
  'Accessing game algorithm...',
  'Decrypting round seed...',
  'Analyzing crash patterns...',
  'Calculating next multiplier...',
  'Scanning server response time...',
  'Injecting prediction module...',
  'Syncing with game clock...',
  'AI prediction: LOADING',
  'Probability matrix: COMPLETE',
  'Crash point detected...',
  'Optimal bet time: CALCULATED',
  'Confidence level: 99.7%',
  'Signal strength: MAXIMUM',
  'HACK SUCCESSFUL'
]

export default {
  name: 'avihack',
  alias: ['aviatorhack', 'predict', 'crashhack'],
  desc: 'Fake Aviator hack - predicts exact time to bet and win',
  usage: '<amount>',
  category: 'fun',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    // 1. CHECK BET AMOUNT
    const input = args[0]
    let betAmount = rand(10, 100)

    if (input) {
      const num = parseFloat(input.replace(/[^0-9.]/g, ''))
      if (num && num > 0) {
        betAmount = num
      }
    }

    // 2. GENERATE FAKE PREDICTION DATA
    const predictedMultiplier = rand(8.5, 120.5)
    const betTimeSeconds = rand(5, 45)
    const exactBetTime = getTimePlus(betTimeSeconds)
    const cashoutTime = getTimePlus(betTimeSeconds + rand(3, 8))
    const winAmount = betAmount * predictedMultiplier
    const profit = winAmount - betAmount
    const confidence = rand(97.5, 99.9)

    // 3. START HACK MESSAGE
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *AVIATOR HACK V3.7* 💻\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${senderName}\n║ Bet Amount: ${formatCash(betAmount)}\n║ Target: Aviator Servers\n║ Status: INITIALIZING\n║\n║ Connecting to game...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await sleep(2000)

    // 4. SPAM HACK PROGRESS WITH BARS
    for (let i = 0; i < HACK_STEPS.length; i++) {
      const percent = Math.floor(((i + 1) / HACK_STEPS.length) * 100)
      const bar = createProgressBar(percent)
      const signal = rand(85, 100).toFixed(1)
      const ping = rand(12, 45)

      await sleep(750)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *HACKING AVIATOR* 🔓\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ >> ${HACK_STEPS[i]}\n║\n║ ${bar}\n║\n║ 📡 Signal: ${signal}%\n║ 📶 Ping: ${ping}ms\n║ 🔐 Encryption: BYPASSED\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }

    await sleep(1500)

    // 5. PREDICTION RESULT - EXACT TIME TO BET
    const roundNumber = rand(100000, 999999)
    const seedHash = Math.random().toString(16).slice(2, 18).toUpperCase()
    const accuracy = rand(985, 999) / 10

    const prediction = [
      `🎯 Next Round: #${roundNumber}`,
      `⏰ BET AT: ${exactBetTime}`,
      `💰 Bet Amount: ${formatCash(betAmount)}`,
      `📈 Predicted Multiplier: ${predictedMultiplier.toFixed(2)}x`,
      `💵 Expected Win: ${formatCash(winAmount)}`,
      `💚 Expected Profit: ${formatCash(profit)}`,
      `🛑 CASH OUT AT: ${cashoutTime}`,
      `🎲 Crash Point: ${predictedMultiplier.toFixed(2)}x`,
      `🔑 Seed Hash: ${seedHash}`,
      `📊 Confidence: ${confidence.toFixed(2)}%`,
      `✅ Accuracy: ${accuracy.toFixed(1)}%`,
      `🌍 Server: Aviator-Live-${rand(1, 9)}`
    ]

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PREDICTION COMPLETE* ✅\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Status: READY TO WIN\n║\n║ ${prediction.join('\n║ ')}\n║\n║ ⚠️ BET NOW FOR MAXIMUM PROFIT\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(2000)

    // 6. SIMULATE GAME RESULT
    const actualMultiplier = predictedMultiplier - rand(0.1, 0.8)
    const actualWin = betAmount * actualMultiplier
    const actualProfit = actualWin - betAmount

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *ROUND RESULT* ✈️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Round: #${roundNumber}\n║ Bet Time: ${exactBetTime} ✓\n║ Cash Out: ${cashoutTime} ✓\n║\n║ Predicted: ${predictedMultiplier.toFixed(2)}x\n║ Actual: ${actualMultiplier.toFixed(2)}x\n║\n║ 💰 Bet: ${formatCash(betAmount)}\n║ 💵 Won: ${formatCash(actualWin)}\n║ 💚 Profit: ${formatCash(actualProfit)}\n║\n║ 🎯 PREDICTION ACCURATE!\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *HACK REPORT* 💻\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Operator: ${senderName}\n║ Bet: ${formatCash(betAmount)}\n║ Won: ${formatCash(actualWin)}\n║ Profit: ${formatCash(actualProfit)}\n║\n║ Money sent to account!\n║ Algorithm cracked!\n║\n║ Just kidding! It's a prank 😂\n║ No real hack exists\n║ Aviator is random - play fair\n║ This is just for fun bro\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}