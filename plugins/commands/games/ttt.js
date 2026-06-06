/**
 * SwiftBot - plugins/commands/games/ttt.js
 * TicTacToe - vs Bot or Friend with live board edit
 * Single command - no extra files
 */

const activeGames = new Map()

const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8], // rows
  [0,3,6],[1,4,7],[2,5,8], // cols
  [0,4,8],[2,4,6] // diag
]

function renderBoard(board, showNumbers = false) {
  const symbols = board.map((cell, i) => {
    if (cell === 'X') return '❌'
    if (cell === 'O') return '⭕'
    return showNumbers? `${i + 1}️⃣` : '⬜'
  })

  return `╔═━━━━━━━━━━━━━━━━═❒
║ ${symbols[0]} ${symbols[1]} ${symbols[2]}
║ ${symbols[3]} ${symbols[4]} ${symbols[5]}
║ ${symbols[6]} ${symbols[7]} ${symbols[8]}
╚━━━━━━━━━━━━━━━━━═❒`
}

function checkWinner(board) {
  for (const combo of WIN_PATTERNS) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], combo }
    }
  }
  if (!board.includes(null)) return { winner: 'draw', combo: null }
  return { winner: null, combo: null }
}

function botMove(board) {
  // 1. Win if possible
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'O'
      if (checkWinner(board).winner === 'O') {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  // 2. Block player win
  for (let i = 0; i < 9; i++) {
    if (board[i] === null) {
      board[i] = 'X'
      if (checkWinner(board).winner === 'X') {
        board[i] = null
        return i
      }
      board[i] = null
    }
  }

  // 3. Take center
  if (board[4] === null) return 4

  // 4. Take corners
  const corners = [0,2,6,8].filter(i => board[i] === null)
  if (corners.length) return corners[Math.floor(Math.random() * corners.length)]

  // 5. Take any
  const available = board.map((cell, i) => cell === null? i : null).filter(i => i!== null)
  return available[Math.floor(Math.random() * available.length)]
}

export default {
  name: 'ttt',
  alias: ['tictactoe', 'tic', 'xo'],
  desc: 'TicTacToe game vs Bot or Friend',
  usage: 'start|bot|@user|1-9|board|stop',
  category: 'games',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderNum = sender.split('@')[0]
    const body = m.message?.conversation || m.message?.extendedTextMessage?.text || ''
    const action = args[0]?.toLowerCase()
    const prefix = await db.get('prefix')

    let game = activeGames.get(from)

    // 1. HELP
    if (!action) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *TICTACTOE*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}ttt start - vs Friend
║ ${prefix}ttt bot - vs Bot
║ ${prefix}ttt @user - vs User
║ ${prefix}ttt 1-9 - Make move
║ ${prefix}ttt board - Show board
║ ${prefix}ttt stop - End game
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 1️⃣ 2️⃣ 3️⃣
║ 4️⃣ 5️⃣ 6️⃣
║ 7️⃣ 8️⃣ 9️⃣
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. SHOW BOARD
    if (action === 'board') {
      if (!game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No active game\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      return await sock.sendMessage(from, {
        text: renderBoard(game.board, true) + `\n╔═━━━━━━━━━━━━━━━━═❒\n║ Turn: ${game.turn === 'X'? '❌' : '⭕'} @${game.currentPlayer.split('@')[0]}\n╚━━━━━━━━━━━━━━━━━═❒`,
        mentions: [game.currentPlayer]
      }, { quoted: m })
    }

    // 3. STOP GAME
    if (action === 'stop' || action === 'end') {
      if (!game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No active game\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      activeGames.delete(from)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game stopped\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 4. START VS BOT
    if (action === 'bot') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const gameData = {
        board: Array(9).fill(null),
        turn: 'X',
        playerX: sender,
        playerO: 'bot',
        currentPlayer: sender,
        vsBot: true,
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: renderBoard(gameData.board, true) + `\n╔═━━━━━━━━━━━━━━━━═❒\n║ You: ❌ | Bot: ⭕\n║ Turn: ❌ @${senderNum}\n║ Use: ${prefix}ttt 1-9\n╚━━━━━━━━━━━━━━━━━═❒`,
        mentions: [sender]
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 5. START VS FRIEND
    if (action === 'start') {
      if (game) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Game already running\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
      const opponent = mentioned[0]

      if (!opponent) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Waiting Player O...\n║ ${prefix}ttt @user to join\n║ Or ${prefix}ttt bot\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (opponent === sender) return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Cannot play yourself\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      const gameData = {
        board: Array(9).fill(null),
        turn: 'X',
        playerX: sender,
        playerO: opponent,
        currentPlayer: sender,
        vsBot: false,
        msgKey: null
      }

      activeGames.set(from, gameData)

      const sent = await sock.sendMessage(from, {
        text: renderBoard(gameData.board, true) + `\n╔═━━━━━━━━━━━━━━━━═❒\n║ ❌: @${senderNum}\n║ ⭕: @${opponent.split('@')[0]}\n║ Turn: ❌ @${senderNum}\n╚━━━━━━━━━━━━━━━━━═❒`,
        mentions: [sender, opponent]
      }, { quoted: m })

      gameData.msgKey = sent.key
      return
    }

    // 6. MAKE MOVE
    const pos = parseInt(action) - 1
    if (isNaN(pos) || pos < 0 || pos > 8) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use 1-9 to move\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!game) return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No game running\n║ ${prefix}ttt bot\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    if (game.currentPlayer!== sender) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Not your turn\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (game.board[pos]!== null) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Position taken\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // PLAYER MOVE
    game.board[pos] = game.turn

    let { winner } = checkWinner(game.board)

    // EDIT BOARD - ANIMATION
    if (game.msgKey) {
      try {
        await sock.sendMessage(from, {
          edit: game.msgKey,
          text: renderBoard(game.board) + `\n╔═━━━━━━━━━━━━━━━━═❒\n║ Move: ${game.turn === 'X'? '❌' : '⭕'} → ${pos + 1}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }

    if (winner) {
      activeGames.delete(from)
      const winText = winner === 'draw'?
        `╔═━━━━━━━━━━━━━━━━═❒\n║ *DRAW*\n╚━━━━━━━━━━━━━━━━━═❒\n${renderBoard(game.board)}\n╔═━━━━━━━━━━━━━━━━═❒\n║ No winner\n╚━━━━━━━━━━━━━━━━━═❒` :
        `╔═━━━━━━━━━━━━━━━━═❒\n║ *WINNER*\n╚━━━━━━━━━━━━━━━━━═❒\n${renderBoard(game.board)}\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${winner === 'X'? '❌' : '⭕'} @${senderNum}\n╚━━━━━━━━━━━━━━━━━═❒`

      const wins = await db.get(`ttt_wins_${senderNum}`) || 0
      await db.set(`ttt_wins_${senderNum}`, wins + 1)

      return await sock.sendMessage(from, {
        text: winText,
        mentions: [sender]
      }, { quoted: m })
    }

    // SWITCH TURN
    game.turn = game.turn === 'X'? 'O' : 'X'
    game.currentPlayer = game.turn === 'X'? game.playerX : game.playerO

    // BOT MOVE
    if (game.vsBot && game.turn === 'O') {
      await new Promise(r => setTimeout(r, 800))

      const botPos = botMove(game.board)
      game.board[botPos] = 'O'

      winner = checkWinner(game.board).winner

      if (game.msgKey) {
        try {
          await sock.sendMessage(from, {
            edit: game.msgKey,
            text: renderBoard(game.board) + `\n╔═━━━━━━━━━━━━━━━━═❒\n║ Bot: ⭕ → ${botPos + 1}\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      }

      if (winner) {
        activeGames.delete(from)
        const winText = winner === 'draw'?
          `╔═━━━━━━━━━━━━━━━━═❒\n║ *DRAW*\n╚━━━━━━━━━━━━━━━━━═❒\n${renderBoard(game.board)}\n╔═━━━━━━━━━━━━━━━━═❒\n║ Good game\n╚━━━━━━━━━━━━━━━━━═❒` :
          `╔═━━━━━━━━━━━━━━━━═❒\n║ *BOT WINS*\n╚━━━━━━━━━━━━━━━━━═❒\n${renderBoard(game.board)}\n╔═━━━━━━━━━━━━━━━━═❒\n║ ⭕ Bot\n╚━━━━━━━━━━━━━━━━━═❒`

        return await sock.sendMessage(from, { text: winText }, { quoted: m })
      }

      game.turn = 'X'
      game.currentPlayer = game.playerX
    }

    // UPDATE TURN MESSAGE
    if (game.msgKey &&!game.vsBot) {
      try {
        const nextPlayer = game.currentPlayer.split('@')[0]
        await sock.sendMessage(from, {
          edit: game.msgKey,
          text: renderBoard(game.board) + `\n╔═━━━━━━━━━━━━━━━━═❒\n║ Turn: ${game.turn === 'X'? '❌' : '⭕'} @${nextPlayer}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}