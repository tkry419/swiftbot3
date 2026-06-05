/**
 * SwiftBot - index.js
 * Main entry point — Baileys connection, session load, plugin init
 * Real-time everything — MongoDB/RAM auto-detect
 * Fixed for Render + no port errors
 */

import express from 'express' // ADDED: For Render port binding
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import qrcode from 'qrcode-terminal'

import { initDb, db } from './system/db.js'
import { logger } from './system/logger.js'
import { initLoader } from './system/loader.js'
import { routeMessage, routeEvent } from './system/router.js'
import { box } from './system/box.js'
import { fonts } from './system/fonts.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─────────────────────────────────────────────
// FIX: EXPRESS SERVER FOR RENDER - PREVENTS PORT SCAN TIMEOUT
// ─────────────────────────────────────────────
const app = express()
const PORT = process.env.PORT || 3000

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    bot: 'SwiftBot',
    uptime: process.uptime(),
    memory: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
  })
})

app.listen(PORT, () => {
  logger.success('SERVER', `Dummy port ${PORT} opened for Render`)
})

// FIX: Keep-alive ping every 14 minutes to prevent sleep
setInterval(() => {
  fetch(`http://localhost:${PORT}`).catch(() => {})
}, 14 * 60 * 1000)

// FIX: Prevent multiple instances + memory leaks
process.setMaxListeners(20)
let globalSock = null
let isStarting = false
let cleanupInterval = null

// ─────────────────────────────────────────────
// SESSION PATH
// ─────────────────────────────────────────────
const SESSION_DIR = join(__dirname, 'sessions')
const CREDS_PATH = join(SESSION_DIR, 'creds.json')

// ─────────────────────────────────────────────
// DECODE SESSION_ID FROM ENV
// ─────────────────────────────────────────────
function loadSessionFromEnv() {
  const sessionId = process.env.SESSION_ID

  if (!sessionId ||!sessionId.startsWith('SWIFTBOT~')) {
    logger.error('SESSION', 'No SESSION_ID found in env')
    logger.info('SESSION', 'Run: node pair.js to generate one')
    return false
  }

  try {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true })
    }

    const base64Data = sessionId.replace('SWIFTBOT~', '')
    const decoded = Buffer.from(base64Data, 'base64').toString('utf-8')
    const creds = JSON.parse(decoded)

    fs.writeFileSync(CREDS_PATH, JSON.stringify(creds, null, 2))
    logger.success('SESSION', 'Session loaded from SESSION_ID env')
    return true

  } catch (e) {
    logger.error('SESSION', 'Failed to decode SESSION_ID', e.message)
    return false
  }
}

// ─────────────────────────────────────────────
// DOWNLOAD BOT IMAGE
// ─────────────────────────────────────────────
let botThumbnail = null
async function loadBotImage() {
  try {
    const imageUrl = await db.get('botimage') || 'https://i.ibb.co/S7sRhPFq/IMG-20260601-WA0038.jpg'
    const response = await fetch(imageUrl)
    const buffer = await response.arrayBuffer()
    botThumbnail = Buffer.from(buffer)
    logger.success('ASSET', 'Bot image loaded')
  } catch (e) {
    logger.warn('ASSET', 'Failed to load bot image', e.message)
  }
}

// ─────────────────────────────────────────────
// SEND CONNECTED MESSAGE
// ─────────────────────────────────────────────
async function sendConnectedMsg(sock) {
  try {
    const [botname, owner, prefix, channelJid, channelName, channelLink, mode] = await Promise.all([
      db.get('botname'),
      db.get('owner'),
      db.get('prefix'),
      db.get('channelJid'),
      db.get('channelName'),
      db.get('channelLink'),
      db.get('mode')
    ])

    const ownerJid = `${owner}@s.whatsapp.net`
    const msg = await box.reply(
      `Connected Successfully ✅\n\n` +
      `Bot: ${fonts.bold(botname)}\n` +
      `Prefix: ${fonts.mono(prefix)}\n` +
      `Mode: ${fonts.sans(mode)}\n` +
      `Owner: ${fonts.bold(owner)}\n` +
      `DB: ${fonts.smallCaps(db.mode)}\n\n` +
      `Type ${fonts.bold(prefix + 'menu')} to start`,
      'SwiftBot v2.0'
    )

    const contextInfo = {
      forwardingScore: 430,
      isForwarded: true,
      externalAdReply: {
        title: 'WhatsApp',
        body: `Contact: ${channelName || 'SwiftBot Updates'}`,
        mediaType: 1,
        thumbnail: botThumbnail,
        mediaUrl: channelLink || '',
        sourceUrl: channelLink || '',
        showAdAttribution: true,
        renderLargerThumbnail: false,
        verifiedBizName: 'WhatsApp'
      },
      forwardedNewsletterMessageInfo: channelJid? {
        newsletterJid: channelJid,
        newsletterName: channelName || 'SwiftBot Updates',
        serverMessageId: Math.floor(Math.random() * 100000)
      } : undefined
    }

    await sock.sendMessage(ownerJid, {
      text: msg,
      contextInfo
    })

    logger.success('BOT', 'Connected message sent to owner')

  } catch (e) {
    logger.error('BOT', 'Failed to send connected msg', e.message)
  }
}

