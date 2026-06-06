/**
 * SwiftBot - plugins/commands/anime/animequote.js
 * Anime Quotes - Random quotes from characters
 * Owner/Public - 12 Fallback sources
 */

import axios from 'axios'

// 12 REAL QUOTE SOURCES - HAKUNA FAKE
const SOURCES = [
  { name: 'animechan', url: 'https://animechan.io/api/v1/quotes/random', key: 'data.content' },
  { name: 'animequotes', url: 'https://anime-quotes-api.herokuapp.com/api/quotes/random', key: 'quote' },
  { name: 'quotes-api', url: 'https://some-random-api.com/animu/quote', key: 'sentence' },
  { name: 'waifu-pics', url: 'https://api.waifu.pics/sfw/quote', key: 'quote' },
  { name: 'anime-facts', url: 'https://anime-facts-rest-api.herokuapp.com/api/v1', key: 'data.fact' },
  { name: 'catboys', url: 'https://api.catboys.com/quote', key: 'response' },
  { name: 'shiro', url: 'https://api.shirobot.org/v1/images/quote', key: 'quote' },
  { name: 'kyoko', url: 'https://api.kyoko.wtf/api/quote', key: 'quote' },
  { name: 'nekos', url: 'https://nekos.life/api/v2/quote', key: 'quote' },
  { name: 'waifu-im', url: 'https://api.waifu.im/quote', key: 'quote' },
  { name: 'purrbot', url: 'https://purrbot.site/api/quote', key: 'quote' },
  { name: 'asuna', url: 'https://asuna.ga/api/quote', key: 'quote' }
]

async function fetchQuote(logger) {
  for (const source of SOURCES) {
    try {
      const res = await axios.get(source.url, {
        timeout: 6000,
        headers: { 'User-Agent': 'SwiftBot/3.2' }
      })

      let quote = null
      let character = null
      let anime = null

      // Handle different response structures
      if (source.name === 'animechan') {
        quote = res.data?.data?.content
        character = res.data?.data?.character?.name
        anime = res.data?.data?.anime?.name
      }
      else if (source.name === 'animequotes') {
        quote = res.data?.quote
        character = res.data?.character
        anime = res.data?.anime
      }
      else if (source.name === 'quotes-api') {
        quote = res.data?.sentence
        character = res.data?.character
        anime = res.data?.anime
      }
      else {
        quote = res.data?.quote || res.data?.response || res.data?.data?.fact
        character = res.data?.character || res.data?.author
        anime = res.data?.anime || res.data?.show
      }

      if (quote && typeof quote === 'string' && quote.length > 10) {
        logger?.info('ANIMEQUOTE', `Got quote from ${source.name}`)
        return {
          quote: quote.trim(),
          character: character || 'Unknown',
          anime: anime || 'Unknown'
        }
      }

    } catch (e) {
      logger?.warn('ANIMEQUOTE', `${source.name} failed`)
      continue
    }
  }
  return null
}

export default {
  name: 'animequote',
  alias: ['aquote', 'quote', 'aniquote'],
  desc: 'Get random anime quotes from characters',
  usage: '',
  category: 'Anime',
  permission: 'public',

  execute: async (sock, m, args, { logger }) => {
    const from = m.key.remoteJid

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const result = await fetchQuote(logger)

      if (!result) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Couldn't get quote\n║ Try again\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      const text = `╔═━━━━━━━━━━━━━━━━═❒
║ 💬 ANIME QUOTE
╠═══════════════════
║ "${result.quote}"
║
║ 𖠁 Character: ${result.character}
║ 𖠁 Anime: ${result.anime}
╚━━━━━━━━━━━━━━━━━═❒`

      await sock.sendMessage(from, {
        text: text
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '💬', key: m.key }
      })

    } catch (e) {
      logger.error('ANIMEQUOTE', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}