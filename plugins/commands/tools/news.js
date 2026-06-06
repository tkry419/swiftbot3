/**
 * SwiftBot - plugins/commands/tools/news.js
 * Latest News - 15 Online APIs
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const NEWS_APIS = [
  { url: 'https://newsapi.org/v2/top-headlines', key: 'demo', type: 'newsapi' },
  { url: 'https://api.nytimes.com/svc/topstories/v2/home.json', key: 'demo', type: 'nytimes' },
  { url: 'https://api.currentsapi.services/v1/latest-news', key: 'demo', type: 'currents' },
  { url: 'https://newsdata.io/api/1/news', key: 'demo', type: 'newsdata' },
  { url: 'https://api.thenewsapi.com/v1/news/top', key: 'demo', type: 'thenewsapi' },
  { url: 'https://api.mediastack.com/v1/news', key: 'demo', type: 'mediastack' },
  { url: 'https://api.worldnewsapi.com/search-news', key: 'demo', type: 'worldnews' },
  { url: 'https://api.gdeltproject.org/api/v2/doc/doc', key: 'none', type: 'gdelt' },
  { url: 'https://api.newscatcherapi.com/v2/latest_headlines', key: 'demo', type: 'newscatcher' },
  { url: 'https://api.webhose.io/v1/filterWebContent', key: 'demo', type: 'webhose' },
  { url: 'https://api.aylien.com/news/stories', key: 'demo', type: 'aylien' },
  { url: 'https://api.contextualwebsearch.com/api/search/NewsSearchAPI', key: 'demo', type: 'contextual' },
  { url: 'https://news-api.layoffs.fyi/api/news', key: 'none', type: 'layoffs' },
  { url: 'https://api.spaceflightnewsapi.net/v4/articles', key: 'none', type: 'spaceflight' },
  { url: 'https://hacker-news.firebaseio.com/v0/topstories.json', key: 'none', type: 'hackernews' }
]

async function getNews(query, api) {
  try {
    let url = ''
    const headers = {}

    if (api.type === 'newsapi') {
      url = `${api.url}?q=${encodeURIComponent(query || 'world')}&apiKey=${api.key}&pageSize=5`
    } else if (api.type === 'nytimes') {
      url = `${api.url}?api-key=${api.key}`
    } else if (api.type === 'currents') {
      url = `${api.url}?apiKey=${api.key}&keywords=${encodeURIComponent(query || 'world')}`
    } else if (api.type === 'newsdata') {
      url = `${api.url}?apikey=${api.key}&q=${encodeURIComponent(query || 'world')}&language=en`
    } else if (api.type === 'gdelt') {
      url = `${api.url}?query=${encodeURIComponent(query || 'world')}&mode=artlist&maxrecords=5&format=json`
    } else if (api.type === 'spaceflight') {
      url = `${api.url}?limit=5`
    } else if (api.type === 'hackernews') {
      url = api.url
    } else {
      url = `${api.url}?apiKey=${api.key}&q=${encodeURIComponent(query || 'world')}`
    }

    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const data = await res.json()

    // Parse different APIs
    if (api.type === 'newsapi' && data.articles) {
      return data.articles.slice(0, 5).map(a => ({
        title: a.title,
        desc: a.description,
        url: a.url,
        source: a.source.name
      }))
    } else if (api.type === 'nytimes' && data.results) {
      return data.results.slice(0, 5).map(a => ({
        title: a.title,
        desc: a.abstract,
        url: a.url,
        source: 'NY Times'
      }))
    } else if (api.type === 'currents' && data.news) {
      return data.news.slice(0, 5).map(a => ({
        title: a.title,
        desc: a.description,
        url: a.url,
        source: a.author
      }))
    } else if (api.type === 'newsdata' && data.results) {
      return data.results.slice(0, 5).map(a => ({
        title: a.title,
        desc: a.description,
        url: a.link,
        source: a.source_id
      }))
    } else if (api.type === 'spaceflight' && data.results) {
      return data.results.slice(0, 5).map(a => ({
        title: a.title,
        desc: a.summary,
        url: a.url,
        source: a.news_site
      }))
    }

    return null
  } catch {
    return null
  }
}

export default {
  name: 'news',
  alias: ['headlines', 'latest', 'topnews'],
  desc: 'Latest news - 15 fallbacks',
  usage: '[topic] or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let query = args.join(' ') || quotedText || 'world'

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let articles = null

      // Try all 15 APIs
      for (const api of NEWS_APIS) {
        articles = await getNews(query, api)
        if (articles && articles.length > 0) break
      }

      if (!articles || articles.length === 0) throw new Error('NEWS_FAILED')

      let text = `╔═━━━━━━━━━━━━━━━━═❒\n║ *LATEST NEWS: ${query.toUpperCase()}*\n╚━━━━━━━━━━━━━━━━━═❒\n\n`

      articles.forEach((a, i) => {
        text += `*${i + 1}. ${a.title}*\n`
        if (a.desc) text += `${a.desc.slice(0, 100)}...\n`
        text += `🔗 ${a.url}\n`
        if (a.source) text += `📰 ${a.source}\n`
        text += `\n`
      })

      await sock.sendMessage(from, {
        text: text
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ News fetch failed\n║ Try different topic\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}