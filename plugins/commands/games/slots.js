/**
 * SwiftBot - plugins/commands/games/slot.js
 * Slot Machine Game - vs Bot
 * Uses pushName, edit animation, coins
 */

const activeGames = new Map()

const EMOJIS = ['🍒','🍋','🍊','🍇','🔔','💎','7️⃣']
const PAYOUTS = {
  '💎💎💎': 100,
  '7️⃣7️⃣7️⃣': 50,
  '🔔🔔🔔': 25,
  '🍇🍇🍇': 15,
  '🍊🍊🍊': 10,
  '🍋🍋🍋': 8,
  '🍒🍒🍒': 5,
  '🍒🍒': 2,
  '🍒': 1
}

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function spin() {
  return [
    EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
    EMOJIS[Math.floor(Math.random() * EMOJIS.length)]
  ]
}

function getWin(result) {
  const str = result.join('')

  // Check 3 match
  if (PAYOUTS[str]) return { win: true, amount: PAYOUTS[str], type: 'triple' }

  // Check 2 cherries
  const cherries = result.filter(e => e === '🍒').length
  if (cherries === 2) return { win: true, amount: PAYOUTS['🍒🍒'], type: 'double' }
  if (cherries === 1) return { win: true, amount: PAYOUTS['🍒'], type: 'single' }

  return { win: false, amount: 0, type: 'lose' }
}

export default {
  name: 'slot',
  alias: ['slots', 'spin'],
  desc: 'Slot Machine game',
  usage: 'spin|balance|stop',
  category: 'games',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const action = args[0]?.toLowerCase()
    const prefix = await db.get('prefix')

    let game = activeGames.get(sender)
    let coins = await db.get(`slot_coins_${sender}`) || 100

    // 1. HELP
    if (!action) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *SLOT MACHINE*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}slot spin - Spin 5 coins
║ ${prefix}slot balance - Check coins
║ ${prefix}slot stop - Reset game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 💎💎💎 = 100x
║ 7️⃣7️⃣7️⃣ = 50x
║ 🔔🔔🔔 = 25x
║ 🍒🍒🍒 = 5x
║ 🍒🍒 = 2x
║ 🍒 = 1x
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. CHECK BALANCE
    if (action === 'balance' || action === 'bal') {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BALANCE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Coins: ${coins} 💰\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. STOP/RESET
    if (action === 'stop' || action === 'reset') {
      await db.set(`slot_coins_${sender}`, 100)
      activeGames.delete(sender)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Coins reset to 100 💰\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 4. SPIN
    if (action === 'spin') {
      const bet = 5
      if (coins < bet) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not enough coins\n║ Balance: ${coins} 💰\n║ Need: ${bet} 💰\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      coins -= bet
      await db.set(`slot_coins_${sender}`, coins)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SLOT MACHINE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ [ 🎰 | 🎰 ]\n║\n║ Spinning...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      // SPIN ANIMATION
      await new Promise(r => setTimeout(r, 1000))

      const result = spin()
      const winData = getWin(result)

      let winAmount = 0
      if (winData.win) {
        winAmount = bet * winData.amount
        coins += winAmount
        await db.set(`slot_coins_${sender}`, coins)
      }

      const totalWins = await db.get(`slot_wins_${sender}`) || 0
      if (winData.win) await db.set(`slot_wins_${sender}`, totalWins + 1)

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *SLOT MACHINE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ [ ${result[0]} | ${result[1]} | ${result[2]} ]\n║\n║ ${winData.win? `WIN: ${winAmount} 💰` : 'NO WIN'}\n║ Balance: ${coins} 💰\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: resultText })
      } catch {}

      // JACKPOT MESSAGE
      if (winData.amount >= 50) {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🎉 *JACKPOT* 🎉\n║ ${senderName} won ${winAmount}!\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      return
    }

    return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use: spin/balance/stop\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}