// ─────────────────────────────────────────────
// RAM CLEANUP — Prevent memory leak
// ─────────────────────────────────────────────
function startRamCleanup() {
  if (cleanupInterval) clearInterval(cleanupInterval)

  cleanupInterval = setInterval(() => {
    const mem = process.memoryUsage()
    const used = mem.heapUsed / 1024 / 1024

    if (used > 450) {
      logger.warn('RAM', `High memory: ${used.toFixed(2)}MB — Forcing GC`)
      if (global.gc) {
        global.gc()
        logger.success('RAM', 'Garbage collection triggered')
      }
    }

    logger.ramStats()
  }, 60000)
}

// ─────────────────────────────────────────────
// START BOT
// ─────────────────────────────────────────────
async function startBot() {
  if (isStarting) return
  isStarting = true

  logger.bot('STARTUP', 'Starting SwiftBot...')

  if (globalSock) {
    try { await globalSock.end() } catch {}
    globalSock = null
    await new Promise(r => setTimeout(r, 2000))
  }

  await initDb()

  if (!fs.existsSync(CREDS_PATH)) {
    if (!loadSessionFromEnv()) {
      logger.error('STARTUP', 'No session found. Exiting.')
      process.exit(1)
    }
  }

  await loadBotImage()
  const pluginStats = await initLoader()

  const { version } = await fetchLatestBaileysVersion()
  logger.info('BAILEYS', `Using WA v${version.join('.')}`)

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: true,
    syncFullHistory: true,
    generateHighQualityLinkPreview: false,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 10000,
    getMessage: async () => ({ conversation: '' })
  })

  globalSock = sock
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      logger.info('QR', 'Scan this QR to login:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      const shouldReconnect = statusCode!== DisconnectReason.loggedOut

      logger.error('CONNECTION', `Closed: ${statusCode}`, lastDisconnect?.error?.message)

      if (shouldReconnect) {
        logger.warn('CONNECTION', 'Reconnecting in 10s...')
        isStarting = false
        setTimeout(() => startBot(), 10000)
      } else {
        logger.error('CONNECTION', 'Logged out. Delete sessions/ and re-pair.')
        process.exit(1)
      }

    } else if (connection === 'open') {
      // FIX: SET OWNER FROM CONNECTED WHATSAPP NUMBER
      const botNumber = sock.user.id.split(':')[0].split('@')[0]
      await db.set('owner', botNumber)
      logger.success('OWNER', `Owner auto-set to: ${botNumber}`)

      const [botname, prefix, owner] = await Promise.all([
        db.get('botname'),
        db.get('prefix'),
        db.get('owner')
      ])

      logger.connected(sock.user.id, botname)
      logger.banner(botname, prefix, owner, db.mode, version.join('.'))

      await sendConnectedMsg(sock)
      startRamCleanup()
      isStarting = false
    }
  })

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type!== 'notify') return
    for (const m of messages) {
      await routeMessage(sock, m)
    }
  })

  sock.ev.on('group-participants.update', async (update) => {
    await routeEvent(sock, 'group-participants.update', update)
  })

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      if (update.update.messageStubType === 8) {
        await routeEvent(sock, 'messages.delete', update)
      }
    }
  })

  sock.ev.on('messages.reaction', async (reactions) => {
    await routeEvent(sock, 'messages.reaction', reactions)
  })

  sock.ev.on('call', async (calls) => {
    await routeEvent(sock, 'call', calls)
  })
}

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ─────────────────────────────────────────────
process.once('SIGINT', async () => {
  logger.warn('SHUTDOWN', 'Received SIGINT — Closing connection')
  if (globalSock) await globalSock.end()
  process.exit(0)
})

process.once('SIGTERM', async () => {
  logger.warn('SHUTDOWN', 'Received SIGTERM — Closing connection')
  if (globalSock) await globalSock.end()
  process.exit(0)
})

process.on('uncaughtException', (err) => {
  logger.error('CRASH', 'Uncaught Exception', err.message)
})

process.on('unhandledRejection', (err) => {
  logger.error('CRASH', 'Unhandled Rejection', err?.message || err)
})

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
startBot()