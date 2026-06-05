/**
 * SwiftBot - system/box.js
 * Boxes/formatting engine — Real-time from DB
 * Uses fonts.js for styles, db.js for prefix/botname
 * No hardcode — everything updates live
 * NO EMOJIS - SWIFTBOT STYLE ONLY
 */

import { db } from './db.js'
import { fonts } from './fonts.js'
import { logger } from './logger.js'

// ─────────────────────────────────────────────
// 30 PREMIUM SWIFTBOT BOX STYLES — NO EMOJIS
// ─────────────────────────────────────────────
const BOX_STYLES = {
  '1': { name: 'Classic', top: '╔═━━━━━━━━━━━━━━━━═❒', line: '║ 𖠁 ', bottom: '╚━━━━━━━━━━━━━━━━━═❒' },
  '2': { name: 'Double', top: '╔═══━━━━━━━━━━━━━═══╗', line: '║ 𖠁 ', bottom: '╚═══━━━━━━━━━━━━━═══╝' },
  '3': { name: 'Rounded', top: '╭──━━━━━━━━━━━━─╮', line: '│ 𖠁 ', bottom: '╰──━━━━━━━━━━━━─╯' },
  '4': { name: 'Thick', top: '┏━━━━━━━━━━━━━━━━┓', line: '┃ 𖠁 ', bottom: '┗━━━━━━━━━━━━━━━━┛' },
  '5': { name: 'Cyber', top: '┏━[ SYSTEM ]━━━━━┓', line: '┃ 𖠁 ', bottom: '┗━━━━━━━━━━━━━━━━━┛' },
  '6': { name: 'Royal', top: '╔═━[ ROYAL ]━═╗', line: '║ 𖠁 ', bottom: '╚═━━━━━━━━━━━━═╝' },
  '7': { name: 'Shadow', top: '▛▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▜', line: '▌ 𖠁 ', bottom: '▙▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▟' },
  '8': { name: 'Tech', top: '◢◤◢◤◢◤◢◤', line: '◢◤ 𖠁 ', bottom: '◥◣◥◣' },
  '9': { name: 'Diamond', top: '◆━━━━━[ DATA ]━━━━━◆', line: '◆ 𖠁 ', bottom: '◆━━━━━━━━━━━━━━━━◆' },
  '10': { name: 'Matrix', top: '▓▒░▒▓▒░▒▓▒░▒▓', line: '▓▒░ 𖠁 ', bottom: '▓▒░▒▓▒░▒▓▒░▒▓' },
  '11': { name: 'Wave', top: '〰〰〰〰', line: '〰 𖠁 ', bottom: '〰〰〰〰' },
  '12': { name: 'Arrow', top: '➤───────────────➤', line: '➤ 𖠁 ', bottom: '➤───────────────➤' },
  '13': { name: 'Star', top: '★━━━━━━━━━━━━━━━★', line: '★ 𖠁 ', bottom: '★━━━━━━━━━━━━━━━★' },
  '14': { name: 'Minimal', top: '─────────────────', line: ' 𖠁 ', bottom: '─────────────────' },
  '15': { name: 'Bold', top: '▰▰▰▰▰▰▰▰▰▰▰', line: '▰ 𖠁 ', bottom: '▰▰▰▰▰▰▰▰▰▰▰' },
  '16': { name: 'Dotted', top: '┄┄┄┄┄', line: '┊ 𖠁 ', bottom: '┄┄┄┄┄' },
  '17': { name: 'Gradient', top: '░▒▓█▓▒░▒▓█▓▒░', line: '█▓▒ 𖠁 ', bottom: '░▒▓█▓▒░▒▓█▓▒░' },
  '18': { name: 'Frame', top: '▛▀▀▀▀▀▀▀▀▀▀▀▀▀▜', line: '▌ 𖠁 ', bottom: '▙▄▄▄▄▄▄▄▄▄▄▄▟' },
  '19': { name: 'Border', top: '╔═════════════════╗', line: '║ 𖠁 ', bottom: '╚═════════════════╝' },
  '20': { name: 'Premium', top: '✧━━━━━━━━━━━━━━━━━✧', line: '✧ 𖠁 ', bottom: '✧━━━━━━━━━━━━━━━━━✧' },
  '21': { name: 'Lines', top: '│││││', line: '│ 𖠁 ', bottom: '│││││││││' },
  '22': { name: 'Block', top: '█████████████████', line: '█ 𖠁 ', bottom: '█████████████████' },
  '23': { name: 'Clean', top: '┌─────────────────┐', line: '│ 𖠁 ', bottom: '└─────────────────┘' },
  '24': { name: 'Sharp', top: '╔═[ SWIFTBOT ]═╗', line: '║ 𖠁 ', bottom: '╚══════════════╝' },
  '25': { name: 'Solid', top: '███████████████████', line: '██ 𖠁 ', bottom: '███████████████████' },
  '26': { name: 'Outline', top: '╭━━━━━━━━━━━━━━━━━╮', line: '│ 𖠁 ', bottom: '╰━━━━━━━━━━━━━━━━━╯' },
  '27': { name: 'Corner', top: '┌──────────────────┐', line: '│ 𖠁 ', bottom: '└──────────────────┘' },
  '28': { name: 'Wide', top: '╔══════════════════════╗', line: '║ 𖠁 ', bottom: '╚══════════════════════╝' },
  '29': { name: 'Thin', top: '┌─────────────────┐', line: '│ 𖠁 ', bottom: '└─────────────────┘' },
  '30': { name: 'Infinity', top: '♾━━━━━━━━━━━━━━━━━♾', line: '♾ 𖠁 ', bottom: '♾━━━━━━━━━━━━━━━━━♾' },
  'none': { name: 'None', top: '', line: '', bottom: '' }
}

