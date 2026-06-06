/**
 * SwiftBot - plugins/commands/games/hangman.js
 * Hangman Game - vs Bot
 * Uses pushName, edit animation
 */

const activeGames = new Map()

const WORDS = [
  'javascript','python','whatsapp','computer','keyboard','monitor','internet',
  'facebook','youtube','android','windows','telegram','discord','twitter',
  'elephant','giraffe','dolphin','penguin','kangaroo','butterfly',
  'chocolate','sandwich','pineapple','strawberry','watermelon',
  'mountain','volcano','rainbow','thunder','lightning',
  'football','basketball','volleyball','badminton','cricket',
  'developer','programming','database','algorithm','function'
]

const HANGMAN_STAGES = [
  `╔═━━━━━━━━━━━━━━━━═❒
║ ┌─────┐
║ │ │
║ │
║ │
║ │
║ │
╚━━━━━━━━━━━━━━━━━═❒`,
  `╔═━━━━━━━━━━━━━━━━═❒
║ ┌─────┐
║ │ │
║ 😵 │
║ │
║ │
║ │
╚━━━━━━━━━━━━━━━━━═❒`,
  `╔═━━━━━━━━━━━━━━━━═❒
║ ┌─────┐
║ │ │
║ 😵 │
║ │ │
║ │
║ │
╚━━━━━━━━━━━━━━━━━═❒`,
  `╔═━━━━━━━━━━━━━━━━═❒
║ ┌─────┐
║ │ │
║ 😵 │
║ /│ │
║ │
║ │
╚━━━━━━━━━━━━━━━━━═❒`,
  `╔═━━━━━━━━━━━━━━━━═❒
║ ┌─────┐
║ │ │
║ 😵 │
║ /│\\ │
║ │
║ │
╚━━━━━━━━━━━━━━━━━═❒`,
  `╔═━━━━━━━━━━━━━━━━═❒
║ ┌─────┐
║ │ │
║ 😵 │
║ /│\\ │
║ / │
║ │
╚━━━━━━━━━━━━━━━━━═❒`,
  `╔═━━━━━━━━━━━━━━━━═❒
║ ┌─────┐
║ │ │
║ 😵 │
║ /│\\ │
║ / \\ │
║ │
╚━━━━━━━━━━━━━━━━━═❒`
]

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function displayWord(word, guessed) {
  return word.split('').map(letter => guessed.includes(letter)? letter.toUpperCase() : '_').join(' ')
}

export default {
  name: 'hangman',
  alias: ['hang', 'hm'],
  desc: 'Hangman game vs Bot',
  usage: 'start|a-z|stop',
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
║ *HANGMAN*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}hangman start - Start game
║ ${prefix}hangman a - Guess letter A
║ ${prefix}hangman stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Guess the word
║ 6 wrong guesses = lose
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game stopped\n║ Word was: ${game.word.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. START GAME
    if (action === 'start') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const word = WORDS[Math.floor(Math.random() * WORDS.length)]
      const gameData = {
        player: sender,
        playerName: senderName,
        word: word,
        guessed: [],
        wrong: 0,
        maxWrong: 6,
        status: 'playing',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *HANGMAN*\n╚━━━━━━━━━━━━━━━━━═❒\n${HANGMAN_STAGES[0]}\n╔═━━━━━━━━━━━━━━━━═❒\n║ Word: ${displayWord(word, [])}\n║ Wrong: 0/6\n║ Guessed: -\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 4. GUESS LETTER
    const letter = action
    if (!game) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No game running\n║ ${prefix}hangman start\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.player!== sender) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not your game\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.status!== 'playing') return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game ended\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (letter.length!== 1 ||!/[a-z]/.test(letter)) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use single letter a-z\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (game.guessed.includes(letter)) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Already guessed ${letter.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    game.guessed.push(letter)

    // CHECK IF CORRECT
    if (!game.word.includes(letter)) {
      game.wrong++
    }

    const display = displayWord(game.word, game.guessed)
    const won =!display.includes('_')
    const lost = game.wrong >= game.maxWrong

    // WIN
    if (won) {
      game.status = 'won'
      const wins = await db.get(`hangman_wins_${sender}`) || 0
      await db.set(`hangman_wins_${sender}`, wins + 1)

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *YOU WIN*\n╚━━━━━━━━━━━━━━━━━═❒\n${HANGMAN_STAGES[game.wrong]}\n╔═━━━━━━━━━━━━━━━━═❒\n║ Word: ${game.word.toUpperCase()}\n║ Wrong: ${game.wrong}/${game.maxWrong}\n║ Guessed: ${game.guessed.map(l=>l.toUpperCase()).join(',')}\n╚━━━━━━━━━━━━━━━━━═❒`

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // LOSE
    if (lost) {
      game.status = 'lost'
      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *GAME OVER*\n╚━━━━━━━━━━━━━━━━━═❒\n${HANGMAN_STAGES[game.wrong]}\n╔═━━━━━━━━━━━━━━━━═❒\n║ Word: ${game.word.toUpperCase()}\n║ Wrong: ${game.wrong}/${game.maxWrong}\n║ Guessed: ${game.guessed.map(l=>l.toUpperCase()).join(',')}\n╚━━━━━━━━━━━━━━━━━═❒`

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // UPDATE
    const updateText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *HANGMAN*\n╚━━━━━━━━━━━━━━━━━═❒\n${HANGMAN_STAGES[game.wrong]}\n╔═━━━━━━━━━━━━━━━━═❒\n║ Word: ${display}\n║ Wrong: ${game.wrong}/${game.maxWrong}\n║ Guessed: ${game.guessed.map(l=>l.toUpperCase()).join(',')}\n╚━━━━━━━━━━━━━━━━━═❒`

    if (game.msgKey) {
      try {
        await sock.sendMessage(from, { edit: game.msgKey, text: updateText })
      } catch {}
    }
  }
}