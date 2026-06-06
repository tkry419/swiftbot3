/**
 * SwiftBot - plugins/commands/gfx/gfx.js
 * GFX Logo Maker - 12 Styles
 * Owner/Public - Uses Jimp + Sharp Only
 */

import Jimp from 'jimp'
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

// 12 GFX STYLES
const GFX_STYLES = {
  gfx1: { name: 'Neon Glow', bg: '#000000', color1: '#00ffff', color2: '#ff00ff' },
  gfx2: { name: 'Fire Text', bg: '#1a0000', color1: '#ff4500', color2: '#ffff00' },
  gfx3: { name: 'Ice Cold', bg: '#000a1a', color1: '#00bfff', color2: '#ffffff' },
  gfx4: { name: 'Toxic Green', bg: '#001a00', color1: '#00ff00', color2: '#7fff00' },
  gfx5: { name: 'Blood Red', bg: '#1a0000', color1: '#ff0000', color2: '#8b0000' },
  gfx6: { name: 'Galaxy', bg: '#0a001a', color1: '#9400d3', color2: '#4b0082' },
  gfx7: { name: 'Gold Luxury', bg: '#1a1a00', color1: '#ffd700', color2: '#ffa500' },
  gfx8: { name: 'Ocean Wave', bg: '#001a1a', color1: '#00ffff', color2: '#008b8b' },
  gfx9: { name: 'Pink Dream', bg: '#1a001a', color1: '#ff1493', color2: '#ff69b4' },
  gfx10: { name: 'Dark Mode', bg: '#0d0d0d', color1: '#ffffff', color2: '#808080' },
  gfx11: { name: 'Sunset', bg: '#1a0a00', color1: '#ff6347', color2: '#ffa500' },
  gfx12: { name: 'Electric', bg: '#001a1a', color1: '#ffff00', color2: '#00ffff' }
}

async function createGFX(text, style, logger) {
  try {
    const width = 1024
    const height = 512

    // Create background with Sharp
    const svgGradient = `
      <svg width="${width}" height="${height}">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${style.bg};stop-opacity:1" />
            <stop offset="100%" style="stop-color:#000000;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="text" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:${style.color1};stop-opacity:1" />
            <stop offset="50%" style="stop-color:${style.color2};stop-opacity:1" />
            <stop offset="100%" style="stop-color:${style.color1};stop-opacity:1" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <rect width="${width}" height="${height}" fill="url(#bg)"/>
        <rect x="10" y="10" width="${width-20}" height="${height-20}"
              fill="none" stroke="${style.color1}" stroke-width="8" filter="url(#glow)"/>
        <text x="50%" y="50%"
              font-family="Impact, Arial, sans-serif"
              font-size="${Math.min(width / (text.length * 0.6), 120)}"
              font-weight="bold"
              fill="url(#text)"
              text-anchor="middle"
              dominant-baseline="middle"
              filter="url(#glow)">${text.toUpperCase()}</text>
      </svg>
    `

    // Convert SVG to PNG with Sharp
    const buffer = await sharp(Buffer.from(svgGradient))
    .png({ quality: 95 })
    .toBuffer()

    // Enhance with Jimp
    const image = await Jimp.read(buffer)
    image.contrast(0.15)
    image.brightness(0.05)

    return await image.getBufferAsync(Jimp.MIME_PNG)

  } catch (e) {
    logger?.error('GFX', `Failed: ${e.message}`)
    return null
  }
}

export default {
  name: 'gfx',
  alias: Object.keys(GFX_STYLES),
  desc: 'GFX Logo Maker - 12 Styles',
  usage: '[style] [text]',
  category: 'GFX',
  permission: 'public',

  execute: async (sock, m, args, { prefix, command, logger }) => {
    const from = m.key.remoteJid
    const styleName = command.toLowerCase()

    // LIST ALL STYLES
    if (!args[0] || args[0] === 'list' || args[0] === 'help') {
      const styles = Object.entries(GFX_STYLES)
    .map(([cmd, data]) => `║ 𖠁 ${prefix}${cmd} - ${data.name}`)
    .join('\n')

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *ɢғx ᴍᴇɴᴜ* ⌬
╠═══════════════════
${styles}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}gfx1 Swift Bot
║ ${prefix}gfx7 SATORU GOJO
║ ${prefix}gfx4 NICKY TECH
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const text = args.join(' ')

    if (!text) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter text\n║ Example: ${prefix}${styleName} Swift\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (text.length > 20) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Text too long\n║ Max: 20 characters\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const style = GFX_STYLES[styleName]
    if (!style) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid style\n║ Use: ${prefix}gfx list\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const imageBuffer = await createGFX(text, style, logger)

      if (!imageBuffer) {
        throw new Error('GFX generation failed')
      }

      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: `🎨 GFX: ${style.name}\n📝 Text: ${text}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('GFX', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Failed to create GFX\n║ ${e.message}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}