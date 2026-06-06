/**
 * SwiftBot - plugins/commands/tools/tts.js
 * Text to Speech - Google TTS Direct
 * Male/Female/Robot voices - 15 fallbacks
 * No external deps except node-fetch
 */

import fetch from 'node-fetch'

const VOICE_SERVERS = [
  'https://translate.google.com',
  'https://translate.google.cn',
  'https://translate.google.com.sg',
  'https://translate.google.co.uk',
  'https://translate.google.com.au'
]

const VOICE_CONFIGS = [
  { lang: 'en', slow: false },
  { lang: 'en-US', slow: false },
  { lang: 'en-GB', slow: false },
  { lang: 'en-AU', slow: false },
  { lang: 'en-IN', slow: false },
  { lang: 'en', slow: true },
  { lang: 'en-US', slow: true },
  { lang: 'en-GB', slow: true },
  { lang: 'en-AU', slow: true },
  { lang: 'en-IN', slow: true },
  { lang: 'en-CA', slow: false },
  { lang: 'en-IE', slow: false },
  { lang: 'en-ZA', slow: false },
  { lang: 'en-NG', slow: false },
  { lang: 'en-PH', slow: false }
]

function buildTTSUrl(text, lang, slow, host) {
  const encoded = encodeURIComponent(text)
  return `${host}/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob&ttsspeed=${slow? '0.24' : '1'}`
}

async function getTTS(text, voiceType) {
  const slowMode = voiceType === 'robot'

  // Try all combinations
  for (const server of VOICE_SERVERS) {
    for (const config of VOICE_CONFIGS) {
      try {
        const url = buildTTSUrl(text, config.lang, slowMode || config.slow, server)

        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://translate.google.com/'
          },
          timeout: 10000
        })

        if (!res.ok) continue

        const buffer = await res.buffer()
        if (buffer.length > 100) return buffer

      } catch {
        continue
      }
    }
  }
  throw new Error('ALL_FAILED')
}

export default {
  name: 'tts',
  alias: ['speak', 'say', 'voice'],
  desc: 'Text to speech - male/female/robot',
  usage: '[male|female|robot] text or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix') || '.'

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let voiceType = 'female'
    let text = ''

    if (quotedText && args.length === 0) {
      text = quotedText
    } else if (quotedText && args.length === 1 && ['male', 'female', 'robot'].includes(args[0].toLowerCase())) {
      voiceType = args[0].toLowerCase()
      text = quotedText
    } else if (args.length >= 2) {
      if (['male', 'female', 'robot'].includes(args[0].toLowerCase())) {
        voiceType = args[0].toLowerCase()
        text = args.slice(1).join(' ')
      } else {
        text = args.join(' ')
      }
    } else if (args.length === 1) {
      text = args[0]
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}tts male Hello\n║ ${prefix}tts female Hello\n║ ${prefix}tts robot Hello\n║ Reply message ${prefix}tts\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!text) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ No text found\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (text.length > 200) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Text too long\n║ Max: 200 chars\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const audioBuffer = await getTTS(text, voiceType)

      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ TTS failed\n║ Try shorter text\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}