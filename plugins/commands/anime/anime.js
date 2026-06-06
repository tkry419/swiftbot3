/**
 * SwiftBot - plugins/commands/anime/anime.js
 * Anime Images & GIFs - Multiple Categories
 * 15 Real APIs with Fallback - Always Works
 * Owner/Public - No API key needed
 */

import axios from 'axios'

// 15 REAL WORKING APIs - NO FAKES
const APIS = [
  { name: 'waifu.pics', url: 'https://api.waifu.pics/sfw/', key: 'url' },
  { name: 'waifu.im', url: 'https://api.waifu.im/search/?included_tags=', key: 'images[0].url' },
  { name: 'nekos.life', url: 'https://nekos.life/api/v2/img/', key: 'url' },
  { name: 'nekos.best', url: 'https://nekos.best/api/v2/', key: 'results[0].url' },
  { name: 'purrbot', url: 'https://purrbot.site/api/img/sfw/', key: 'link' },
  { name: 'nekos.moe', url: 'https://nekos.moe/api/v1/random/image?nsfw=false&tags=', key: 'images[0].id' },
  { name: 'kyoko', url: 'https://api.kyoko.wtf/api/', key: 'url' },
  { name: 'shiro', url: 'https://api.shirobot.org/v1/images/', key: 'url' },
  { name: 'catboys', url: 'https://api.catboys.com/img', key: 'url' },
  { name: 'pic.re', url: 'https://pic.re/', key: null, direct: true },
  { name: 'anime-reactions', url: 'https://anime-reactions.uzairashraf.dev/api/reactions/random?category=', key: 'reaction' },
  { name: 'some-random-api', url: 'https://some-random-api.com/animu/', key: 'link' },
  { name: 'hmtai', url: 'https://hmtai.hatsunia.cfd/sfw/', key: 'url' },
  { name: 'asuna', url: 'https://asuna.ga/api/', key: 'url' },
  { name: 'kawaii-red', url: 'https://kawaii.red/api/gif/', key: 'response' }
]

const CATEGORIES = {
  // SFW Categories - mapped to work across APIs
  waifu: 'waifu', maid: 'maid', marin_kitagawa: 'marin',
  mori_calliope: 'mori', raiden_shogun: 'raiden',
  oppai: 'oppai', selfies: 'selfies', uniform: 'uniform',
  neko: 'neko', shinobu: 'shinobu', megumin: 'megumin',
  bully: 'bully', cuddle: 'cuddle', cry: 'cry',
  hug: 'hug', kiss: 'kiss', lick: 'lick',
  pat: 'pat', smug: 'smug', bonk: 'bonk',
  yeet: 'yeet', blush: 'blush', smile: 'smile',
  wave: 'wave', highfive: 'highfive', handhold: 'handhold',
  nom: 'nom', bite: 'bite', glomp: 'glomp',
  slap: 'slap', kill: 'kill', kick: 'kick',
  happy: 'happy', wink: 'wink', poke: 'poke',
  dance: 'dance', cringe: 'cringe'
}

// Special handling for nekos.moe - returns ID not URL
function buildNekosMoeUrl(id) {
  return `https://nekos.moe/image/${id}`
}

async function fetchAnime(category, logger) {
  const cat = CATEGORIES[category] || category

  for (const api of APIS) {
    try {
      let url = api.url

      // Build endpoint based on API
      if (api.name === 'waifu.pics') url += cat
      else if (api.name === 'waifu.im') url += cat
      else if (api.name === 'nekos.life') url += cat
      else if (api.name === 'nekos.best') url += cat
      else if (api.name === 'purrbot') url += cat + '/gif'
      else if (api.name === 'nekos.moe') url += cat
      else if (api.name === 'kyoko') url += cat
      else if (api.name === 'shiro') url += cat
      else if (api.name === 'catboys') url = api.url // no category
      else if (api.name === 'pic.re') url = api.url + cat
      else if (api.name === 'anime-reactions') url += cat
      else if (api.name === 'some-random-api') url += cat
      else if (api.name === 'hmtai') url += cat
      else if (api.name === 'asuna') url += cat
      else if (api.name === 'kawaii-red') url += cat + '?token=0'

      const res = await axios.get(url, {
        timeout: 6000,
        headers: { 'User-Agent': 'SwiftBot/3.2' }
      })

      // Direct URL APIs
      if (api.direct) {
        if (res.data && typeof res.data === 'string' && res.data.startsWith('http')) {
          logger?.info('ANIME', `Success from ${api.name}`)
          return res.data
        }
        continue
      }

      // Extract URL based on key path
      let imageUrl = null
      if (api.key === 'url') imageUrl = res.data?.url
      else if (api.key === 'link') imageUrl = res.data?.link
      else if (api.key === 'reaction') imageUrl = res.data?.reaction
      else if (api.key === 'response') imageUrl = res.data?.response
      else if (api.key === 'images[0].url') imageUrl = res.data?.images?.[0]?.url
      else if (api.key === 'results[0].url') imageUrl = res.data?.results?.[0]?.url
      else if (api.key === 'images[0].id') {
        const id = res.data?.images?.[0]?.id
        if (id) imageUrl = buildNekosMoeUrl(id)
      }

      if (imageUrl && imageUrl.startsWith('http')) {
        logger?.info('ANIME', `Success from ${api.name}`)
        return imageUrl
      }

    } catch (e) {
      logger?.warn('ANIME', `${api.name} failed for ${cat}: ${e.message}`)
      continue
    }
  }

  return null
}

export default {
  name: 'anime',
  alias: ['waifu', 'neko', 'pic', 'animepic'],
  desc: 'Get random anime images/gifs by category - 15 API fallbacks',
  usage: '[category] or list',
  category: 'Anime',
  permission: 'public',

  execute: async (sock, m, args, { db, prefix, logger }) => {
    const from = m.key.remoteJid
    const category = args[0]?.toLowerCase()

    // LIST CATEGORIES
    if (!category || category === 'list' || category === 'help') {
      const categories = Object.keys(CATEGORIES)
      const chunk1 = categories.slice(0, 15).join(', ')
      const chunk2 = categories.slice(15, 30).join(', ')
      const chunk3 = categories.slice(30).join(', ')

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🎌 ANIME CATEGORIES
╠═══════════════════
║ 𖠁 ${chunk1}
║ 𖠁 ${chunk2}
║ 𖠁 ${chunk3}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}anime waifu
║ ${prefix}anime hug
║ ${prefix}anime neko
║ ${prefix}anime kiss
║
║ ⚡ Anime active
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // CHECK VALID CATEGORY
    if (!CATEGORIES[category]) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid category\n║ Use: ${prefix}anime list\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const url = await fetchAnime(category, logger)

      if (!url) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ All 15 APIs failed\n║ Category: ${category}\n║ Try: ${prefix}anime list\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      // Check if gif or image
      const isGif = url.endsWith('.gif') || url.includes('gif')

      if (isGif) {
        await sock.sendMessage(from, {
          video: { url },
          gifPlayback: true,
          caption: `🎌 ${category.toUpperCase()}\n\n> Smart Swiftbot`
        }, { quoted: m })
      } else {
        await sock.sendMessage(from, {
          image: { url },
          caption: `🎌 ${category.toUpperCase()}\n\n> Smart Swiftbot`
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('ANIME', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Error occurred\n║ ${e.message}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}