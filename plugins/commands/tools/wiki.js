/**
 * SwiftBot - plugins/commands/tools/wikipedia.js
 * Wikipedia Search with Thumbnail - 15 Fallbacks
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const WIKI_APIS = [
  'https://en.wikipedia.org/api/rest_v1/page/summary',
  'https://en.wikipedia.org/w/api.php',
  'https://api.wikimedia.org/core/v1/wikipedia/en/page',
  'https://dbpedia.org/data',
  'https://query.wikidata.org/sparql',
  'https://simple.wikipedia.org/api/rest_v1/page/summary',
  'https://wikimedia.org/api/rest_v1/page/summary',
  'https://wikipedia.org/w/api.php',
  'https://api.duckduckgo.com',
  'https://www.wikidata.org/w/api.php',
  'https://en.wikivoyage.org/w/api.php',
  'https://commons.wikimedia.org/w/api.php',
  'https://meta.wikimedia.org/w/api.php',
  'https://species.wikimedia.org/w/api.php',
  'https://www.wiktionary.org/w/api.php'
]

async function searchWikipedia(query, apiUrl) {
  try {
    let url = ''
    if (apiUrl.includes('rest_v1/page/summary')) {
      url = `${apiUrl}/${encodeURIComponent(query)}`
    } else if (apiUrl.includes('api.php')) {
      url = `${apiUrl}?action=query&format=json&prop=extracts|pageimages&exintro=1&explaintext=1&piprop=original&titles=${encodeURIComponent(query)}`
    } else if (apiUrl.includes('duckduckgo')) {
      url = `${apiUrl}?q=${encodeURIComponent(query)}&format=json&no_html=1`
    } else {
      url = `${apiUrl}/${encodeURIComponent(query)}`
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'SwiftBot/1.0' }
    })

    if (!res.ok) return null
    const data = await res.json()

    // Parse different responses
    if (data.extract) {
      return {
        title: data.title,
        extract: data.extract,
        thumbnail: data.thumbnail?.source || data.original?.source || null,
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`
      }
    }

    if (data.query?.pages) {
      const page = Object.values(data.query.pages)[0]
      return {
        title: page.title,
        extract: page.extract,
        thumbnail: page.original?.source || null,
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title)}`
      }
    }

    if (data.Abstract) {
      return {
        title: data.Heading,
        extract: data.Abstract,
        thumbnail: data.Image || null,
        url: data.AbstractURL
      }
    }

    return null
  } catch {
    return null
  }
}

export default {
  name: 'wikipedia',
  alias: ['wiki', 'wikisearch', 'wp'],
  desc: 'Wikipedia search with thumbnail - 15 fallbacks',
  usage: 'query or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let query = args.join(' ') || quotedText

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}wiki Einstein\n║ ${prefix}wiki Kenya\n║ Reply text ${prefix}wiki\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let result = null

      // Try all 15 APIs
      for (const api of WIKI_APIS) {
        result = await searchWikipedia(query, api)
        if (result && result.extract) break
      }

      if (!result ||!result.extract) throw new Error('NOT_FOUND')

      const caption = `╔═━━━━━━━━━━━━━━━━═❒\n║ *${result.title}*\n╚━━━━━━━━━━━━━━━━━═❒\n\n${result.extract.slice(0, 800)}${result.extract.length > 800? '...' : ''}\n\n🔗 ${result.url}`

      if (result.thumbnail) {
        await sock.sendMessage(from, {
          image: { url: result.thumbnail },
          caption: caption
        }, { quoted: m })
      } else {
        await sock.sendMessage(from, {
          text: caption
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Wikipedia search failed\n║ Article not found\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}