/**
 * SwiftBot - plugins/commands/tools/screenshot.js
 * Website Screenshot with Timer - 15 Online APIs
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const SCREENSHOT_APIS = [
  { url: 'https://api.screenshotmachine.com', type: 'machine' },
  { url: 'https://shot.screenshotapi.net/screenshot', type: 'screenshotapi' },
  { url: 'https://api.apiflash.com/v1/urltoimage', type: 'apiflash' },
  { url: 'https://api.urlbox.io/v1/render', type: 'urlbox' },
  { url: 'https://api.screenshotone.com/take', type: 'screenshotone' },
  { url: 'https://api.pagelr.com/snapshot', type: 'pagelr' },
  { url: 'https://api.site-shot.com/', type: 'siteshot' },
  { url: 'https://api.thum.io/get', type: 'thumio' },
  { url: 'https://image.thum.io/get', type: 'thumio2' },
  { url: 'https://mini.s-shot.ru/1024x768/JPEG/1024/Z100/', type: 'sshot' },
  { url: 'https://api.url2png.com/v6', type: 'url2png' },
  { url: 'https://api.screeenly.com/v1/fullpage', type: 'screeenly' },
  { url: 'https://htmlcsstoimage.com/demo_run', type: 'htmlcss' },
  { url: 'https://web-capture.net/api', type: 'webcapture' },
  { url: 'https://screenshot.abstractapi.com/v1/', type: 'abstract' }
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

async function captureScreenshot(url, delay, api) {
  try {
    let fullUrl = ''

    if (api.type === 'machine') {
      fullUrl = `${api.url}?key=demo&url=${encodeURIComponent(url)}&dimension=1366x768&delay=${delay}&format=png`
    } else if (api.type === 'screenshotapi') {
      fullUrl = `${api.url}?url=${encodeURIComponent(url)}&output=image&file_type=png&wait_for=${delay}&viewport_width=1366&viewport_height=768`
    } else if (api.type === 'apiflash') {
      fullUrl = `${api.url}?access_key=demo&url=${encodeURIComponent(url)}&delay=${Math.floor(delay/1000)}&format=png&width=1366&height=768`
    } else if (api.type === 'thumio') {
      fullUrl = `${api.url}/width/1366/delay/${Math.floor(delay/1000)}/${url}`
    } else if (api.type === 'thumio2') {
      fullUrl = `${api.url}/width/1366/delay/${Math.floor(delay/1000)}/png/${url}`
    } else if (api.type === 'sshot') {
      fullUrl = `${api.url}?url=${encodeURIComponent(url)}&delay=${delay}`
    } else {
      fullUrl = `${api.url}?url=${encodeURIComponent(url)}&delay=${delay}&width=1366&height=768`
    }

    const res = await fetch(fullUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: delay + 10000
    })

    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength < 5000) return null

    return Buffer.from(buffer)
  } catch {
    return null
  }
}

export default {
  name: 'screenshot',
  alias: ['ss', 'webshot', 'capture'],
  desc: 'Website screenshot with timer - 15 fallbacks',
  usage: '[time] url or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let delay = 3000
    let url = ''

    if (args.length === 0 && quotedText) {
      url = quotedText
    } else if (args.length === 1) {
      url = args[0]
    } else if (args.length >= 2) {
      delay = parseTime(args[0])
      url = args.slice(1).join(' ')
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}ss https://google.com\n║ ${prefix}ss 30s https://google.com\n║ ${prefix}ss 2m https://site.com\n║ Reply link ${prefix}ss\n║ Max time: 2m\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!url.startsWith('http')) url = 'https://' + url

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let screenshotBuffer = null

      // Try all 15 APIs
      for (const api of SCREENSHOT_APIS) {
        screenshotBuffer = await captureScreenshot(url, delay, api)
        if (screenshotBuffer) break
      }

      if (!screenshotBuffer) throw new Error('CAPTURE_FAILED')

      await sock.sendMessage(from, {
        image: screenshotBuffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Screenshot captured ✅\n║ URL: ${url}\n║ Delay: ${delay/1000}s\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Screenshot failed\n║ Invalid URL or timeout\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}