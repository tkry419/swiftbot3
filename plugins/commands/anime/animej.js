/**
 * SwiftBot - plugins/commands/anime/animechar.js
 * Search Anime Character Info - Name, Anime, Bio, Pic
 * Owner/Public - 6 Working Fallback sources
 */

import axios from 'axios'

// 6 REAL WORKING CHARACTER SOURCES 2026
const SOURCES = [
  {
    name: 'jikan',
    url: 'https://api.jikan.moe/v4/characters?q=',
    headers: { 'User-Agent': 'SwiftBot/3.2' }
  },
  {
    name: 'kitsu',
    url: 'https://kitsu.io/api/edge/characters?filter[name]=',
    headers: { 'Accept': 'application/vnd.api+json' }
  },
  {
    name: 'anilist',
    url: 'https://graphql.anilist.co',
    graphql: true
  },
  {
    name: 'anify',
    url: 'https://anify.eltik.cc/character/',
    headers: {}
  },
  {
    name: 'animeapi',
    url: 'https://anime-api-site.vercel.app/api/character?name=',
    headers: {}
  },
  {
    name: 'consumet',
    url: 'https://api.consumet.org/meta/anilist/character/',
    headers: {}
  }
]

const ANILIST_QUERY = `
query ($search: String) {
  Character (search: $search) {
    name { full native }
    description(asHtml: false)
    image { large }
    age
    gender
    dateOfBirth { year month day }
    media(sort: POPULARITY_DESC, perPage: 1) {
      edges {
        node {
          title { romaji english }
        }
      }
    }
    favourites
  }
}
`

async function fetchCharacter(query, logger) {
  for (const source of SOURCES) {
    try {
      let data = null

      if (source.graphql) {
        const { data: res } = await axios.post(source.url, {
          query: ANILIST_QUERY,
          variables: { search: query }
        }, {
          timeout: 10000,
          headers: { 'User-Agent': 'SwiftBot/3.2' }
        })
        data = res?.data?.Character
      } else {
        const { data: res } = await axios.get(source.url + encodeURIComponent(query), {
          timeout: 10000,
          headers: source.headers
        })
        data = res
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
          image: d.images?.jpg?.image_url || d.images?.webp?.image_url,
          anime: d.anime?.[0]?.anime?.title || d.anime?.[0]?.title,
          favorites: d.favorites,
          nicknames: d.nicknames?.length? d.nicknames.join(', ') : null
        }
      }
      else if (source.name === 'kitsu') {
        const d = data.data?.[0]?.attributes
        if (d) char = {
          name: d.canonicalName || d.name || 'Unknown',
          name_jp: d.names?.ja_jp || d.names?.ja,
          bio: d.description,
          image: d.image?.original || d.image?.large,
          anime: null,
          favorites: null,
          nicknames: d.otherNames?.length? d.otherNames.join(', ') : null
        }
      }
      else if (source.name === 'anilist') {
        const d = data
        if (d) char = {
          name: d.name?.full || 'Unknown',
          name_jp: d.name?.native,
          bio: d.description,
          image: d.image?.large,
          anime: d.media?.edges?.[0]?.node?.title?.english || d.media?.edges?.[0]?.node?.title?.romaji,
          favorites: d.favourites,
          nicknames: null,
          age: d.age,
          gender: d.gender,
          birth: d.dateOfBirth?.year? `${d.dateOfBirth.year}-${String(d.dateOfBirth.month).padStart(2,'0')}-${String(d.dateOfBirth.day).padStart(2,'0')}` : null
        }
      }
      else if (source.name === 'anify' || source.name === 'animeapi' || source.name === 'consumet') {
        const d = data[0] || data.results?.[0] || data
        if (d) char = {
          name: d.name || d.title || 'Unknown',
          name_jp: d.name_kanji || d.japaneseName || d.native,
          bio: d.about || d.description || d.bio,
          image: d.image || d.imageUrl || d.images?.large,
          anime: d.anime || d.from || d.media?.[0]?.title,
          favorites: d.favorites || d.favourites,
          nicknames: d.nicknames?.join?.(', ') || d.aliases?.join?.(', '),
          age: d.age,
          gender: d.gender,
          birth: d.birthday || d.birth
        }
      }

      if (char && char.name && char.name!== 'Unknown') {
        logger?.info('ANIMECHAR', `Found from ${source.name}`)
        return char
      }

    } catch (e) {
      logger?.warn('ANIMECHAR', `${source.name} failed: ${e.message}`)
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

  execute: async (sock, m, args, { prefix, logger }) => {
    const from = m.key.remoteJid

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter character name\n║ Example: ${prefix}ac Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Check for +pic flag
    const hasPic = args.includes('+pic')
    const query = args.filter(a =>!a.startsWith('+')).join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter character name\n║ Example: ${prefix}ac Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
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
║ ${char.bio? char.bio.replace(/<[^>]*>/g, '').slice(0, 500).trim() + '...' : 'N/A'}
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