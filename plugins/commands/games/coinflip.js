/**
 * SwiftBot - plugins/commands/games/coinflip.js
 * Coin Flip Game - vs Bot
 * Uses pushName, edit animation, betting
 */

const activeGames = new Map()

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function flipCoin() {
  return Math.random() < 0.5? 'heads' : 'tails'
}

function getEmoji(side) {
  return side === 'heads'? '👑' : '🪙'
}

export default {
  name: 'coinflip',
  alias: ['cf', 'flip', 'coin'],
  desc: 'Coin Flip game vs Bot',
  usage: 'heads|tails|balance|stop',
  category: 'games',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const action = args[0]?.toLowerCase()
    const prefix = await db.get('prefix')

    let coins = await db.get(`coin_coins_${sender}`) || 100

    // 1. HELP
    if (!action) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *COIN FLIP*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}coinflip heads - Bet on Heads
║ ${prefix}coinflip tails - Bet on Tails
║ ${prefix}coinflip balance - Check coins
║ ${prefix}coinflip stop - Reset coins
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Bet: 10 coins per flip
║ Win: 2x = 20 coins
║ Heads: 👑 | Tails: 🪙
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
      await db.set(`coin_coins_${sender}`, 100)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Coins reset to 100 💰\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 4. FLIP
    if (action === 'heads' || action === 'h' || action === 'tails' || action === 't') {
      const bet = 10
      if (coins < bet) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not enough coins\n║ Balance: ${coins} 💰\n║ Need: ${bet} 💰\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      const choice = (action === 'heads' || action === 'h')? 'heads' : 'tails'
      const choiceEmoji = getEmoji(choice)

      coins -= bet
      await db.set(`coin_coins_${sender}`, coins)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *COIN FLIP*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Bet: ${choiceEmoji} ${choice}\n║\n║ Flipping...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      // FLIP ANIMATION
      await new Promise(r => setTimeout(r, 1500))

      const result = flipCoin()
      const resultEmoji = getEmoji(result)
      const won = choice === result

      let winAmount = 0
      if (won) {
        winAmount = bet * 2
        coins += winAmount
        await db.set(`coin_coins_${sender}`, coins)
        const wins = await db.get(`coin_wins_${sender}`) || 0
        await db.set(`coin_wins_${sender}`, wins + 1)
      }

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *COIN FLIP*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Bet: ${choiceEmoji} ${choice}\n║ Result: ${resultEmoji} ${result}\n║\n║ ${won? `WIN: ${winAmount} 💰` : 'LOST'}\n║ Balance: ${coins} 💰\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: resultText })
      } catch {}

      // STREAK BONUS
      if (won) {
        const streak = await db.get(`coin_streak_${sender}`) || 0
        await db.set(`coin_streak_${sender}`, streak + 1)

        if ((streak + 1) % 5 === 0) {
          const bonus = 25
          coins += bonus
          await db.set(`coin_coins_${sender}`, coins)
          await sock.sendMessage(from, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🔥 *STREAK BONUS* 🔥\n║ ${streak + 1} wins in a row\n║ Bonus: +${bonus} 💰\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        }
      } else {
        await db.set(`coin_streak_${sender}`, 0)
      }

      return
    }

    return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use: heads/tails/balance\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}