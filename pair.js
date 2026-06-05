/**
 * SwiftBot - pair.js
 * Standalone pairing script — QR + Pairing Code
 * Outputs SESSION_ID in format: SWIFTBOT~<base64>
 * No website needed — pure terminal
 */

import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import qrcode from 'qrcode-terminal'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─────────────────────────────────────────────
// ANSI COLORS
// ─────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  red: '\x1b[31m'
}

// ─────────────────────────────────────────────
// READLINE INTERFACE
// ─────────────────────────────────────────────
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(text) {
  return new Promise(resolve => rl.question(text, resolve))
}

// ─────────────────────────────────────────────
// SESSION PATH
// ─────────────────────────────────────────────
const SESSION_DIR = join(__dirname, 'temp_sessions')

// ─────────────────────────────────────────────
// CLEANUP TEMP SESSION
// ─────────────────────────────────────────────
function cleanupTemp() {
  if (fs.existsSync(SESSION_DIR)) {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true })
  }
}

// ─────────────────────────────────────────────
// ENCODE SESSION TO SWIFTBOT~BASE64
// ─────────────────────────────────────────────
function encodeSession() {
  try {
    const credsPath = join(SESSION_DIR, 'creds.json')
    if (!fs.existsSync(credsPath)) {
      console.log(`${C.red}❌ No creds.json found${C.reset}`)
      return null
    }

    const creds = fs.readFileSync(credsPath, 'utf-8')
    const base64 = Buffer.from(creds).toString('base64')
    const sessionId = `SWIFTBOT~${base64}`

    return sessionId

  } catch (e) {
    console.log(`${C.red}❌ Failed to encode session:${C.reset}`, e.message)
    return null
  }
}

// ─────────────────────────────────────────────
// BANNER
// ─────────────────────────────────────────────
function banner() {
  const line = '─'.repeat(48)
  console.log(`\n${C.bold}${C.magenta}${line}${C.reset}`)
  console.log(`${C.bold}${C.cyan}  ⚡ SwiftBot — Session Generator${C.reset}`)
  console.log(`${C.bold}${C.magenta}${line}${C.reset}`)
  console.log(`${C.green}  1${C.reset} → Pairing Code`)
  console.log(`${C.green}  2${C.reset} → QR Code`)
  console.log(`${C.bold}${C.magenta}${line}${C.reset}\n`)
}

// ─────────────────────────────────────────────
// START PAIRING
// ─────────────────────────────────────────────
async function startPairing() {
  cleanupTemp()

  // Ensure temp dir exists
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true })
  }

  banner()

  const choice = await question(`${C.yellow}Choose method (1 or 2):${C.reset} `)
  const usePairingCode = choice.trim() === '1'

  let phoneNumber = null
  if (usePairingCode) {
    phoneNumber = await question(`${C.yellow}Enter your WhatsApp number (e.g., 255747470941):${C.reset} `)
    phoneNumber = phoneNumber.replace(/[^0-9]/g, '') // Strip non-digits

    if (!phoneNumber || phoneNumber.length < 10) {
      console.log(`${C.red}❌ Invalid phone number${C.reset}`)
      rl.close()
      cleanupTemp()
      return
    }
  }

  console.log(`\n${C.cyan}⏳ Initializing...${C.reset}\n`)

  // Get Baileys version
  const { version } = await fetchLatestBaileysVersion()
  console.log(`${C.green}✓${C.reset} Using WA v${version.join('.')}`)

  // Auth state
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR)

  // Create socket
  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false
  })

  sock.ev.on('creds.update', saveCreds)

  // Request pairing code if selected
  if (usePairingCode &&!sock.authState.creds.registered) {
    try {
      const code = await sock.requestPairingCode(phoneNumber)
      console.log(`\n${C.bold}${C.green}✓ PAIRING CODE:${C.reset} ${C.bold}${C.yellow}${code}${C.reset}\n`)
      console.log(`${C.cyan}→ Open WhatsApp → Linked Devices → Link with phone number${C.reset}`)
      console.log(`${C.cyan}→ Enter this code on your phone${C.reset}\n`)
    } catch (e) {
      console.log(`${C.red}❌ Failed to get pairing code:${C.reset}`, e.message)
      rl.close()
      cleanupTemp()
      return
    }
  }

  // Connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr &&!usePairingCode) {
      console.log(`\n${C.bold}${C.green}✓ QR CODE:${C.reset}\n`)
      qrcode.generate(qr, { small: true })
      console.log(`\n${C.cyan}→ Open WhatsApp → Linked Devices → Scan QR${C.reset}\n`)
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      console.log(`\n${C.red}❌ Connection closed:${C.reset}`, statusCode)

      if (statusCode!== DisconnectReason.loggedOut) {
        console.log(`${C.yellow}⚠️  Unexpected disconnect. Try again.${C.reset}`)
      }

      rl.close()
      cleanupTemp()
      process.exit(1)

    } else if (connection === 'open') {
      console.log(`\n${C.bold}${C.green}✅ CONNECTED!${C.reset}\n`)

      // Wait 2s for creds to save
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Encode session
      const sessionId = encodeSession()

      if (sessionId) {
        const line = '═'.repeat(60)
        console.log(`${C.bold}${C.magenta}${line}${C.reset}`)
        console.log(`${C.bold}${C.green}  ✓ YOUR SESSION_ID:${C.reset}`)
        console.log(`${C.bold}${C.magenta}${line}${C.reset}\n`)
        console.log(`${C.bold}${C.yellow}${sessionId}${C.reset}\n`)
        console.log(`${C.bold}${C.magenta}${line}${C.reset}`)
        console.log(`${C.cyan}→ Copy this entire string${C.reset}`)
        console.log(`${C.cyan}→ Paste into .env as SESSION_ID=${C.reset}`)
        console.log(`${C.cyan}→ Or deploy to Railway/Render/Heroku${C.reset}\n`)
      } else {
        console.log(`${C.red}❌ Failed to generate SESSION_ID${C.reset}`)
      }

      rl.close()
      cleanupTemp()

      // Wait 1s then exit
      setTimeout(() => process.exit(0), 1000)
    }
  })
}

// ─────────────────────────────────────────────
// HANDLE EXIT
// ─────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log(`\n${C.yellow}⚠️  Cancelled by user${C.reset}`)
  cleanupTemp()
  rl.close()
  process.exit(0)
})

process.on('uncaughtException', (err) => {
  console.log(`${C.red}❌ Uncaught Exception:${C.reset}`, err.message)
  cleanupTemp()
  rl.close()
  process.exit(1)
})

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────
startPairing()