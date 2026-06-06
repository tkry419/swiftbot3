/**
 * SwiftBot - plugins/commands/games/quiz.js
 * Quiz Trivia Game - vs Bot
 * Uses pushName, edit animation
 */

const activeGames = new Map()

const QUESTIONS = [
  { q: 'What is the capital of Kenya?', a: 'Nairobi', choices: ['Mombasa','Nairobi','Kisumu','Nakuru'] },
  { q: 'Which planet is called Red Planet?', a: 'Mars', choices: ['Venus','Mars','Jupiter','Saturn'] },
  { q: 'Who created WhatsApp?', a: 'Jan Koum', choices: ['Mark Zuckerberg','Jan Koum','Elon Musk','Bill Gates'] },
  { q: 'Largest ocean on Earth?', a: 'Pacific', choices: ['Atlantic','Indian','Arctic','Pacific'] },
  { q: 'HTML stands for?', a: 'HyperText Markup Language', choices: ['HighText Machine Language','HyperText Markup Language','HyperTool Multi Language','None'] },
  { q: 'Fastest land animal?', a: 'Cheetah', choices: ['Lion','Cheetah','Tiger','Leopard'] },
  { q: 'Python is a?', a: 'Programming Language', choices: ['Snake','Programming Language','Game','Movie'] },
  { q: 'How many continents?', a: '7', choices: ['5','6','7','8'] },
  { q: 'Who painted Mona Lisa?', a: 'Leonardo da Vinci', choices: ['Van Gogh','Picasso','Leonardo da Vinci','Michelangelo'] },
  { q: 'Largest country by area?', a: 'Russia', choices: ['China','USA','Canada','Russia'] },
  { q: 'Chemical symbol for Gold?', a: 'Au', choices: ['Go','Gd','Au','Ag'] },
  { q: 'First man on moon?', a: 'Neil Armstrong', choices: ['Buzz Aldrin','Neil Armstrong','Yuri Gagarin','John Glenn'] },
  { q: 'How many seconds in 1 minute?', a: '60', choices: ['50','60','100','120'] },
  { q: 'Android is owned by?', a: 'Google', choices: ['Apple','Microsoft','Google','Samsung'] },
  { q: 'Longest river in world?', a: 'Nile', choices: ['Amazon','Nile','Yangtze','Mississippi'] }
]

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function shuffleArray(arr) {
  const newArr = [...arr]
  for (let i = newArr.length - 1; i > 0; i--) {
    const randIdx = Math.floor(Math.random() * (i + 1))
    [newArr[i], newArr[randIdx]] = [newArr[randIdx], newArr[i]]
  }
  return newArr
}

export default {
  name: 'quiz',
  alias: ['trivia', 'question'],
  desc: 'Quiz Trivia game vs Bot',
  usage: 'start|a|b|c|d|stop',
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
║ *QUIZ TRIVIA*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}quiz start - Start quiz
║ ${prefix}quiz a - Choose A
║ ${prefix}quiz b - Choose B
║ ${prefix}quiz c - Choose C
║ ${prefix}quiz d - Choose D
║ ${prefix}quiz stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 5 questions per game
║ Score points to win
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Quiz stopped\n║ Score: ${game.score}/5\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. START GAME
    if (action === 'start') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const questions = shuffleArray(QUESTIONS).slice(0, 5)
      const gameData = {
        player: sender,
        playerName: senderName,
        questions: questions,
        currentQ: 0,
        score: 0,
        status: 'playing',
        msgKey: null
      }

      activeGames.set(from, gameData)

      const q = questions[0]
      const choices = shuffleArray(q.choices)
      gameData.currentChoices = choices

      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *QUIZ Q1/5*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${q.q}\n║\n║ A) ${choices[0]}\n║ B) ${choices[1]}\n║ C) ${choices[2]}\n║ D) ${choices[3]}\n║\n║ Score: 0\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 4. ANSWER
    const answer = action.toUpperCase()
    if (!['A','B','C','D'].includes(answer)) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use A/B/C/D only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!game) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No game running\n║ ${prefix}quiz start\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.player!== sender) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not your game\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.status!== 'playing') return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game ended\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    const currentQ = game.questions[game.currentQ]
    const choiceIndex = { A: 0, B: 1, C: 2, D: 3 }[answer]
    const playerAnswer = game.currentChoices[choiceIndex]

    // CHECK ANSWER
    if (playerAnswer === currentQ.a) {
      game.score++
    }

    game.currentQ++

    // GAME END
    if (game.currentQ >= 5) {
      game.status = 'done'
      const wins = await db.get(`quiz_wins_${sender}`) || 0
      if (game.score >= 3) await db.set(`quiz_wins_${sender}`, wins + 1)

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
    const choices = shuffleArray(q.choices)
    game.currentChoices = choices

    const updateText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *QUIZ Q${game.currentQ + 1}/5*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${q.q}\n║\n║ A) ${choices[0]}\n║ B) ${choices[1]}\n║ C) ${choices[2]}\n║ D) ${choices[3]}\n║\n║ Score: ${game.score}\n╚━━━━━━━━━━━━━━━━━═❒`

    if (game.msgKey) {
      try {
        await sock.sendMessage(from, { edit: game.msgKey, text: updateText })
      } catch {}
    }
  }
}