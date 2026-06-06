/**
 * SwiftBot - plugins/commands/games/guess.js
 * Number Guess Game - vs Bot
 * Uses pushName, edit animation
 */

const activeGames = new Map()

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function getHint(guess, answer) {
  const diff = Math.abs(guess - answer)
  if (guess === answer) return 'correct'
  if (diff <= 5) return 'hot'
  if (diff <= 15) return 'warm'
  if (guess < answer) return 'higher'
  return 'lower'
}

export default {
  name: 'guess',
  alias: ['number', 'ng'],
  desc: 'Guess the number 1-100 vs Bot',
  usage: 'start|1-100|stop',
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
║ *NUMBER GUESS*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}guess start - Start game
║ ${prefix}guess 50 - Make guess
║ ${prefix}guess stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Range: 1-100
║ Tries: 7
║ Hints: Hot/Warm/Higher/Lower
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game stopped\n║ Answer was: ${game.answer}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. START GAME
    if (action === 'start') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const answer = Math.floor(Math.random() * 100) + 1
      const gameData = {
        player: sender,
        playerName: senderName,
        answer: answer,
        tries: 0,
        maxTries: 7,
        status: 'playing',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUMBER GUESS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Range: 1-100\n║ Tries: 0/7\n║ Guess now!\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 4. MAKE GUESS
    const guess = parseInt(action)
    if (isNaN(guess) || guess < 1 || guess > 100) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use 1-100 only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!game) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No game running\n║ ${prefix}guess start\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.player!== sender) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not your game\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.status!== 'playing') return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game ended\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    game.tries++
    const hint = getHint(guess, game.answer)

    // WIN
    if (hint === 'correct') {
      game.status = 'won'
      const wins = await db.get(`guess_wins_${sender}`) || 0
      await db.set(`guess_wins_${sender}`, wins + 1)

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *CORRECT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Answer: ${game.answer}\n║ Tries: ${game.tries}/${game.maxTries}\n║ You won!\n╚━━━━━━━━━━━━━━━━━═❒`

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // LOSE
    if (game.tries >= game.maxTries) {
      game.status = 'lost'
      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *GAME OVER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Answer: ${game.answer}\n║ Tries: ${game.tries}/${game.maxTries}\n║ You lost!\n╚━━━━━━━━━━━━━━━━━═❒`

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // HINT
    let hintEmoji = ''
    let hintText = ''
    if (hint === 'hot') {
      hintEmoji = '🔥'
      hintText = 'Very close'
    } else if (hint === 'warm') {
      hintEmoji = '🌡️'
      hintText = 'Close'
    } else if (hint === 'higher') {
      hintEmoji = '⬆️'
      hintText = 'Go higher'
    } else {
      hintEmoji = '⬇️'
      hintText = 'Go lower'
    }

    const updateText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUMBER GUESS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Guess: ${guess}\n║ Tries: ${game.tries}/${game.maxTries}\n║ Hint: ${hintEmoji} ${hintText}\n╚━━━━━━━━━━━━━━━━━═❒`

    if (game.msgKey) {
      try {
        await sock.sendMessage(from, { edit: game.msgKey, text: updateText })
      } catch {}
    }
  }
}