// ─────────────────────────────────────────────
// GET CURRENT SETTINGS — Real-time from DB + Box Style
// ─────────────────────────────────────────────
async function getSettings() {
  const [prefix, botname, boxStyle] = await Promise.all([
    db.get('prefix'),
    db.get('botname'),
    db.get('boxStyle')
  ])

  return {
    prefix: prefix || '#',
    botname: botname || 'SwiftBot',
    boxStyle: boxStyle || '1'
  }
}

// ─────────────────────────────────────────────
// BUILD FRAME — SWIFTBOT STYLE
// ─────────────────────────────────────────────
function buildFrame(lines, styleId = '1') {
  const style = BOX_STYLES[styleId] || BOX_STYLES['1']

  // If style is 'none', return plain text
  if (styleId === 'none') {
    return lines.join('\n')
  }

  const top = style.top
  const bottom = style.bottom
  const middle = lines.map(line => `${style.line}${line}`)

  return [top,...middle, bottom].join('\n')
}

// ─────────────────────────────────────────────
// BUILD SEPARATOR LINE — Uses style
// ─────────────────────────────────────────────
function separator(styleId = '1', width = 20) {
  const style = BOX_STYLES[styleId] || BOX_STYLES['1']
  if (styleId === 'none') return '─'.repeat(width)
  return style.line + '─'.repeat(width)
}

