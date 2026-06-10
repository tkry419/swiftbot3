/**
 * AstraX - system/logger.js
 * Colored, timestamped console logger
 * No external dependencies — pure Node.js
 */

// ─────────────────────────────────────────────
// ANSI COLOR CODES
// ─────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',

  // Text colors
  black:   '\x1b[30m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  white:   '\x1b[37m',
  gray:    '\x1b[90m',

  // Background colors
  bgRed:     '\x1b[41m',
  bgGreen:   '\x1b[42m',
  bgYellow:  '\x1b[43m',
  bgBlue:    '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan:    '\x1b[46m',
}

// ─────────────────────────────────────────────
// TIMESTAMP
// ─────────────────────────────────────────────
function timestamp () {
  const now = new Date()
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  return `${C.gray}[${h}:${m}:${s}]${C.reset}`
}

// ─────────────────────────────────────────────
// LEVEL BADGE
// ─────────────────────────────────────────────
function badge (label, color, bg) {
  return `${C.bold}${bg}${color} ${label} ${C.reset}`
}

// ─────────────────────────────────────────────
// CORE LOG FUNCTION
// ─────────────────────────────────────────────
function log (level, tag, message, extra) {
  const ts = timestamp()
  let lvlBadge = ''

  switch (level) {
    case 'info':    lvlBadge = badge('INFO',  C.white,   C.bgBlue);    break
    case 'success': lvlBadge = badge('OK',    C.white,   C.bgGreen);   break
    case 'warn':    lvlBadge = badge('WARN',  C.black,   C.bgYellow);  break
    case 'error':   lvlBadge = badge('ERROR', C.white,   C.bgRed);     break
    case 'debug':   lvlBadge = badge('DEBUG', C.white,   C.bgMagenta); break
    case 'cmd':     lvlBadge = badge('CMD',   C.white,   C.bgCyan);    break
    case 'msg':     lvlBadge = badge('MSG',   C.black,   C.bgYellow);  break
    case 'bot':     lvlBadge = badge('BOT',   C.white,   C.bgMagenta); break
    default:        lvlBadge = badge(level.toUpperCase(), C.white, C.bgBlue)
  }

  const tagStr = tag ? `${C.cyan}[${tag}]${C.reset}` : ''
  const msgStr = `${C.white}${message}${C.reset}`
  const extraStr = extra !== undefined
    ? `\n  ${C.dim}${JSON.stringify(extra, null, 2)}${C.reset}`
    : ''

  const line = `${ts} ${lvlBadge} ${tagStr} ${msgStr}${extraStr}`

  if (level === 'error') {
    console.error(line)
  } else {
    console.log(line)
  }
}

// ─────────────────────────────────────────────
// EXPORTED LOGGER
// ─────────────────────────────────────────────
export const logger = {
  info    : (tag, msg, extra) => log('info',    tag, msg, extra),
  success : (tag, msg, extra) => log('success', tag, msg, extra),
  warn    : (tag, msg, extra) => log('warn',    tag, msg, extra),
  error   : (tag, msg, extra) => log('error',   tag, msg, extra),
  debug   : (tag, msg, extra) => log('debug',   tag, msg, extra),
  cmd     : (tag, msg, extra) => log('cmd',     tag, msg, extra),
  msg     : (tag, msg, extra) => log('msg',     tag, msg, extra),
  bot     : (tag, msg, extra) => log('bot',     tag, msg, extra),

  // Shorthand — no tag needed
  log     : (msg, extra)      => log('info',    '',  msg, extra),

  // ─── Startup Banner ───────────────────────
  banner (botname, prefix, owner, dbMode, version) {
    const line = '─'.repeat(48)
    console.log(`\n${C.bold}${C.magenta}${line}${C.reset}`)
    console.log(`${C.bold}${C.cyan}  ⚡ ${botname} — WhatsApp Bot${C.reset}`)
    console.log(`${C.bold}${C.magenta}${line}${C.reset}`)
    console.log(`${C.green}  Prefix   ${C.reset}: ${C.yellow}${prefix}${C.reset}`)
    console.log(`${C.green}  Owner    ${C.reset}: ${C.yellow}${owner}${C.reset}`)
    console.log(`${C.green}  DB Mode  ${C.reset}: ${C.yellow}${dbMode.toUpperCase()}${C.reset}`)
    console.log(`${C.green}  Baileys  ${C.reset}: ${C.yellow}v${version}${C.reset}`)
    console.log(`${C.bold}${C.magenta}${line}${C.reset}\n`)
  },

  // ─── Connected Banner ─────────────────────
  connected (jid, botname) {
    const line = '─'.repeat(48)
    console.log(`\n${C.bold}${C.green}${line}${C.reset}`)
    console.log(`${C.bold}${C.green}  ✅ ${botname} Connected!${C.reset}`)
    console.log(`${C.green}  JID: ${C.yellow}${jid}${C.reset}`)
    console.log(`${C.bold}${C.green}${line}${C.reset}\n`)
  },

  // ─── Plugin Loader ────────────────────────
  pluginLoaded (name, type, cmdCount) {
    console.log(
      `${timestamp()} ${badge('LOAD', C.white, C.bgCyan)} ${C.cyan}[${type}]${C.reset} ` +
      `${C.white}${name}${C.reset} ${C.gray}(${cmdCount} registered)${C.reset}`
    )
  },

  // ─── Incoming Message ─────────────────────
  incoming (from, sender, cmd) {
    console.log(
      `${timestamp()} ${badge('MSG', C.black, C.bgYellow)} ` +
      `${C.cyan}${sender}${C.reset} ${C.gray}→${C.reset} ` +
      `${C.white}${from}${C.reset} ` +
      `${cmd ? `${C.magenta}[${cmd}]${C.reset}` : ''}`
    )
  },

  // ─── Command Executed ─────────────────────
  executed (cmd, sender, success = true) {
    const icon = success ? '✅' : '❌'
    console.log(
      `${timestamp()} ${badge('CMD', C.white, C.bgCyan)} ` +
      `${icon} ${C.bold}${cmd}${C.reset} ${C.gray}by${C.reset} ${C.cyan}${sender}${C.reset}`
    )
  },

  // ─── RAM Stats ────────────────────────────
  ramStats () {
    const mem = process.memoryUsage()
    const toMB = b => (b / 1024 / 1024).toFixed(2)
    console.log(
      `${timestamp()} ${badge('RAM', C.white, C.bgBlue)} ` +
      `RSS: ${C.yellow}${toMB(mem.rss)}MB${C.reset} | ` +
      `Heap: ${C.yellow}${toMB(mem.heapUsed)}/${toMB(mem.heapTotal)}MB${C.reset}`
    )
  }
}