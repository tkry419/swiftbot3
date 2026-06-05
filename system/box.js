/**
 * SwiftBot - system/box.js
 * Boxes/formatting engine — Real-time from DB
 * Uses fonts.js for styles, db.js for prefix/botname
 * No hardcode — everything updates live
 */

import { db } from './db.js'
import { fonts } from './fonts.js'
import { logger } from './logger.js'

// ─────────────────────────────────────────────
// BOX CHARACTERS — Theme support later
// ─────────────────────────────────────────────
const BOX_CHARS = {
  default: {
    tl: '╭', tr: '╮', bl: '╰', br: '╯',
    h: '─', v: '│', m: '├', mr: '┤'
  },
  bold: {
    tl: '┏', tr: '┓', bl: '┗', br: '┛',
    h: '━', v: '┃', m: '┣', mr: '┫'
  },
  double: {
    tl: '╔', tr: '╗', bl: '╚', br: '╝',
    h: '═', v: '║', m: '╠', mr: '╣'
  },
  simple: {
    tl: '+', tr: '+', bl: '+', br: '+',
    h: '-', v: '|', m: '+', mr: '+'
  }
}

// ─────────────────────────────────────────────
// GET CURRENT SETTINGS — Real-time from DB
// ─────────────────────────────────────────────
async function getSettings() {
  const [prefix, botname, theme] = await Promise.all([
    db.get('prefix'),
    db.get('botname'),
    db.get('theme')
  ])

  return {
    prefix: prefix || '#',
    botname: botname || 'SwiftBot',
    theme: theme || 'default'
  }
}

// ─────────────────────────────────────────────
// BUILD BOX FRAME
// ─────────────────────────────────────────────
function buildFrame(lines, theme = 'default') {
  const chars = BOX_CHARS[theme] || BOX_CHARS.default
  const maxLen = Math.max(...lines.map(l => l.length))
  const width = maxLen + 2

  const top = chars.tl + chars.h.repeat(width) + chars.tr
  const bottom = chars.bl + chars.h.repeat(width) + chars.br

  const middle = lines.map(line => {
    const pad = ' '.repeat(width - line.length - 1)
    return `${chars.v} ${line}${pad}${chars.v}`
  })

  return [top,...middle, bottom].join('\n')
}

// ─────────────────────────────────────────────
// BUILD SEPARATOR LINE
// ─────────────────────────────────────────────
function separator(theme = 'default', width = 20) {
  const chars = BOX_CHARS[theme] || BOX_CHARS.default
  return chars.m + chars.h.repeat(width) + chars.mr
}

// ─────────────────────────────────────────────
// MAIN BOX FUNCTIONS
// ─────────────────────────────────────────────
export const box = {
  // Simple reply box
  async reply(text, footer = '') {
    const { botname, theme } = await getSettings()
    const lines = []

    lines.push(fonts.sansBold(botname))
    lines.push('')
    lines.push(text)

    if (footer) {
      lines.push('')
      lines.push(fonts.smallCaps(footer))
    }

    return buildFrame(lines, theme)
  },

  // Success box
  async success(msg) {
    const { theme } = await getSettings()
    const lines = [
      fonts.sansBold('✅ SUCCESS'),
      '',
      msg
    ]
    return buildFrame(lines, theme)
  },

  // Error box
  async error(msg) {
    const { theme } = await getSettings()
    const lines = [
      fonts.sansBold('❌ ERROR'),
      '',
      msg
    ]
    return buildFrame(lines, theme)
  },

  // Info box
  async info(title, msg) {
    const { theme } = await getSettings()
    const lines = [
      fonts.sansBold(`ℹ️ ${title.toUpperCase()}`),
      '',
      msg
    ]
    return buildFrame(lines, theme)
  },

  // List box
  async list(title, items = []) {
    const { theme } = await getSettings()
    const lines = [fonts.sansBold(title.toUpperCase()), '']

    items.forEach((item, i) => {
      lines.push(`${i + 1}. ${fonts.sans(item)}`)
    })

    return buildFrame(lines, theme)
  },

  // Menu box — shows current prefix
  async menu(botname, prefix, categories = []) {
    const { theme } = await getSettings()
    const lines = [
      fonts.sansBold(`${botname.toUpperCase()} MENU`),
      '',
      fonts.smallCaps(`Prefix: ${prefix}`),
      separator(theme, 25),
      ''
    ]

    categories.forEach((cat, i) => {
      lines.push(`${i + 1}. ${fonts.bold(cat.name)}`)
      lines.push(` ${fonts.smallCaps(cat.desc || '')}`)
      lines.push('')
    })

    lines.push(fonts.smallCaps(`Reply with number to view`))
    lines.push(fonts.smallCaps(`Example: ${prefix}menu 1`))

    return buildFrame(lines, theme)
  },

  // Command list for category
  async category(botname, prefix, catName, commands = []) {
    const { theme } = await getSettings()
    const lines = [
      fonts.sansBold(`${botname.toUpperCase()} - ${catName.toUpperCase()}`),
      '',
      fonts.smallCaps(`Prefix: ${prefix}`),
      separator(theme, 25),
      ''
    ]

    commands.forEach(cmd => {
      const usage = cmd.usage? ` ${cmd.usage}` : ''
      lines.push(`${fonts.bold(prefix + cmd.name)}${fonts.sans(usage)}`)
      if (cmd.desc) lines.push(` ${fonts.smallCaps(cmd.desc)}`)
      lines.push('')
    })

    return buildFrame(lines, theme)
  },

  // Stats box
  async stats(data = {}) {
    const { botname, theme } = await getSettings()
    const lines = [
      fonts.sansBold(`${botname.toUpperCase()} STATS`),
      separator(theme, 25),
      ''
    ]

    Object.entries(data).forEach(([key, val]) => {
      const label = key.replace(/([A-Z])/g, ' $1').toUpperCase()
      lines.push(`${fonts.bold(label)}: ${fonts.sans(val)}`)
    })

    return buildFrame(lines, theme)
  },

  // Custom box — full control
  async custom(lines = [], useTitle = true) {
    const { botname, theme } = await getSettings()
    const finalLines = []

    if (useTitle) {
      finalLines.push(fonts.sansBold(botname))
      finalLines.push('')
    }

    finalLines.push(...lines)
    return buildFrame(finalLines, theme)
  },

  // Alert box — for broadcasts
  async alert(title, msg) {
    const { botname, theme } = await getSettings()
    const lines = [
      fonts.sansBold(`📢 ${botname.toUpperCase()} ALERT`),
      separator(theme, 25),
      '',
      fonts.bold(title.toUpperCase()),
      '',
      msg
    ]
    return buildFrame(lines, theme)
  }
}

// ─────────────────────────────────────────────
// HELPER — Auto-log box usage
// ─────────────────────────────────────────────
export async function sendBox(sock, jid, boxText, quoted = null) {
  try {
    await sock.sendMessage(jid, { text: boxText }, { quoted })
    logger.cmd('BOX', 'Sent box message', { jid })
  } catch (e) {
    logger.error('BOX', 'Failed to send box', e.message)
  }
}