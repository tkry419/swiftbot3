/**
 * SwiftBot - plugins/commands/tools/shorturl.js
 * Shorten URL - 15 Online APIs
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const SHORT_URL_APIS = [
  { url: 'https://is.gd/create.php', type: 'isgd' },
  { url: 'https://v.gd/create.php', type: 'vgd' },
  { url: 'https://tinyurl.com/api-create.php', type: 'tinyurl' },
  { url: 'https://api.shrtco.de/v2/shorten', type: 'shrtco' },
  { url: 'https://cleanuri.com/api/v1/shorten', type: 'cleanuri' },
  { url: 'https://ulvis.net/api.php', type: 'ulvis' },
  { url: 'https://api-ssl.bitly.com/v4/shorten', type: 'bitly' },
  { url: 'https://t.ly/api/v1/link/shorten', type: 'tly' },
  { url: 'https://short.io/api/shorten', type: 'shortio' },
  { url: 'https://api.rebrandly.com/v1/links', type: 'rebrandly' },
  { url: 'https://api.clickmeter.com/v4/links', type: 'clickmeter' },
  { url: 'https://api.short.io/links', type: 'shortio2' },
  { url: 'https://url-shortener-service.p.rapidapi.com/shorten', type: 'rapidapi' },
  { url: 'https://shrtlnk.dev/api/v2/link', type: 'shrtlnk' },
  { url: 'https://api.t2m.io/api/v1/shorten', type: 't2m' }
]

async function shortenUrl(longUrl, api) {
  try {
    let url = ''
    let options = { method: 'GET' }

    if (api.type === 'isgd' || api.type === 'vgd') {
      url = `${api.url}?format=simple&url=${encodeURIComponent(longUrl)}`
    } else if (api.type === 'tinyurl') {
      url = `${api.url}?url=${encodeURIComponent(longUrl)}`
    } else if (api.type === 'shrtco') {
      url = `${api.url}?url=${encodeURIComponent(longUrl)}`
    } else if (api.type === 'cleanuri') {
      url = api.url
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `url=${encodeURIComponent(longUrl)}`
      }
    } else if (api.type === 'ulvis') {
      url = `${api.url}?url=${encodeURIComponent(longUrl)}`
    } else {
      url = `${api.url}?url=${encodeURIComponent(longUrl)}`
    }

    const res = await fetch(url, options)
    if (!res.ok) return null

    const text = await res.text()
    
    // Parse different responses
    if (api.type === 'shrtco') {
      const data = JSON.parse(text)
      return data.result?.full_short_link
    }
    if (api.type === 'cleanuri') {
      const data = JSON.parse(text)
      return data.result_url
    }
    
    // Most return plain text URL
    if (text.startsWith('http')) return text.trim()
    return null
  } catch {
    return null
  }
}

export default {
  name: 'shorturl',
  alias: ['short', 'shorten', 'tinyurl'],
  desc: 'Shorten long URL - 15 fallbacks',
  usage: 'url or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let longUrl = args[0] || quotedText

    if (!longUrl) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}shorturl https://google.com\n║ Reply message ${prefix}shorturl\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!longUrl.startsWith('http')) {
      longUrl = 'https://' + longUrl
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let shortUrl = null

      // Try all 15 APIs
      for (const api of SHORT_URL_APIS) {
        shortUrl = await shortenUrl(longUrl, api)
        if (shortUrl && shortUrl.startsWith('http')) break
      }

      if (!shortUrl) throw new Error('SHORTEN_FAILED')

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *URL SHORTENED*\n╚━━━━━━━━━━━━━━━━━═❒\n\n${shortUrl}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Shorten failed\n║ Invalid URL?\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}