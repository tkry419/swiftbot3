/**
 * SwiftBot - plugins/commands/tools/emojimix.js
 * Mix 2 Emojis - EmojiKitchen 15 Fallbacks
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const EMOJI_KITCHEN_APIS = [
  'https://www.gstatic.com/android/keyboard/emojikitchen',
  'https://emojikitchen.dev/api',
  'https://api.emojikitchen.dev/v1',
  'https://emoji.supply/kitchen',
  'https://emojimix.vercel.app/api',
  'https://emojikitchen.app/api',
  'https://api.emojikitchen.cc/v1',
  'https://emojikitchendev.com/api',
  'https://emojimix-api.vercel.app/api',
  'https://emoji-mixer.vercel.app/api',
  'https://emojikitchen-api.vercel.app',
  'https://emoji-combiner.vercel.app/api',
  'https://emojikitchen-beta.vercel.app/api',
  'https://emojikitchen-unofficial.vercel.app',
  'https://emoji-kitchen.vercel.app/api'
]

function getUnicode(emoji) {
  return [...emoji].map(e => e.codePointAt(0).toString(16)).join('-')
}

async function mixEmojis(emoji1, emoji2) {
  const code1 = getUnicode(emoji1)
  const code2 = getUnicode(emoji2)

  // Try all 15 API endpoints
  for (const baseUrl of EMOJI_KITCHEN_APIS) {
    const urls = [
      `${baseUrl}/${code1}/${code2}.png`,
      `${baseUrl}/${code2}/${code1}.png`,
      `${baseUrl}/mix?emoji1=${encodeURIComponent(emoji1)}&emoji2=${encodeURIComponent(emoji2)}`,
      `${baseUrl}/combine/${code1}/${code2}`,
      `${baseUrl}/emoji/${code1}-${code2}.png`
    ]

    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        })

        if (res.ok && res.headers.get('content-type')?.includes('image')) {
          const buffer = await res.arrayBuffer()
          if (buffer.byteLength > 1000) return Buffer.from(buffer)
        }
      } catch {
        continue
      }
    }
  }
  return null
}

export default {
  name: 'emojimix',
  alias: ['emix', 'mixemoji', 'combine'],
  desc: 'Mix 2 emojis - 15 fallbacks',
  usage: 'emoji1+emoji2',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}emojimix 😂+😭\n║ ${prefix}emojimix ❤️+🔥\n║ ${prefix}emojimix 🥺+👉\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const input = args.join(' ')
    const parts = input.split('+').map(e => e.trim())

    if (parts.length!== 2) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Use + to separate\n║ Example: 😂+😭\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const [emoji1, emoji2] = parts

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const mixedBuffer = await mixEmojis(emoji1, emoji2)

      if (!mixedBuffer) throw new Error('MIX_FAILED')

      await sock.sendMessage(from, {
        sticker: mixedBuffer
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Mix failed\n║ Try different emojis\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}