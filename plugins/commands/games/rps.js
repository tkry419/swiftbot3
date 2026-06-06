/**
 * SwiftBot - plugins/commands/games/rps.js
 * Rock Paper Scissors - vs Bot or Friend
 * Uses pushName, no tags in display
 */

const activeGames = new Map()

const EMOJI = {
  rock: '🪨',
  paper: '📄',
  scissors: '✂️'
}

function getName(msg, jid) {
  if (jid === 'bot') return 'Bot'
  return msg.pushName || jid.split('@')[0]
}

function getWinner(p1, p2) {
  if (p1 === p2) return 'draw'
  if (
    (p1 === 'rock' && p2 === 'scissors') ||
    (p1 === 'paper' && p2 === 'rock') ||
    (p1 === 'scissors' && p2 === 'paper')
  ) return 'p1'
  return 'p2'
}

function getBotChoice() {
  const choices = ['rock', 'paper', 'scissors']
  return choices[Math.floor(Math.random() * 3)]
}

export default {
  name: 'rps',
  alias: ['rockpaperscissors'],
  desc: 'Rock Paper Scissors vs Bot or Friend',
  usage: 'bot|@user|rock|paper|scissors|stop',
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
║ *ROCK PAPER SCISSORS*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}rps bot - vs Bot
║ ${prefix}rps @user - vs Friend
║ ${prefix}rps rock - Choose rock
║ ${prefix}rps paper - Choose paper
║ ${prefix}rps scissors - Choose scissors
║ ${prefix}rps stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 🪨 Rock beats ✂️
║ 📄 Paper beats 🪨
║ ✂️ Scissors beats 📄
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. STOP GAME
    if (action === 'stop' || action === 'end') {
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
        player1Choice: null,
        player2Choice: null,
        vsBot: true,
        status: 'waiting',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *RPS VS BOT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName} vs Bot\n║ Waiting choice...\n║ ${prefix}rps rock/paper/scissors\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 4. START VS FRIEND
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    if (mentioned[0] &&!action.match(/rock|paper|scissors/)) {
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
        player1Choice: null,
        player2Choice: null,
        vsBot: false,
        status: 'waiting',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *RPS 1V1*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${senderName} vs ${opponentName}\n║ Both choose now\n║ ${prefix}rps rock/paper/scissors\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 5. MAKE CHOICE
    const choice = action
    if (!['rock', 'paper', 'scissors'].includes(choice)) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use: rock/paper/scissors\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!game) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No game running\n║ ${prefix}rps bot\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.status === 'done') return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game ended\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    // PLAYER 1 CHOICE
    if (sender === game.player1 &&!game.player1Choice) {
      game.player1Choice = choice

      // VS BOT - AUTO PLAY
      if (game.vsBot) {
        await new Promise(r => setTimeout(r, 1000))
        game.player2Choice = getBotChoice()

        const result = getWinner(game.player1Choice, game.player2Choice)
        game.status = 'done'

        let resultText = ''
        if (result === 'draw') {
          resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *DRAW*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${game.player1Name}: ${EMOJI[game.player1Choice]}\n║ Bot: ${EMOJI[game.player2Choice]}\n╚━━━━━━━━━━━━━━━━━═❒`
        } else if (result === 'p1') {
          const wins = await db.get(`rps_wins_${sender}`) || 0
          await db.set(`rps_wins_${sender}`, wins + 1)
          resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *YOU WIN*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${game.player1Name}: ${EMOJI[game.player1Choice]}\n║ Bot: ${EMOJI[game.player2Choice]}\n╚━━━━━━━━━━━━━━━━━═❒`
        } else {
          resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *BOT WINS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${game.player1Name}: ${EMOJI[game.player1Choice]}\n║ Bot: ${EMOJI[game.player2Choice]}\n╚━━━━━━━━━━━━━━━━━═❒`
        }

        if (game.msgKey) {
          try {
            await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
          } catch {}
        }

        activeGames.delete(from)
        return
      }

      // VS PLAYER - WAIT FOR P2
      if (game.msgKey) {
        try {
          await sock.sendMessage(from, {
            edit: game.msgKey,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *RPS 1V1*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${game.player1Name}: ✅\n║ ${game.player2Name}: ⏳\n║ Waiting...\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      }

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Choice locked\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // PLAYER 2 CHOICE
    if (sender === game.player2 &&!game.player2Choice) {
      if (!game.player1Choice) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Wait for ${game.player1Name}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      game.player2Choice = choice
      game.status = 'done'

      const result = getWinner(game.player1Choice, game.player2Choice)

      let resultText = ''
      if (result === 'draw') {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *DRAW*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${game.player1Name}: ${EMOJI[game.player1Choice]}\n║ ${game.player2Name}: ${EMOJI[game.player2Choice]}\n╚━━━━━━━━━━━━━━━━━═❒`
      } else if (result === 'p1') {
        const wins = await db.get(`rps_wins_${game.player1}`) || 0
        await db.set(`rps_wins_${game.player1}`, wins + 1)
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *WINNER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${game.player1Name}: ${EMOJI[game.player1Choice]}\n║ ${game.player2Name}: ${EMOJI[game.player2Choice]}\n║ Winner: ${game.player1Name}\n╚━━━━━━━━━━━━━━━━━═❒`
      } else {
        const wins = await db.get(`rps_wins_${game.player2}`) || 0
        await db.set(`rps_wins_${game.player2}`, wins + 1)
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *WINNER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${game.player1Name}: ${EMOJI[game.player1Choice]}\n║ ${game.player2Name}: ${EMOJI[game.player2Choice]}\n║ Winner: ${game.player2Name}\n╚━━━━━━━━━━━━━━━━━═❒`
      }

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Already chose\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}