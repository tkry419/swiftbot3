/**
 * SwiftBot - plugins/commands/anime/animeme.js
 * Anime Memes - Random memes from multiple sources
 * Owner/Public - 15 Fallback sources
 */

import axios from 'axios'

// 15 REAL MEME SOURCES - HAKUNA FAKE
const SOURCES = [
  { name: 'meme-api', url: 'https://meme-api.com/gimme/animemes', key: 'url' },
  { name: 'meme-api2', url: 'https://meme-api.com/gimme/Animemes', key: 'url' },
  { name: 'meme-api3', url: 'https://meme-api.com/gimme/goodanimemes', key: 'url' },
  { name: 'reddit-animemes', url: 'https://www.reddit.com/r/animemes/random.json', key: 'data.children[0].data.url' },
  { name: 'reddit-animeirl', url: 'https://www.reddit.com/r/anime_irl/random.json', key: 'data.children[0].data.url' },
  { name: 'reddit-anime', url: 'https://www.reddit.com/r/anime/random.json', key: 'data.children[0].data.url' },
  { name: 'memegen', url: 'https://api.memegen.link/images/animeme', key: null, direct: true },
  { name: 'some-random', url: 'https://some-random-api.com/meme', key: 'image' },
  { name: 'dankmemer', url: 'https://dankmemer.services/api/meme', key: 'url' },
  { name: 'imgflip', url: 'https://api.imgflip.com/get_memes', key: 'data.memes[0].url' },
  { name: 'memes-api', url: 'https://api.imgflip.com/get_memes', key: 'data.memes[0].url' },
  { name: 'popcat', url: 'https://api.popcat.xyz/meme', key: 'image' },
  { name: 'ksoft', url: 'https://api.ksoft.si/meme/random', key: 'image_url' },
  { name: 'memes', url: 'https://memes.blademaker.tv/api?lang=en', key: 'image' },
  { name: 'anime-facts', url: 'https://anime-facts-rest-api.herokuapp.com/api/v1', key: null, text: true }
]

async function fetchMeme(logger) {
  for (const source of SOURCES) {
    try {
      const res = await axios.get(source.url, {
        timeout: 6000,
        headers: { 'User-Agent': 'SwiftBot/3.2' }
      })

      // Text only API
      if (source.text) {
        if (res.data?.data?.fact) {
          logger?.info('ANIMEME', `Got text from ${source.name}`)
          return { text: res.data.data.fact, type: 'text' }
        }
        continue
      }

      // Direct URL
      if (source.direct) {
        if (res.data && typeof res.data === 'string' && res.data.startsWith('http')) {
          logger?.info('ANIMEME', `Got image from ${source.name}`)
          return { url: res.data, type: 'image' }
        }
        continue
      }

      // Extract based on key path
      let imageUrl = null
      if (source.key === 'url') imageUrl = res.data?.url
      else if (source.key === 'image') imageUrl = res.data?.image
      else if (source.key === 'image_url') imageUrl = res.data?.image_url
      else if (source.key === 'data.children[0].data.url') {
        imageUrl = res.data?.data?.children?.[0]?.data?.url
      }
      else if (source.key === 'data.memes[0].url') {
        const memes = res.data?.data?.memes
        if (memes && memes.length > 0) {
          const random = memes[Math.floor(Math.random() * memes.length)]
          imageUrl = random?.url
        }
      }

      if (imageUrl && imageUrl.startsWith('http')) {
        // Filter out videos and non-images
        if (imageUrl.includes('.mp4') || imageUrl.includes('v.redd.it')) continue

        logger?.info('ANIMEME', `Got image from ${source.name}`)
        return { url: imageUrl, type: 'image' }
      }

    } catch (e) {
      logger?.warn('ANIMEME', `${source.name} failed`)
      continue
    }
  }
  return null
}

export default {
  name: 'animeme',
  alias: ['ameme', 'animemes', 'memes'],
  desc: 'Get random anime memes',
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
      const result = await fetchMeme(logger)

      if (!result) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Couldn't get meme\n║ Try again\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (result.type === 'text') {
        await sock.sendMessage(from, {
          text: `😂 ANIME MEME\n\n${result.text}\n\n> Smart Swiftbot`
        }, { quoted: m })
      } else {
        await sock.sendMessage(from, {
          image: { url: result.url },
          caption: `😂 ANIME MEME\n\n> Smart Swiftbot`
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        react: { text: '😂', key: m.key }
      })

    } catch (e) {
      logger.error('ANIMEME', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}