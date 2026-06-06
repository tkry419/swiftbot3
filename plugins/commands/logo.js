/**
 * SwiftBot - plugins/commands/logo/logo.js
 * Logo Maker - 15 REAL WORKING APIs 2026
 * From prompt or replied message
 * Owner/Public
 */

import axios from 'axios'
import * as cheerio from 'cheerio'
import FormData from 'form-data'

// 15 REAL WORKING LOGO APIs 2026 - DIFFERENT WEBSITES
const LOGO_APIS = [
  {
    name: 'xteam1',
    type: 'json',
    url: 'https://api.xteam.xyz/textpro/3d-neon-light',
    params: { text: 'TEXT', apikey: 'd90a9e986e18778b' }
  },
  {
    name: 'xteam2',
    type: 'json',
    url: 'https://api.xteam.xyz/textpro/blackpink',
    params: { text: 'TEXT', apikey: 'd90a9e986e18778b' }
  },
  {
    name: 'xteam3',
    type: 'json',
    url: 'https://api.xteam.xyz/textpro/green-horror',
    params: { text: 'TEXT', apikey: 'd90a9e986e18778b' }
  },
  {
    name: 'xteam4',
    type: 'json',
    url: 'https://api.xteam.xyz/textpro/magma-hot',
    params: { text: 'TEXT', apikey: 'd90a9e986e18778b' }
  },
  {
    name: 'xteam5',
    type: 'json',
    url: 'https://api.xteam.xyz/textpro/thunder',
    params: { text: 'TEXT', apikey: 'd90a9e986e18778b' }
  },
  {
    name: 'lolhuman1',
    type: 'direct',
    url: 'https://api.lolhuman.xyz/api/textprome/greenneon',
    params: { text: 'TEXT', apikey: 'GataDiosV3' }
  },
  {
    name: 'lolhuman2',
    type: 'direct',
    url: 'https://api.lolhuman.xyz/api/textprome/impressiveglitch',
    params: { text: 'TEXT', apikey: 'GataDiosV3' }
  },
  {
    name: 'lolhuman3',
    type: 'direct',
    url: 'https://api.lolhuman.xyz/api/textprome/natural-leaves',
    params: { text: 'TEXT', apikey: 'GataDiosV3' }
  },
  {
    name: 'nyxs1',
    type: 'direct',
    url: 'https://api.nyxs.pw/maker/textpro/deep-sky-metal',
    params: { text: 'TEXT' }
  },
  {
    name: 'nyxs2',
    type: 'direct',
    url: 'https://api.nyxs.pw/maker/textpro/holographic-3d',
    params: { text: 'TEXT' }
  },
  {
    name: 'nyxs3',
    type: 'direct',
    url: 'https://api.nyxs.pw/maker/textpro/neon-devil',
    params: { text: 'TEXT' }
  },
  {
    name: 'ephoto1',
    type: 'scrape',
    url: 'https://en.ephoto360.com/create-3d-gold-text-effect-online-391.html'
  },
  {
    name: 'ephoto2',
    type: 'scrape',
    url: 'https://en.ephoto360.com/create-a-glowing-neon-light-text-effect-online-729.html'
  },
  {
    name: 'ephoto3',
    type: 'scrape',
    url: 'https://en.ephoto360.com/create-a-3d-metal-text-effect-online-739.html'
  },
  {
    name: 'photooxy',
    type: 'json',
    url: 'https://photooxy.com/logo-and-text-effects/create-a-metallic-text-effect-free-online-1019.html'
  }
]

const STYLES = {
  neon: 0, blackpink: 1, horror: 2, magma: 3, thunder: 4,
  greenneon: 5, glitch: 6, leaves: 7, metal: 8, holographic: 9,
  devil: 10, gold: 11, glowing: 12, metal3d: 13, metallic: 14,
  pubg: 0, anime: 1, esport: 2, gaming: 3, silver: 4,
  fire: 5, ice: 6, space: 7, blood: 8, stone: 9,
  water: 10, sand: 11, wood: 12, wolf: 13, dragon: 14
}

async function makeLogo(text, styleIndex, logger) {
  for (let i = 0; i < LOGO_APIS.length; i++) {
    const index = (styleIndex + i) % LOGO_APIS.length
    const api = LOGO_APIS[index]

    try {
      let imageUrl = null

      if (api.type === 'json') {
        // XTEAM APIs - return JSON with url
        const url = api.url + '?text=' + encodeURIComponent(text) + '&apikey=' + api.params.apikey
        const { data } = await axios.get(url, { timeout: 15000 })
        if (data?.status && data?.url) {
          imageUrl = data.url
        }
      }
      else if (api.type === 'direct') {
        // LOLHUMAN + NYXS - direct image URL
        const params = new URLSearchParams()
        for (const [key, val] of Object.entries(api.params)) {
          params.append(key, key === 'text'? text : val)
        }
        imageUrl = api.url + '?' + params.toString()

        // Test if URL works
        await axios.head(imageUrl, { timeout: 10000 })
      }
      else if (api.type === 'scrape') {
        // EPHOTO360 NEW METHOD 2026
        const { data: html } = await axios.get(api.url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-US,en;q=0.9'
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
          timeout: 20000,
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
            { timeout: 20000 }
          )

          if (imgData?.success && imgData?.image_url) {
            imageUrl = imgData.image_url
          } else if (imgData?.fullsize_image) {
            imageUrl = 'https://en.ephoto360.com' + imgData.fullsize_image
          }
        }
      }

      if (imageUrl && imageUrl.startsWith('http')) {
        logger?.info('LOGO', `Success from ${api.name}`)
        return imageUrl
      }

    } catch (e) {
      logger?.warn('LOGO', `${api.name} failed: ${e.message}`)
      continue
    }
  }
  return null
}

export default {
  name: 'logo',
  alias: ['makelogo', 'textlogo', 'logomaker', 'lg'],
  desc: 'Create logo from text - 15 real APIs',
  usage: '[style] [text] or reply message',
  category: 'Logo',
  permission: 'public',

  execute: async (sock, m, args, { prefix, logger }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const replyText = quoted?.conversation || quoted?.extendedTextMessage?.text

    // Get style and text
    let style = args[0]?.toLowerCase()
    let text = args.slice(1).join(' ')

    // If replying to message
    if (replyText &&!text) {
      text = replyText.trim()
      if (!STYLES[style]) style = 'neon' // default
    }

    // LIST STYLES
    if (!style || style === 'list' || style === 'help') {
      const styles = Object.keys(STYLES).slice(0, 20).join(', ')
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🎨 LOGO STYLES
╠═══════════════════
║ ${styles}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}logo neon Swift
║ ${prefix}logo gaming YourName
║ ${prefix}logo blackpink Text
║
║ 💬 REPLY:
║ (reply message)${prefix}logo anime
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!text) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter text for logo\n║ Example: ${prefix}logo neon Swift\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (text.length > 20) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Text too long\n║ Max: 20 characters\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const styleIndex = STYLES[style]!== undefined? STYLES[style] : 0

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const imageUrl = await makeLogo(text, styleIndex, logger)

      if (!imageUrl) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Couldn't create logo\n║ Try another style\n║ ${prefix}logo list\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: `🎨 LOGO: ${style.toUpperCase()}\n📝 Text: ${text}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('LOGO', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}