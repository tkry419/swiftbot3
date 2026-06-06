/**
 * SwiftBot - plugins/commands/games/dice.js
 * Dice Game - Roll dice vs Bot or Friend
 * Uses pushName, edit animation
 */

const activeGames = new Map()

const DICE_EMOJI = ['⚀','⚁','⚂','⚃','⚄','⚅']

function getName(msg, jid) {
  if (jid === 'bot') return 'Bot'
  return msg.pushName || jid.split('@')[0]
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1
}

export default {
  name: 'dice',
  alias: ['roll', 'dadu'],
  desc: 'Dice game vs Bot or Friend',
  usage: 'bot|@user|stop',
  category: 'games',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const action = args[0]?.toLowerCase()
    const prefix = await db.get('prefix')

    let game = activeGames.get(from)

    // 1. HELP
    if (!action) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *DICE GAME*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}dice bot - vs Bot
║ ${prefix}dice @user - vs Friend
║ ${prefix}dice stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Highest number wins
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. STOP GAME
    if (action === 'stop') {
      if (!game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No active game\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      activeGames.delete(from)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game stopped\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. START VS BOT
    if (action === 'bot') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const gameData = {
        player1: sender,
        player1Name: senderName,
        player2: 'bot',
        player2Name: 'Bot',
        vsBot: true,
        status: 'rolling',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DICE VS BOT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName} vs Bot\n║ Rolling...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key

      // ROLL ANIMATION
      await new Promise(r => setTimeout(r, 1500))

      const p1Roll = rollDice()
      const p2Roll = rollDice()

      let resultText = ''
      if (p1Roll > p2Roll) {
        const wins = await db.get(`dice_wins_${sender}`) || 0
        await db.set(`dice_wins_${sender}`, wins + 1)
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *YOU WIN*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName}: ${DICE_EMOJI[p1Roll-1]} ${p1Roll}\n║ Bot: ${DICE_EMOJI[p2Roll-1]} ${p2Roll}\n╚━━━━━━━━━━━━━━━━━═❒`
      } else if (p2Roll > p1Roll) {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *BOT WINS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName}: ${DICE_EMOJI[p1Roll-1]} ${p1Roll}\n║ Bot: ${DICE_EMOJI[p2Roll-1]} ${p2Roll}\n╚━━━━━━━━━━━━━━━━━═❒`
      } else {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *DRAW*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName}: ${DICE_EMOJI[p1Roll-1]} ${p1Roll}\n║ Bot: ${DICE_EMOJI[p2Roll-1]} ${p2Roll}\n╚━━━━━━━━━━━━━━━━━═❒`
      }

      if (gameData.msgKey) {
        try {
          await sock.sendMessage(from, { edit: gameData.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // 4. START VS FRIEND
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    if (mentioned[0]) {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const opponent = mentioned[0]
      const opponentName = opponent.split('@')[0]

      if (opponent === sender) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Cannot play yourself\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const gameData = {
        player1: sender,
        player1Name: senderName,
        player2: opponent,
        player2Name: opponentName,
        vsBot: false,
        status: 'rolling',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DICE 1V1*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName} vs ${opponentName}\n║ Rolling...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key

      // ROLL ANIMATION
      await new Promise(r => setTimeout(r, 1500))

      const p1Roll = rollDice()
      const p2Roll = rollDice()

      let resultText = ''
      if (p1Roll > p2Roll) {
        const wins = await db.get(`dice_wins_${sender}`) || 0
        await db.set(`dice_wins_${sender}`, wins + 1)
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *WINNER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName}: ${DICE_EMOJI[p1Roll-1]} ${p1Roll}\n║ ${opponentName}: ${DICE_EMOJI[p2Roll-1]} ${p2Roll}\n║ Winner: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
      } else if (p2Roll > p1Roll) {
        const wins = await db.get(`dice_wins_${opponent}`) || 0
        await db.set(`dice_wins_${opponent}`, wins + 1)
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *WINNER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName}: ${DICE_EMOJI[p1Roll-1]} ${p1Roll}\n║ ${opponentName}: ${DICE_EMOJI[p2Roll-1]} ${p2Roll}\n║ Winner: ${opponentName}\n╚━━━━━━━━━━━━━━━━━═❒`
      } else {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *DRAW*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName}: ${DICE_EMOJI[p1Roll-1]} ${p1Roll}\n║ ${opponentName}: ${DICE_EMOJI[p2Roll-1]} ${p2Roll}\n╚━━━━━━━━━━━━━━━━━═❒`
      }

      if (gameData.msgKey) {
        try {
          await sock.sendMessage(from, { edit: gameData.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use: bot or @user\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}