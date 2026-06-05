/**
 * SwiftBot - index.js
 * Main entry point — Baileys connection, session load, plugin init
 * Real-time everything — MongoDB/RAM auto-detect
 */

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
import { fonts } from './system/fonts.js' // FIX 1: fonts ilikosa

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// FIX 2: Prevent multiple instances + memory leaks
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
    // Ensure sessions folder exists
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true })
    }

    // Decode base64
    const base64Data = sessionId.replace('SWIFTBOT~', '')
    const decoded = Buffer.from(base64Data, 'base64').toString('utf-8')
    const creds = JSON.parse(decoded)

    // Write creds.json
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
    const [botname, owner, prefix, channelJid, channelName, channelLink] = await Promise.all([
      db.get('botname'),
      db.get('owner'),
      db.get('prefix'),
      db.get('channelJid'),
      db.get('channelName'),
      db.get('channelLink')
    ])

    const ownerJid = `${owner}@s.whatsapp.net`
    const msg = await box.reply(
      `Connected Successfully ✅\n\n` +
      `Bot: ${fonts.bold(botname)}\n` +
      `Prefix: ${fonts.mono(prefix)}\n` +
      `Mode: ${fonts.sans(await db.get('mode'))}\n` +
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
  if (cleanupInterval) clearInterval(cleanupInterval) // FIX 3: Clear old interval
  
  cleanupInterval = setInterval(() => {
    const mem = process.memoryUsage()
    const used = mem.heapUsed / 1024 / 1024

    if (used > 450) { // 450MB threshold
      logger.warn('RAM', `High memory: ${used.toFixed(2)}MB — Forcing GC`)
      if (global.gc) {
        global.gc()
        logger.success('RAM', 'Garbage collection triggered')
      }
    }

    logger.ramStats()
  }, 60000) // Every 1 minute
}

// ─────────────────────────────────────────────
// START BOT
// ─────────────────────────────────────────────
async function startBot() {
  if (isStarting) return // FIX 4: Prevent double start
  isStarting = true
  
  logger.bot('STARTUP', 'Starting SwiftBot...')

  // FIX 5: Kill old socket before starting new one
  if (globalSock) {
    try { await globalSock.end() } catch {}
    globalSock = null
    await new Promise(r => setTimeout(r, 2000)) // Wait 2s for WhatsApp to release
  }

  // 1. Init Database
  await initDb()

  // 2. Load Session from ENV
  if (!fs.existsSync(CREDS_PATH)) {
    if (!loadSessionFromEnv()) {
      logger.error('STARTUP', 'No session found. Exiting.')
      process.exit(1)
    }
  }

  // 3. Load Bot Image
  await loadBotImage()

  // 4. Init Plugin Loader
  const pluginStats = await initLoader()

  // 5. Get Baileys Version
  const { version } = await fetchLatestBaileysVersion()
  logger.info('BAILEYS', `Using WA v${version.join('.')}`)

  // 6. Load Auth State
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  // 7. Create Socket
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      return { conversation: '' }
    }
  })

  globalSock = sock // Store globally

  // 8. Save Creds on Update
  sock.ev.on('creds.update', saveCreds)

  // 9. Connection Updates
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
        logger.warn('CONNECTION', 'Reconnecting in 10s...') // FIX 6: Increased delay
        isStarting = false // Reset flag
        setTimeout(() => startBot(), 10000)
      } else {
        logger.error('CONNECTION', 'Logged out. Delete sessions/ and re-pair.')
        process.exit(1)
      }

    } else if (connection === 'open') {
      const [botname, prefix, owner] = await Promise.all([
        db.get('botname'),
        db.get('prefix'),
        db.get('owner')
      ])

      logger.connected(sock.user.id, botname)
      logger.banner(botname, prefix, owner, db.mode, version.join('.'))

      // Send connected message
      await sendConnectedMsg(sock)

      // Start RAM cleanup
      startRamCleanup()
      isStarting = false // Reset flag after success
    }
  })

  // 10. Handle Messages
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type!== 'notify') return
    for (const m of messages) {
      await routeMessage(sock, m)
    }
  })

  // 11. Handle Group Events — For observers
  sock.ev.on('group-participants.update', async (update) => {
    await routeEvent(sock, 'group-participants.update', update)
  })

  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      if (update.update.messageStubType === 8) { // Message deleted
        await routeEvent(sock, 'messages.delete', update)
      }
    }
  })

  sock.ev.on('messages.reaction', async (reactions) => {
    await routeEvent(sock, 'messages.reaction', reactions)
  })

  // 12. Handle Call Events
  sock.ev.on('call', async (calls) => {
    await routeEvent(sock, 'call', calls)
  })
}

// ─────────────────────────────────────────────
// GRACEFUL SHUTDOWN — FIX 7: Use .once to prevent listener leaks
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