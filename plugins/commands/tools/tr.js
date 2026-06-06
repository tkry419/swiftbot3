/**
 * SwiftBot - plugins/commands/tools/translate.js
 * Translate - Google Translate API
 * Reply message or text after command
 */

import translate from 'google-translate-api-x'

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'translate',
  alias: ['tr', 'tafsiri', 'trans'],
  desc: 'Translate to any language',
  usage: '[lang] text or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    // Get text from reply or args
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let lang = 'en'
    let text = ''

    if (quotedText && args.length === 0) {
      text = quotedText
    } else if (quotedText && args.length === 1) {
      lang = args[0].toLowerCase()
      text = quotedText
    } else if (args.length >= 2) {
      lang = args[0].toLowerCase()
      text = args.slice(1).join(' ')
    } else if (args.length === 1) {
      text = args[0]
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}tr sw Hello\n║ ${prefix}tr en Habari\n║ Reply message ${prefix}tr fr\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!text) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No text found\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    try {
      const result = await translate(text, { to: lang })

      // Send ONLY the translated text - no mambo mengi
      await sock.sendMessage(from, {
        text: result.text
      }, { quoted: m })

    } catch (error) {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Translation failed\n║ Invalid language code?\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}