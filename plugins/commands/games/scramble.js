/**
 * SwiftBot - plugins/commands/games/scramble.js
 * Word Scramble Game - vs Bot
 * Uses pushName, edit animation
 */

const activeGames = new Map()

const WORDS = [
  'javascript','python','whatsapp','computer','keyboard','monitor','internet',
  'facebook','youtube','android','windows','telegram','discord','twitter',
  'elephant','giraffe','dolphin','penguin','kangaroo','butterfly',
  'chocolate','sandwich','pineapple','strawberry','watermelon',
  'mountain','volcano','rainbow','thunder','lightning',
  'football','basketball','volleyball','badminton','cricket'
]

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function scrambleWord(word) {
  const arr = word.split('')
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join('')
}

export default {
  name: 'scramble',
  alias: ['word', 'unscramble'],
  desc: 'Word Scramble game vs Bot',
  usage: 'start|word|stop',
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
║ *WORD SCRAMBLE*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}scramble start - Start game
║ ${prefix}scramble word - Submit answer
║ ${prefix}scramble stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Unscramble the word
║ 3 tries only
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game stopped\n║ Answer: ${game.answer}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. START GAME
    if (action === 'start') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const answer = WORDS[Math.floor(Math.random() * WORDS.length)]
      let scrambled = scrambleWord(answer)

      // Hakikisha scrambled sio sawa na answer
      while (scrambled === answer) {
        scrambled = scrambleWord(answer)
      }

      const gameData = {
        player: sender,
        playerName: senderName,
        answer: answer,
        scrambled: scrambled,
        tries: 0,
        maxTries: 3,
        status: 'playing',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *WORD SCRAMBLE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Word: ${scrambled.toUpperCase()}\n║ Tries: 0/3\n║ Type: ${prefix}scramble answer\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 4. SUBMIT ANSWER
    const guess = action
    if (!game) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No game running\n║ ${prefix}scramble start\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.player!== sender) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not your game\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.status!== 'playing') return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game ended\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    game.tries++

    // CORRECT
    if (guess === game.answer) {
      game.status = 'won'
      const wins = await db.get(`scramble_wins_${sender}`) || 0
      await db.set(`scramble_wins_${sender}`, wins + 1)

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *CORRECT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Answer: ${game.answer.toUpperCase()}\n║ Tries: ${game.tries}/${game.maxTries}\n║ You won!\n╚━━━━━━━━━━━━━━━━━═❒`

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // WRONG - OUT OF TRIES
    if (game.tries >= game.maxTries) {
      game.status = 'lost'
      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *GAME OVER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Answer: ${game.answer.toUpperCase()}\n║ Tries: ${game.tries}/${game.maxTries}\n║ You lost!\n╚━━━━━━━━━━━━━━━━━═❒`

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // WRONG - TRY AGAIN
    const updateText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *WORD SCRAMBLE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Word: ${game.scrambled.toUpperCase()}\n║ Tries: ${game.tries}/${game.maxTries}\n║ Wrong! Try again\n╚━━━━━━━━━━━━━━━━━═❒`

    if (game.msgKey) {
      try {
        await sock.sendMessage(from, { edit: game.msgKey, text: updateText })
      } catch {}
    }
  }
}