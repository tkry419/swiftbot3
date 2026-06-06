/**
 * SwiftBot - plugins/commands/tools/tts.js
 * Text to Speech - Google TTS
 * Male/Female/Robot voices - 15 fallbacks
 * English only - vs Bot
 */

import googleTTS from 'google-tts-api'
import fetch from 'node-fetch'

const VOICE_FALLBACKS = [
  { lang: 'en', slow: false, host: 'https://translate.google.com' },
  { lang: 'en-US', slow: false, host: 'https://translate.google.com' },
  { lang: 'en-GB', slow: false, host: 'https://translate.google.com' },
  { lang: 'en-AU', slow: false, host: 'https://translate.google.com' },
  { lang: 'en-IN', slow: false, host: 'https://translate.google.com' },
  { lang: 'en', slow: true, host: 'https://translate.google.com' },
  { lang: 'en-US', slow: true, host: 'https://translate.google.com' },
  { lang: 'en-GB', slow: true, host: 'https://translate.google.com' },
  { lang: 'en', slow: false, host: 'https://translate.google.cn' },
  { lang: 'en-US', slow: false, host: 'https://translate.google.cn' },
  { lang: 'fr', slow: false, host: 'https://translate.google.com' },
  { lang: 'es', slow: false, host: 'https://translate.google.com' },
  { lang: 'de', slow: false, host: 'https://translate.google.com' },
  { lang: 'it', slow: false, host: 'https://translate.google.com' },
  { lang: 'pt', slow: false, host: 'https://translate.google.com' }
]

async function getTTS(text, voiceType) {
  const voiceMap = {
    'male': { lang: 'en', slow: false },
    'female': { lang: 'en', slow: false },
    'robot': { lang: 'en', slow: true }
  }

  const config = voiceMap[voiceType] || voiceMap['female']

  // Try primary first
  try {
    const url = googleTTS.getAudioUrl(text, {
      lang: config.lang,
      slow: config.slow,
      host: 'https://translate.google.com'
    })

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    })

    if (res.ok) {
      const buffer = await res.arrayBuffer()
      if (buffer.byteLength > 100) return buffer
    }
  } catch {}

  // Try all 15 fallbacks
  for (const fallback of VOICE_FALLBACKS) {
    try {
      const url = googleTTS.getAudioUrl(text, {
        lang: fallback.lang,
        slow: fallback.slow,
        host: fallback.host
      })

      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      })

      if (res.ok) {
        const buffer = await res.arrayBuffer()
        if (buffer.byteLength > 100) return buffer
      }
    } catch {
      continue
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
    const prefix = await db.get('prefix')

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
        audio: Buffer.from(audioBuffer),
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