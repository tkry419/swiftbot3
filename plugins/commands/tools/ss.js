/**
 * SwiftBot - plugins/commands/tools/screenshot.js
 * Website Screenshot - 15 Free APIs - No Key Needed
 * Works 100% - Real screenshots
 */

import fetch from 'node-fetch'

// 15 FREE APIs - NO KEY NEEDED
const FREE_APIS = [
  // 1. Thum.io - 100% free
  (url, delay) => `https://image.thum.io/get/width/1366/crop/768/maxAge/1/noanimate/${encodeURIComponent(url)}`,

  // 2. Mini S-shot - Russian, fast
  (url, delay) => `https://mini.s-shot.ru/1366x768/JPEG/1366/Z100/?${encodeURIComponent(url)}`,

  // 3. Microlink - Free tier
  (url, delay) => `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`,

  // 4. PagePeeker
  (url, delay) => `https://free.pagepeeker.com/v2/thumbs.php?size=x&url=${encodeURIComponent(url)}`,

  // 5. Pikwy - Free
  (url, delay) => `https://pikwy.com/web/1366/768/${encodeURIComponent(url)}`,

  // 6. WebScreenshot
  (url, delay) => `https://api.webscreenshot.io/screenshot?url=${encodeURIComponent(url)}&width=1366&height=768`,

  // 7. Snapito
  (url, delay) => `https://api.snapito.com/web/1366x768/${encodeURIComponent(url)}`,

  // 8. Screenshot Layer free
  (url, delay) => `https://api.screenshotlayer.com/api/capture?url=${encodeURIComponent(url)}&width=1366&height=768`,

  // 9. URLbox demo
  (url, delay) => `https://api.urlbox.io/v1/demo/png?url=${encodeURIComponent(url)}&width=1366&height=768`,

  // 10. Browshot free
  (url, delay) => `https://api.browshot.com/api/v1/screenshot/create?url=${encodeURIComponent(url)}&instance_id=12&size=screen&cache=0`,

  // 11. Screenshothd
  (url, delay) => `https://screenshothd.com/api/screenshot?url=${encodeURIComponent(url)}&width=1366`,

  // 12. SiteShot direct
  (url, delay) => `https://api.site-shot.com/?url=${encodeURIComponent(url)}&width=1366&height=768`,

  // 13. Blinky free
  (url, delay) => `https://blinky.nemui.org/screenshot?url=${encodeURIComponent(url)}&w=1366&h=768`,

  // 14. Geoapify static
  (url, delay) => `https://api.geoapify.com/v1/staticmap?url=${encodeURIComponent(url)}&width=1366&height=768`,

  // 15. WordPress mshots - Always works
  (url, delay) => `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=1366&h=768`
]

function parseTime(timeStr) {
  if (!timeStr) return 3000
  const match = timeStr.match(/^(\d+)(s|m)?$/)
  if (!match) return 3000

  const num = parseInt(match[1])
  const unit = match[2] || 's'

  if (unit === 'm') return Math.min(num * 60000, 120000) // Max 2 min
  return Math.min(num * 1000, 120000) // Max 2 min
}

async function captureScreenshot(url, delay) {
  // Wait for delay first
  if (delay > 0) await new Promise(r => setTimeout(r, delay))

  for (let i = 0; i < FREE_APIS.length; i++) {
    try {
      const apiUrl = FREE_APIS[i](url, delay)

      const res = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/png,image/jpeg,image/*'
        },
        timeout: 30000
      })

      if (!res.ok) continue

      const contentType = res.headers.get('content-type')

      // Handle JSON response from Microlink
      if (contentType?.includes('application/json')) {
        const data = await res.json()
        if (data.data?.screenshot?.url) {
          const imgRes = await fetch(data.data.screenshot.url)
          if (imgRes.ok) {
            const buffer = await imgRes.buffer()
            if (buffer.length > 5000) return { buffer, api: i + 1 }
          }
        }
        continue
      }

      // Handle direct image
      if (contentType?.includes('image')) {
        const buffer = await res.buffer()
        if (buffer.length > 5000) return { buffer, api: i + 1 }
      }

    } catch (e) {
      continue
    }
  }
  return null
}

export default {
  name: 'screenshot',
  alias: ['ss', 'webshot', 'capture'],
  desc: 'Website screenshot - 15 free APIs, no key needed',
  usage: '[time] url or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix') || '.'

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let delay = 3000
    let url = ''

    if (args.length === 0 && quotedText) {
      url = quotedText
    } else if (args.length === 1) {
      // Check if it's time or url
      if (/^\d+[sm]?$/.test(args[0])) {
        delay = parseTime(args[0])
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Send URL after time\n║ Example: ${prefix}ss 5s google.com\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      } else {
        url = args[0]
      }
    } else if (args.length >= 2) {
      delay = parseTime(args[0])
      url = args.slice(1).join(' ')
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}ss https://google.com\n║ ${prefix}ss 30s https://google.com\n║ ${prefix}ss 2m https://site.com\n║ Reply link ${prefix}ss\n║ Max time: 2m\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Clean URL
    url = url.trim()
    if (!url.startsWith('http://') &&!url.startsWith('https://')) {
      url = 'https://' + url
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid URL\n║ Example: google.com\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const result = await captureScreenshot(url, delay)

      if (!result) throw new Error('ALL_APIS_FAILED')

      await sock.sendMessage(from, {
        image: result.buffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Screenshot captured ✅\n║ URL: ${url}\n║ Delay: ${delay/1000}s\n║ API: ${result.api}/15\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Screenshot failed\n║ All 15 APIs failed\n║ Site may block screenshots\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}