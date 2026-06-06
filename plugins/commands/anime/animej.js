/**
 * SwiftBot - plugins/commands/anime/animechar.js
 * Search Anime Character Info - Name, Anime, Bio, Pic
 * Owner/Public - 10 Fallback sources
 */

import axios from 'axios'

// 10 REAL CHARACTER SOURCES
const SOURCES = [
  { name: 'jikan', url: 'https://api.jikan.moe/v4/characters?q=', key: 'data[0]' },
  { name: 'kitsu', url: 'https://kitsu.io/api/edge/characters?filter[name]=', key: 'data[0]' },
  { name: 'anilist', url: 'https://graphql.anilist.co', key: null, graphql: true },
  { name: 'mal', url: 'https://api.myanimelist.net/v2/characters?q=', key: 'data[0]' },
  { name: 'anidb', url: 'https://api.anidb.net/v1/character/search?name=', key: 'data[0]' },
  { name: 'waifu-im', url: 'https://api.waifu.im/search/?included_tags=', key: 'images[0]' },
  { name: 'nekos-best', url: 'https://nekos.best/api/v2/search?query=', key: 'results[0]' },
  { name: 'shiro', url: 'https://api.shirobot.org/v1/images/character?name=', key: null },
  { name: 'kyoko', url: 'https://api.kyoko.wtf/api/character?name=', key: null },
  { name: 'purrbot', url: 'https://purrbot.site/api/img/sfw/character?name=', key: null }
]

const ANILIST_QUERY = `
query ($search: String) {
  Character (search: $search) {
    name { full native }
    description
    image { large }
    age
    gender
    dateOfBirth { year month day }
    media(sort: POPULARITY_DESC) {
      edges {
        node {
          title { romaji english }
        }
      }
    }
  }
}
`

async function fetchCharacter(query, logger) {
  for (const source of SOURCES) {
    try {
      let res, data

      if (source.graphql) {
        res = await axios.post(source.url, {
          query: ANILIST_QUERY,
          variables: { search: query }
        }, {
          timeout: 8000,
          headers: { 'User-Agent': 'SwiftBot/3.2' }
        })
        data = res.data?.data?.Character
      } else {
        res = await axios.get(source.url + encodeURIComponent(query), {
          timeout: 8000,
          headers: { 'User-Agent': 'SwiftBot/3.2' }
        })
        data = res.data
      }

      if (!data) continue

      let char = null

      // Parse based on source
      if (source.name === 'jikan') {
        const d = data.data?.[0]
        if (d) char = {
          name: d.name || 'Unknown',
          name_jp: d.name_kanji,
          bio: d.about,
          image: d.images?.jpg?.image_url,
          anime: d.anime?.[0]?.anime?.title,
          favorites: d.favorites,
          nicknames: d.nicknames?.join(', ')
        }
      }
      else if (source.name === 'kitsu') {
        const d = data.data?.[0]?.attributes
        if (d) char = {
          name: d.name || d.canonicalName || 'Unknown',
          name_jp: d.names?.ja_jp,
          bio: d.description,
          image: d.image?.original,
          anime: null,
          favorites: null,
          nicknames: d.otherNames?.join(', ')
        }
      }
      else if (source.name === 'anilist') {
        const d = data
        if (d) char = {
          name: d.name?.full || 'Unknown',
          name_jp: d.name?.native,
          bio: d.description?.replace(/<[^>]*>/g, ''),
          image: d.image?.large,
          anime: d.media?.edges?.[0]?.node?.title?.english || d.media?.edges?.[0]?.node?.title?.romaji,
          favorites: null,
          nicknames: null,
          age: d.age,
          gender: d.gender,
          birth: d.dateOfBirth?.year? `${d.dateOfBirth.year}-${d.dateOfBirth.month}-${d.dateOfBirth.day}` : null
        }
      }
      else if (source.name === 'waifu-im') {
        const d = data.images?.[0]
        if (d) char = {
          name: d.tags?.[0]?.name || query,
          name_jp: null,
          bio: d.description,
          image: d.url,
          anime: d.source,
          favorites: null,
          nicknames: null
        }
      }

      if (char && char.name!== 'Unknown') {
        logger?.info('ANIMECHAR', `Found from ${source.name}`)
        return char
      }

    } catch (e) {
      logger?.warn('ANIMECHAR', `${source.name} failed`)
      continue
    }
  }
  return null
}

export default {
  name: 'animechar',
  alias: ['achar', 'character', 'ac'],
  desc: 'Search anime character info with pic',
  usage: '[name] +pic',
  category: 'Anime',
  permission: 'public',

  execute: async (sock, m, args, { logger }) => {
    const from = m.key.remoteJid

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter character name\n║ Example:.ac Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Check for +pic flag
    const hasPic = args.includes('+pic')
    const query = args.filter(a =>!a.startsWith('+')).join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter character name\n║ Example:.ac Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const char = await fetchCharacter(query, logger)

      if (!char) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Character not found\n║ Try: ${query}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      // Build info text
      let info = `╔═━━━━━━━━━━━━━━━━═❒
║ 👤 ${char.name.toUpperCase()}
╠═══════════════════
║ 𖠁 Japanese: ${char.name_jp || 'N/A'}
║ 𖠁 Anime: ${char.anime || 'N/A'}`

      if (char.age) info += `\n║ 𖠁 Age: ${char.age}`
      if (char.gender) info += `\n║ 𖠁 Gender: ${char.gender}`
      if (char.birth) info += `\n║ 𖠁 Birthday: ${char.birth}`
      if (char.nicknames) info += `\n║ 𖠁 Nicknames: ${char.nicknames}`
      if (char.favorites) info += `\n║ 𖠁 Favorites: ${char.favorites}`

      info += `\n╠═══════════════════
║ 📝 BIO:
║ ${char.bio? char.bio.slice(0, 500) + '...' : 'N/A'}
╚━━━━━━━━━━━━━━━━━═❒`

      // Send with pic if requested
      if (hasPic && char.image) {
        await sock.sendMessage(from, {
          image: { url: char.image },
          caption: info
        }, { quoted: m })
      }
      // Send text only
      else {
        await sock.sendMessage(from, {
          text: info
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('ANIMECHAR', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}