/**
 * SwiftBot - plugins/commands/games/math.js
 * Math Quiz Game - vs Bot
 * Uses pushName, edit animation, timer
 */

const activeGames = new Map()

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function generateQuestion(level) {
  const operations = ['+', '-', '×', '÷']
  const op = operations[Math.floor(Math.random() * operations.length)]

  let a, b, answer

  switch (op) {
    case '+':
      a = Math.floor(Math.random() * (level * 50)) + 1
      b = Math.floor(Math.random() * (level * 50)) + 1
      answer = a + b
      break
    case '-':
      a = Math.floor(Math.random() * (level * 50)) + 20
      b = Math.floor(Math.random() * a) + 1
      answer = a - b
      break
    case '×':
      a = Math.floor(Math.random() * (level * 10)) + 1
      b = Math.floor(Math.random() * 12) + 1
      answer = a * b
      break
    case '÷':
      b = Math.floor(Math.random() * 12) + 1
      answer = Math.floor(Math.random() * (level * 10)) + 1
      a = b * answer
      break
  }

  return { question: `${a} ${op} ${b}`, answer }
}

export default {
  name: 'math',
  alias: ['quiz', 'calculate'],
  desc: 'Math Quiz game vs Bot',
  usage: 'start|answer|stop',
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
║ *MATH QUIZ*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}math start - Start quiz
║ ${prefix}math 42 - Answer
║ ${prefix}math stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 5 questions per game
║ 15 seconds per question
║ Score points to win
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. STOP GAME
    if (action === 'stop') {
      if (!game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No active game\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      if (game.timer) clearTimeout(game.timer)
      activeGames.delete(from)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Quiz stopped\n║ Score: ${game.score}/5\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. START GAME
    if (action === 'start') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const level = parseInt(args[1]) || 1
      const gameData = {
        player: sender,
        playerName: senderName,
        level: Math.min(Math.max(level, 1), 5),
        currentQ: 0,
        score: 0,
        questions: [],
        currentAnswer: null,
        status: 'playing',
        msgKey: null,
        timer: null
      }

      // Generate 5 questions
      for (let i = 0; i < 5; i++) {
        gameData.questions.push(generateQuestion(gameData.level))
      }

      activeGames.set(from, gameData)

      const q = gameData.questions[0]
      gameData.currentAnswer = q.answer

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *MATH Q1/5*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Level: ${gameData.level}\n║\n║ ${q.question} =?\n║\n║ Time: 15s\n║ Score: 0\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key

      // TIMER
      gameData.timer = setTimeout(async () => {
        if (activeGames.has(from)) {
          const g = activeGames.get(from)
          g.currentQ++

          if (g.currentQ >= 5) {
            g.status = 'done'
            const wins = await db.get(`math_wins_${sender}`) || 0
            if (g.score >= 3) await db.set(`math_wins_${sender}`, wins + 1)

            const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *QUIZ END*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Score: ${g.score}/5\n║ ${g.score >= 3? 'You passed!' : 'Time up!'}\n╚━━━━━━━━━━━━━━━━━═❒`

            try {
              await sock.sendMessage(from, { edit: g.msgKey, text: resultText })
            } catch {}
            activeGames.delete(from)
            return
          }

          // NEXT QUESTION
          const nextQ = g.questions[g.currentQ]
          g.currentAnswer = nextQ.answer

          const updateText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *MATH Q${g.currentQ + 1}/5*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Level: ${g.level}\n║\n║ ${nextQ.question} =?\n║\n║ Time: 15s\n║ Score: ${g.score}\n╚━━━━━━━━━━━━━━━━━═❒`

          try {
            await sock.sendMessage(from, { edit: g.msgKey, text: updateText })
          } catch {}

          // NEW TIMER
          g.timer = setTimeout(arguments.callee, 15000)
        }
      }, 15000)

      return
    }

    // 4. ANSWER
    const answer = parseInt(action)
    if (isNaN(answer)) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Send number only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!game) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No game running\n║ ${prefix}math start\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.player!== sender) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not your game\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.status!== 'playing') return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game ended\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.timer) clearTimeout(game.timer)

    // CHECK ANSWER
    if (answer === game.currentAnswer) {
      game.score++
    }

    game.currentQ++

    // GAME END
    if (game.currentQ >= 5) {
      game.status = 'done'
      const wins = await db.get(`math_wins_${sender}`) || 0
      if (game.score >= 3) await db.set(`math_wins_${sender}`, wins + 1)

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *QUIZ END*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Score: ${game.score}/5\n║ ${game.score >= 3? 'You passed!' : 'Try again!'}\n╚━━━━━━━━━━━━━━━━━═❒`

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, { edit: game.msgKey, text: resultText })
        } catch {}
      }

      activeGames.delete(from)
      return
    }

    // NEXT QUESTION
    const q = game.questions[game.currentQ]
    game.currentAnswer = q.answer

    const updateText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *MATH Q${game.currentQ + 1}/5*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Level: ${game.level}\n║\n║ ${q.question} =?\n║\n║ Time: 15s\n║ Score: ${game.score}\n╚━━━━━━━━━━━━━━━━━═❒`

    if (game.msgKey) {
      try {
        await sock.sendMessage(from, { edit: game.msgKey, text: updateText })
      } catch {}
    }

    // NEW TIMER
    game.timer = setTimeout(async () => {
      if (activeGames.has(from)) {
        const g = activeGames.get(from)
        g.currentQ++

        if (g.currentQ >= 5) {
          g.status = 'done'
          const wins = await db.get(`math_wins_${sender}`) || 0
          if (g.score >= 3) await db.set(`math_wins_${sender}`, wins + 1)

          const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *QUIZ END*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Score: ${g.score}/5\n║ ${g.score >= 3? 'You passed!' : 'Time up!'}\n╚━━━━━━━━━━━━━━━━━═❒`

          try {
            await sock.sendMessage(from, { edit: g.msgKey, text: resultText })
          } catch {}
          activeGames.delete(from)
          return
        }

        const nextQ = g.questions[g.currentQ]
        g.currentAnswer = nextQ.answer

        const updateText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *MATH Q${g.currentQ + 1}/5*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Player: ${senderName}\n║ Level: ${g.level}\n║\n║ ${nextQ.question} =?\n║\n║ Time: 15s\n║ Score: ${g.score}\n╚━━━━━━━━━━━━━━━━━═❒`

        try {
          await sock.sendMessage(from, { edit: g.msgKey, text: updateText })
        } catch {}

        g.timer = setTimeout(arguments.callee, 15000)
      }
    }, 15000)
  }
}