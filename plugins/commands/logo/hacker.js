/**
 * SwiftBot - plugins/commands/logo/hacker.js
 * Hacker Logo Generator - Anonymous Style
 * Owner/Public - Real APIs + Sharp Fallback
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import FormData from 'form-data'
import sharp from 'sharp'

// HACKER STYLE APIS
const HACKER_APIS = [
  {
    name: 'ephoto-hacker1',
    url: 'https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html',
    type: 'scrape'
  },
  {
    name: 'ephoto-hacker2',
    url: 'https://en.ephoto360.com/create-anonymous-hacker-avatar-with-guy-fawkes-mask-672.html',
    type: 'scrape'
  },
  {
    name: 'ephoto-hacker3',
    url: 'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
    type: 'scrape'
  },
  {
    name: 'textpro-cyber',
    url: 'https://textpro.me/create-cyberpunk-text-effect-online-1021.html',
    type: 'scrape'
  },
  {
    name: 'textpro-matrix',
    url: 'https://textpro.me/create-matrix-style-text-effect-online-1020.html',
    type: 'scrape'
  }
]

async function createHackerLogo(text, logger) {
  // Try APIs first
  for (const api of HACKER_APIS) {
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
          logger?.info('HACKER', `Success from ${api.name}`)
          return imageUrl
        }
      }

    } catch (e) {
      logger?.warn('HACKER', `${api.name} failed: ${e.message}`)
      continue
    }
  }

  // FALLBACK: Local SVG Hacker Style
  try {
    const width = 1024
    const height = 1024

    const svg = `
      <svg width="${width}" height="${height}">
        <defs>
          <radialGradient id="bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style="stop-color:#001a1a;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
          </radialGradient>
          <linearGradient id="neon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#00ffff;stop-opacity:1" />
            <stop offset="50%" style="stop-color:#00ff88;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#00ffff;stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="12" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <filter id="shadow">
            <feDropShadow dx="0" dy="0" stdDeviation="20" flood-color="#00ffff"/>
          </filter>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bg)"/>

        <!-- Hooded Figure Silhouette -->
        <path d="M 512 300
                 C 400 300, 350 400, 350 500
                 L 350 700
                 C 350 750, 380 800, 450 800
                 L 574 800
                 C 644 800, 674 750, 674 700
                 L 674 500
                 C 674 400, 624 300, 512 300
                 Z"
              fill="#000000" opacity="0.9" filter="url(#shadow)"/>

        <!-- Mask -->
        <ellipse cx="512" cy="450" rx="80" ry="100" fill="#000000" stroke="#00ffff" stroke-width="3" filter="url(#glow)"/>
        <path d="M 472 430 L 492 450 L 472 470" stroke="#00ffff" stroke-width="4" fill="none" filter="url(#glow)"/>
        <path d="M 552 430 L 532 450 L 552 470" stroke="#00ffff" stroke-width="4" fill="none" filter="url(#glow)"/>
        <path d="M 492 480 Q 512 495 532 480" stroke="#00ffff" stroke-width="4" fill="none" filter="url(#glow)"/>

        <!-- Hand Gesture -->
        <path d="M 400 600 Q 420 580 440 600 L 450 620" stroke="#000000" stroke-width="20" fill="none"/>

        <!-- Text -->
        <text x="50%" y="20%" font-family="Arial Black, sans-serif" font-size="90" font-weight="900"
              fill="url(#neon)" text-anchor="middle" filter="url(#glow)">${text.toUpperCase()}</text>

        <!-- Ghost Text Behind -->
        <text x="50%" y="20%" font-family="Arial Black, sans-serif" font-size="90" font-weight="900"
              fill="#00ffff" text-anchor="middle" opacity="0.2">${text.toUpperCase()}</text>
      </svg>
    `

    const buffer = await sharp(Buffer.from(svg))
   .png({ quality: 95 })
   .toBuffer()

    logger?.info('HACKER', 'Success from local fallback')
    return buffer

  } catch (e) {
    logger?.error('HACKER', `Fallback failed: ${e.message}`)
    return null
  }
}

export default {
  name: 'hacker',
  alias: ['anon', 'anonymous', 'cyber'],
  desc: 'Create hacker/anonymous logo',
  usage: '[text]',
  category: 'Logo',
  permission: 'public',

  execute: async (sock, m, args, { prefix, logger }) => {
    const from = m.key.remoteJid
    const text = args.join(' ')

    if (!text) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ ❌ Enter hacker name
║
║ 📝 USAGE:
║ ${prefix}hacker GHOST
║ ${prefix}anon CYBER
║ ${prefix}anonymous MATRIX
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (text.length > 15) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Text too long\n║ Max: 15 characters\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⚡', key: m.key }
    })

    try {
      const result = await createHackerLogo(text, logger)

      if (!result) {
        throw new Error('Logo generation failed')
      }

      // Handle URL or Buffer
      if (typeof result === 'string') {
        await sock.sendMessage(from, {
          image: { url: result },
          caption: `⚡ HACKER: ${text.toUpperCase()}\n\nFLASH-MD V3 - Logo Generator`
        }, { quoted: m })
      } else {
        await sock.sendMessage(from, {
          image: result,
          caption: `⚡ HACKER: ${text.toUpperCase()}\n\nFLASH-MD V3 - Logo Generator`
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('HACKER', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Failed to create logo\n║ ${e.message}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}