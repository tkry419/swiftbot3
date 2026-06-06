/**
 * SwiftBot - plugins/commands/logo/lovelogo.js
 * Love Logo Maker - Couple Names
 * Owner/Public - Real APIs + Local Fallback
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import FormData from 'form-data'
import sharp from 'sharp'

// LOVE THEME APIS
const LOVE_APIS = [
  {
    name: 'ephoto-love1',
    url: 'https://en.ephoto360.com/create-love-messages-on-the-sky-with-clouds-594.html',
    type: 'scrape'
  },
  {
    name: 'ephoto-love2',
    url: 'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
    type: 'scrape'
  },
  {
    name: 'ephoto-love3',
    url: 'https://en.ephoto360.com/create-a-love-shape-typography-printing-599.html',
    type: 'scrape'
  },
  {
    name: 'ephoto-love4',
    url: 'https://en.ephoto360.com/write-in-sand-summer-beach-online-576.html',
    type: 'scrape'
  },
  {
    name: 'ephoto-love5',
    url: 'https://en.ephoto360.com/write-text-on-the-beach-online-605.html',
    type: 'scrape'
  }
]

async function createLoveLogo(text, logger) {
  // Try APIs first
  for (const api of LOVE_APIS) {
    try {
      const { data: html } = await axios.get(api.url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Referer': 'https://en.ephoto360.com/'
        }
      })

      const $ = cheerio.load(html)
      const token = $('#token').val() || $('input[name="token"]').val()
      const build_server = $('#build_server').val() || $('input[name="build_server"]').val()
      const build_server_id = $('#build_server_id').val() || $('input[name="build_server_id"]').val()

      if (!token) continue

      const form = new FormData()
      form.append('text[]', text)
      form.append('token', token)
      form.append('build_server', build_server)
      form.append('build_server_id', build_server_id)

      const { data: result } = await axios.post(api.url, form, {
        timeout: 25000,
        headers: {
        ...form.getHeaders(),
          'User-Agent': 'Mozilla/5.0',
          'Referer': api.url
        }
      })

      const $result = cheerio.load(result)
      const formValue = $result('#form_value_input').val() ||
                       $result('input[name="form_value_input"]').val()

      if (formValue) {
        const { data: imgData } = await axios.get(
          `https://en.ephoto360.com/effect/create-image?form_value_input=${formValue}`,
          { timeout: 25000 }
        )

        let imageUrl = null
        if (imgData?.success && imgData?.image_url) {
          imageUrl = imgData.image_url
        } else if (imgData?.fullsize_image) {
          imageUrl = 'https://en.ephoto360.com' + imgData.fullsize_image
        }

        if (imageUrl) {
          logger?.info('LOVELOGO', `Success from ${api.name}`)
          return imageUrl
        }
      }

    } catch (e) {
      logger?.warn('LOVELOGO', `${api.name} failed: ${e.message}`)
      continue
    }
  }

  // FALLBACK: Local SVG with Sharp
  try {
    const width = 1024
    const height = 512
    const [name1, name2] = text.split(' ❤️ ')

    const svg = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1a0033;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#4a0080;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="text" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#ff1493;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#ff69b4;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#ff1493;stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bg)"/>
        <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="80" font-weight="bold"
              fill="url(#text)" text-anchor="middle" filter="url(#glow)">${name1 || text}</text>
        <text x="50%" y="55%" font-family="Arial, sans-serif" font-size="60"
              fill="#ff69b4" text-anchor="middle">❤️</text>
        <text x="50%" y="70%" font-family="Arial, sans-serif" font-size="80" font-weight="bold"
              fill="url(#text)" text-anchor="middle" filter="url(#glow)">${name2 || ''}</text>
      </svg>
    `

    const buffer = await sharp(Buffer.from(svg))
    .png({ quality: 95 })
    .toBuffer()

    logger?.info('LOVELOGO', 'Success from local fallback')
    return buffer

  } catch (e) {
    logger?.error('LOVELOGO', `Fallback failed: ${e.message}`)
    return null
  }
}

export default {
  name: 'lovelogo',
  alias: ['love', 'couple', 'ship'],
  desc: 'Create love logo with two names',
  usage: '[name1] [name2] or tag/reply',
  category: 'Logo',
  permission: 'public',

  execute: async (sock, m, args, { prefix, pushName, logger }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    let name1 = null
    let name2 = null

    // METHOD 1: Two tags
    if (mentioned.length >= 2) {
      name1 = mentioned[0].split('@')[0]
      name2 = mentioned[1].split('@')[0]
    }
    // METHOD 2: One tag + pushname
    else if (mentioned.length === 1) {
      name1 = pushName || m.pushName || 'You'
      name2 = mentioned[0].split('@')[0]
    }
    // METHOD 3: Reply message
    else if (quoted) {
      name1 = pushName || m.pushName || 'You'
      name2 = quoted?.pushName || 'Them'
    }
    // METHOD 4: Two names in args
    else if (args.length >= 2) {
      name1 = args[0]
      name2 = args.slice(1).join(' ')
    }
    // METHOD 5: One name + pushname
    else if (args.length === 1) {
      name1 = pushName || m.pushName || 'You'
      name2 = args[0]
    }
    else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ ❌ Need two names
║
║ 📝 USAGE:
║ ${prefix}lovelogo John Mary
║ ${prefix}love @user1 @user2
║ ${prefix}couple @user
║ (reply message)${prefix}ship
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Clean names
    name1 = name1.replace(/[@\s]/g, '').slice(0, 15)
    name2 = name2.replace(/[@\s]/g, '').slice(0, 15)
    const text = `${name1} ❤️ ${name2}`

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '💕', key: m.key }
    })

    try {
      const result = await createLoveLogo(text, logger)

      if (!result) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Couldn't create love logo\n║ Try again later\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      // Handle URL or Buffer
      if (typeof result === 'string') {
        await sock.sendMessage(from, {
          image: { url: result },
          caption: `💕 LOVE LOGO\n𖠁 ${name1} ❤️ ${name2}`
        }, { quoted: m })
      } else {
        await sock.sendMessage(from, {
          image: result,
          caption: `💕 LOVE LOGO\n𖠁 ${name1} ❤️ ${name2}`
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('LOVELOGO', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}