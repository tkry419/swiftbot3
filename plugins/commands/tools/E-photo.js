/**
 * SwiftBot - plugins/commands/ephoto/ephoto.js
 * E-Photo360 Text Effects - 30+ Styles
 * Owner/Public - Real E-Photo360 2026 Method
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import FormData from 'form-data'

// 30+ EPHOTO360 STYLES - REAL 2026 LINKS
const EPHOTO_STYLES = {
  // TEXT EFFECTS
  glitchtext: 'https://en.ephoto360.com/create-digital-glitch-text-effects-online-767.html',
  writetext: 'https://en.ephoto360.com/write-text-on-wet-glass-online-589.html',
  advancedglow: 'https://en.ephoto360.com/advanced-glow-text-effect-873.html',
  typographytext: 'https://en.ephoto360.com/create-typography-text-effect-on-pavement-online-774.html',
  pixelglitch: 'https://en.ephoto360.com/create-pixel-glitch-text-effect-online-769.html',
  neonglitch: 'https://en.ephoto360.com/create-impressive-neon-glitch-text-effects-online-768.html',
  flagtext: 'https://en.ephoto360.com/nigeria-3d-flag-text-effect-online-free-753.html',
  flag3dtext: 'https://en.ephoto360.com/free-online-american-flag-3d-text-effect-generator-725.html',
  deletingtext: 'https://en.ephoto360.com/create-eraser-deleting-text-effect-online-717.html',
  blackpinkstyle: 'https://en.ephoto360.com/online-blackpink-style-logo-maker-effect-711.html',
  glowingtext: 'https://en.ephoto360.com/create-glowing-text-effects-online-706.html',
  underwatertext: 'https://en.ephoto360.com/3d-underwater-text-effect-online-682.html',
  papercutstyle: 'https://en.ephoto360.com/multicolor-3d-paper-cut-style-text-effect-658.html',
  watercolortext: 'https://en.ephoto360.com/create-a-watercolor-text-effect-online-655.html',
  effectclouds: 'https://en.ephoto360.com/write-text-effect-clouds-in-the-sky-online-619.html',
  gradienttext: 'https://en.ephoto360.com/create-3d-gradient-text-effect-online-600.html',
  summerbeach: 'https://en.ephoto360.com/write-in-sand-summer-beach-online-free-595.html',
  luxurygold: 'https://en.ephoto360.com/create-a-luxury-gold-text-effect-online-594.html',
  multicoloredneon: 'https://en.ephoto360.com/create-multicolored-neon-light-signatures-591.html',
  sandsummer: 'https://en.ephoto360.com/write-in-sand-summer-beach-online-576.html',
  galaxywallpaper: 'https://en.ephoto360.com/create-galaxy-wallpaper-mobile-online-564.html',
  style1917: 'https://en.ephoto360.com/1917-style-text-effect-523.html',
  makingneon: 'https://en.ephoto360.com/making-neon-light-text-effect-with-galaxy-style-521.html',
  royaltext: 'https://en.ephoto360.com/royal-text-effect-online-free-471.html',
  freecreate: 'https://en.ephoto360.com/free-create-a-3d-hologram-text-effect-441.html',
  galaxystyle: 'https://en.ephoto360.com/create-galaxy-style-free-name-logo-438.html',
  lighteffects: 'https://en.ephoto360.com/create-light-effects-green-neon-online-429.html',
  
  // LOGO MAKERS
  logomaker: 'https://en.ephoto360.com/free-gaming-logo-maker-for-fps-game-team-546.html',
  cartoonstyle: 'https://en.ephoto360.com/create-a-cartoon-style-graffiti-text-effect-online-668.html',
  blackpinklogo: 'https://en.ephoto360.com/create-blackpink-logo-online-free-464.html',
  createlogo: 'https://en.ephoto360.com/create-anonymous-hacker-avatars-cyan-neon-677.html'
}

async function createEphoto(text, url, logger) {
  try {
    // Step 1: Get form page
    const { data: html } = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://en.ephoto360.com/'
      }
    })

    const $ = cheerio.load(html)
    const token = $('#token').val() || $('input[name="token"]').val()
    const build_server = $('#build_server').val() || $('input[name="build_server"]').val()
    const build_server_id = $('#build_server_id').val() || $('input[name="build_server_id"]').val()

    if (!token) throw new Error('Token not found')

    // Step 2: Submit text
    const form = new FormData()
    form.append('text[]', text)
    form.append('token', token)
    form.append('build_server', build_server)
    form.append('build_server_id', build_server_id)

    const { data: result } = await axios.post(url, form, {
      timeout: 25000,
      headers: {
        ...form.getHeaders(),
        'User-Agent': 'Mozilla/5.0',
        'Referer': url
      }
    })

    // Step 3: Get image URL
    const $result = cheerio.load(result)
    const formValue = $result('#form_value_input').val() || 
                     $result('input[name="form_value_input"]').val()

    if (!formValue) throw new Error('Form value not found')

    const { data: imgData } = await axios.get(
      `https://en.ephoto360.com/effect/create-image?form_value_input=${formValue}`,
      { 
        timeout: 25000,
        headers: { 'User-Agent': 'Mozilla/5.0' }
      }
    )

    let imageUrl = null
    if (imgData?.success && imgData?.image_url) {
      imageUrl = imgData.image_url
    } else if (imgData?.fullsize_image) {
      imageUrl = 'https://en.ephoto360.com' + imgData.fullsize_image
    } else if (imgData?.image) {
      imageUrl = imgData.image
    }

    if (imageUrl && imageUrl.startsWith('http')) {
      logger?.info('EPHOTO', 'Success')
      return imageUrl
    }

    throw new Error('Image URL not found')

  } catch (e) {
    logger?.warn('EPHOTO', `Failed: ${e.message}`)
    return null
  }
}

export default {
  name: 'ephoto',
  alias: Object.keys(EPHOTO_STYLES),
  desc: 'E-Photo360 Text Effects - 30+ Styles',
  usage: '[style] [text]',
  category: 'Tools',
  permission: 'public',

  execute: async (sock, m, args, { prefix, command, logger }) => {
    const from = m.key.remoteJid
    const style = command.toLowerCase()
    
    // LIST ALL STYLES
    if (!args[0] || args[0] === 'list' || args[0] === 'help') {
      const styles = Object.keys(EPHOTO_STYLES).map(s => `${prefix}${s}`).join('\n║ 𖠁 ')
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *ᴇ-ᴘʜᴏᴛᴏ ᴍᴇɴᴜ* ⌬
╠═══════════════════
║ 𖠁 ${styles}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}glitchtext Swift
║ ${prefix}blackpinklogo YourName
║ ${prefix}luxurygold Text
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const text = args.join(' ')

    if (!text) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter text\n║ Example: ${prefix}${style} Swift\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (text.length > 30) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Text too long\n║ Max: 30 characters\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const url = EPHOTO_STYLES[style]
    if (!url) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid style\n║ Use: ${prefix}ephoto list\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const imageUrl = await createEphoto(text, url, logger)

      if (!imageUrl) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Couldn't create effect\n║ Try again later\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: `🎨 E-PHOTO: ${style.toUpperCase()}\n📝 Text: ${text}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('EPHOTO', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}