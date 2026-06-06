/**
 * SwiftBot - plugins/commands/tools/password.js
 * Password Generator - Custom length, symbols, numbers, caps
 * With Copy Button - vs Bot
 */

import crypto from 'crypto'

function generatePassword(options) {
  const {
    length = 12,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
    excludeSimilar = false,
    excludeAmbiguous = false
  } = options

  let charset = ''

  if (uppercase) charset += excludeSimilar? 'ABCDEFGHJKLMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (lowercase) charset += excludeSimilar? 'abcdefghijkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
  if (numbers) charset += excludeSimilar? '23456789' : '0123456789'
  if (symbols) charset += excludeAmbiguous? '!@#$%^&*()_+-=' : '!@#$%^&*()_+-=[]{}|;:,.<>?'

  if (!charset) charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  let password = ''
  const randomBytes = crypto.randomBytes(length)

  for (let i = 0; i < length; i++) {
    password += charset[randomBytes[i] % charset.length]
  }

  return password
}

function getStrength(password) {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (password.length >= 16) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  if (score <= 2) return { text: 'Weak', emoji: '🔴' }
  if (score <= 4) return { text: 'Medium', emoji: '🟡' }
  if (score <= 6) return { text: 'Strong', emoji: '🟢' }
  return { text: 'Very Strong', emoji: '🛡️' }
}

export default {
  name: 'password',
  alias: ['pass', 'genpass', 'pwd', 'pw'],
  desc: 'Generate secure password with custom options',
  usage: '[length] [options] or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix') || '.'
    const botname = await db.get('botname') || 'SwiftBot'

    // Default options
    let options = {
      length: 12,
      uppercase: true,
      lowercase: true,
      numbers: true,
      symbols: true,
      excludeSimilar: false,
      excludeAmbiguous: false
    }

    // Parse args
    if (args.length > 0) {
      // Check if first arg is number (length)
      if (/^\d+$/.test(args[0])) {
        options.length = Math.min(Math.max(parseInt(args[0]), 4), 64) // 4-64 chars
        args.shift()
      }

      // Parse flags
      const flags = args.join(' ').toLowerCase()

      if (flags.includes('no-caps') || flags.includes('nocaps')) options.uppercase = false
      if (flags.includes('no-lower') || flags.includes('nolower')) options.lowercase = false
      if (flags.includes('no-num') || flags.includes('nonumber') || flags.includes('nonum')) options.numbers = false
      if (flags.includes('no-sym') || flags.includes('nosymbol') || flags.includes('nosym')) options.symbols = false
      if (flags.includes('no-similar') || flags.includes('nosimilar')) options.excludeSimilar = true
      if (flags.includes('no-ambiguous') || flags.includes('noambiguous')) options.excludeAmbiguous = true

      // Quick presets
      if (flags.includes('simple')) {
        options = { length: 8, uppercase: true, lowercase: true, numbers: true, symbols: false }
      }
      if (flags.includes('strong')) {
        options = { length: 16, uppercase: true, lowercase: true, numbers: true, symbols: true }
      }
      if (flags.includes('pin')) {
        options = { length: 6, uppercase: false, lowercase: false, numbers: true, symbols: false }
      }
      if (flags.includes('memorable')) {
        options = { length: 12, uppercase: true, lowercase: true, numbers: true, symbols: false, excludeSimilar: true }
      }
    }

    if (args[0] === 'help' || args[0] === '--help') {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ PASSWORD GENERATOR\n╠═══════════════════\n║ Usage:\n║ ${prefix}pass 16\n║ ${prefix}pass 12 no-sym\n║ ${prefix}pass 20 strong\n║ ${prefix}pass pin\n║ ${prefix}pass simple\n║ ${prefix}pass memorable\n║\n║ Options:\n║ no-caps - No uppercase\n║ no-lower - No lowercase\n║ no-num - No numbers\n║ no-sym - No symbols\n║ no-similar - Exclude 0,O,1,l\n║ no-ambiguous - Exclude {}[]\n║\n║ Presets:\n║ simple - 8 chars, no symbols\n║ strong - 16 chars, all\n║ pin - 6 digits only\n║ memorable - Easy to read\n║\n║ Length: 4-64 chars\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    try {
      const password = generatePassword(options)
      const strength = getStrength(password)

      const charsetInfo = []
      if (options.uppercase) charsetInfo.push('A-Z')
      if (options.lowercase) charsetInfo.push('a-z')
      if (options.numbers) charsetInfo.push('0-9')
      if (options.symbols) charsetInfo.push('!@#$')

      const text = `╔═━━━━━━━━━━━━━━━━═❒\n║ 🔑 Password Generated\n╠═══════════════════\n║ • Length: ${options.length}\n║ • Strength: ${strength.emoji} ${strength.text}\n║ • Charset: ${charsetInfo.join(', ')}\n║ • Password: ${password}\n╠═══════════════════\n║ Tap button below to copy\n║ ${botname}\n╚━━━━━━━━━━━━━━━━━═❒`

      // Send with copy button
      await sock.sendMessage(from, {
        text: text,
        footer: 'SwiftBot Password Generator',
        buttons: [
          {
            buttonId: `copy_pass_${password}`,
            buttonText: { displayText: '📋 Copy Password' },
            type: 1
          }
        ],
        headerType: 1
      }, { quoted: m })

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Generation failed\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}