// ─────────────────────────────────────────────
// MAIN BOX FUNCTIONS
// ─────────────────────────────────────────────
export const box = {
  // Simple reply box
  async reply(text, footer = '') {
    const { botname, boxStyle } = await getSettings()
    const lines = []

    lines.push(fonts.sansBold(botname))
    lines.push('')
    lines.push(text)

    if (footer) {
      lines.push('')
      lines.push(fonts.smallCaps(footer))
    }

    return buildFrame(lines, boxStyle)
  },

  // Success box
  async success(msg) {
    const { boxStyle } = await getSettings()
    const lines = [
      fonts.sansBold('SUCCESS'),
      '',
      msg
    ]
    return buildFrame(lines, boxStyle)
  },

  // Error box
  async error(msg) {
    const { boxStyle } = await getSettings()
    const lines = [
      fonts.sansBold('ERROR'),
      '',
      msg
    ]
    return buildFrame(lines, boxStyle)
  },

  // Info box
  async info(title, msg) {
    const { boxStyle } = await getSettings()
    const lines = [
      fonts.sansBold(title.toUpperCase()),
      '',
      msg
    ]
    return buildFrame(lines, boxStyle)
  },

  // List box
  async list(title, items = []) {
    const { boxStyle } = await getSettings()
    const lines = [fonts.sansBold(title.toUpperCase()), '']

    items.forEach((item, i) => {
      lines.push(`${i + 1}. ${fonts.sans(item)}`)
    })

    return buildFrame(lines, boxStyle)
  },

  // Menu box — shows current prefix
  async menu(botname, prefix, categories = []) {
    const { boxStyle } = await getSettings()
    const lines = [
      fonts.sansBold(`${botname.toUpperCase()} MENU`),
      '',
      fonts.smallCaps(`Prefix: ${prefix}`),
      separator(boxStyle, 25),
      ''
    ]

    categories.forEach((cat, i) => {
      lines.push(`${i + 1}. ${fonts.bold(cat.name)}`)
      if (cat.desc) lines.push(` ${fonts.smallCaps(cat.desc)}`)
      lines.push('')
    })

    lines.push(fonts.smallCaps(`Reply with number to view`))
    lines.push(fonts.smallCaps(`Example: ${prefix}menu 1`))

    return buildFrame(lines, boxStyle)
  },

  // Command list for category
  async category(botname, prefix, catName, commands = []) {
    const { boxStyle } = await getSettings()
    const lines = [
      fonts.sansBold(`${botname.toUpperCase()} - ${catName.toUpperCase()}`),
      '',
      fonts.smallCaps(`Prefix: ${prefix}`),
      separator(boxStyle, 25),
      ''
    ]

    commands.forEach(cmd => {
      const usage = cmd.usage? ` ${cmd.usage}` : ''
      lines.push(`${fonts.bold(prefix + cmd.name)}${fonts.sans(usage)}`)
      if (cmd.desc) lines.push(` ${fonts.smallCaps(cmd.desc)}`)
      lines.push('')
    })

    return buildFrame(lines, boxStyle)
  },

  // Stats box
  async stats(data = {}) {
    const { botname, boxStyle } = await getSettings()
    const lines = [
      fonts.sansBold(`${botname.toUpperCase()} STATS`),
      separator(boxStyle, 25),
      ''
    ]

    Object.entries(data).forEach(([key, val]) => {
      const label = key.replace(/([A-Z])/g, ' $1').toUpperCase()
      lines.push(`${fonts.bold(label)}: ${fonts.sans(val)}`)
    })

    return buildFrame(lines, boxStyle)
  },

  // Custom box — full control
  async custom(lines = [], useTitle = true) {
    const { botname, boxStyle } = await getSettings()
    const finalLines = []

    if (useTitle) {
      finalLines.push(fonts.sansBold(botname))
      finalLines.push('')
    }

    finalLines.push(...lines)
    return buildFrame(finalLines, boxStyle)
  },

  // Alert box — for broadcasts
  async alert(title, msg) {
    const { botname, boxStyle } = await getSettings()
    const lines = [
      fonts.sansBold(`${botname.toUpperCase()} ALERT`),
      separator(boxStyle, 25),
      '',
      fonts.bold(title.toUpperCase()),
      '',
      msg
    ]
    return buildFrame(lines, boxStyle)
  },

  // Get all styles — for #setbox command
  getStyles() {
    return BOX_STYLES
  },

  // Plain text - no box
  async text(msg) {
    return msg
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