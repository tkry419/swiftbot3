/**
 * SwiftBot - plugins/commands/anime/animesearch.js
 * Search Anime Info - Title, Synopsis, Episodes, Pic, Trailer Link
 * Owner/Public - 6 Working Fallback sources
 */

import axios from 'axios'

// 6 REAL WORKING ANIME INFO SOURCES - NO API KEY NEEDED
const SOURCES = [
  {
    name: 'jikan',
    url: 'https://api.jikan.moe/v4/anime?q=',
    headers: { 'User-Agent': 'SwiftBot/3.2' }
  },
  {
    name: 'kitsu',
    url: 'https://kitsu.io/api/edge/anime?filter[text]=',
    headers: { 'Accept': 'application/vnd.api+json' }
  },
  {
    name: 'anilist',
    url: 'https://graphql.anilist.co',
    graphql: true
  },
  {
    name: 'consumet',
    url: 'https://api.consumet.org/anime/gogoanime/',
    headers: {}
  },
  {
    name: 'animeapi',
    url: 'https://anime-api-site.vercel.app/api/anime?q=',
    headers: {}
  },
  {
    name: 'anify',
    url: 'https://anify.eltik.cc/search?type=anime&query=',
    headers: {}
  }
]

const ANILIST_QUERY = `
query ($search: String) {
  Media (search: $search, type: ANIME) {
    title { romaji english native }
    description
    episodes
    averageScore
    status
    startDate { year month day }
    coverImage { large extraLarge }
    trailer { id site }
    genres
    season
    seasonYear
    format
  }
}
`

async function fetchAnimeInfo(query, logger) {
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
        data = res?.data?.Media
      } else {
        const { data: res } = await axios.get(source.url + encodeURIComponent(query), {
          timeout: 10000,
          headers: source.headers
        })
        data = res
      }

      if (!data) continue

      let anime = null

      // Parse based on source
      if (source.name === 'jikan') {
        const d = data.data?.[0]
        if (d) anime = {
          title: d.title || d.title_english || 'Unknown',
          title_jp: d.title_japanese,
          synopsis: d.synopsis,
          episodes: d.episodes,
          score: d.score,
          status: d.status,
          aired: d.aired?.string,
          image: d.images?.jpg?.large_image_url || d.images?.webp?.large_image_url,
          trailer: d.trailer?.url,
          genres: d.genres?.map(g => g.name).join(', '),
          year: d.year,
          season: d.season,
          type: d.type
        }
      }
      else if (source.name === 'kitsu') {
        const d = data.data?.[0]?.attributes
        if (d) anime = {
          title: d.canonicalTitle || d.titles?.en || d.titles?.en_jp || 'Unknown',
          title_jp: d.titles?.ja_jp,
          synopsis: d.synopsis,
          episodes: d.episodeCount,
          score: d.averageRating? (parseFloat(d.averageRating) / 10).toFixed(1) : null,
          status: d.status,
          aired: d.startDate,
          image: d.posterImage?.large || d.posterImage?.original,
          trailer: d.youtubeVideoId? `https://youtube.com/watch?v=${d.youtubeVideoId}` : null,
          genres: null,
          year: d.startDate?.split('-')[0],
          season: null,
          type: d.showType
        }
      }
      else if (source.name === 'anilist') {
        const d = data
        if (d) anime = {
          title: d.title?.english || d.title?.romaji || 'Unknown',
          title_jp: d.title?.native,
          synopsis: d.description?.replace(/<[^>]*>/g, '').replace(/\n/g, ' '),
          episodes: d.episodes,
          score: d.averageScore? (d.averageScore / 10).toFixed(1) : null,
          status: d.status,
          aired: d.startDate?.year? `${d.startDate.year}-${String(d.startDate.month).padStart(2,'0')}-${String(d.startDate.day).padStart(2,'0')}` : null,
          image: d.coverImage?.extraLarge || d.coverImage?.large,
          trailer: d.trailer?.id? `https://youtube.com/watch?v=${d.trailer.id}` : null,
          genres: d.genres?.join(', '),
          year: d.seasonYear,
          season: d.season,
          type: d.format
        }
      }
      else if (source.name === 'consumet') {
        const d = data.results?.[0]
        if (d) anime = {
          title: d.title || 'Unknown',
          title_jp: d.japaneseTitle,
          synopsis: d.description,
          episodes: d.totalEpisodes,
          score: null,
          status: d.status,
          aired: d.releaseDate,
          image: d.image,
          trailer: null,
          genres: d.genres?.join(', '),
          year: d.releaseDate?.split('-')[0],
          season: null,
          type: d.subOrDub
        }
      }
      else if (source.name === 'animeapi' || source.name === 'anify') {
        const d = data.results?.[0] || data[0]
        if (d) anime = {
          title: d.title?.english || d.title?.romaji || d.title || 'Unknown',
          title_jp: d.title?.native || d.title_jp,
          synopsis: d.description || d.synopsis,
          episodes: d.episodes || d.totalEpisodes,
          score: d.rating || d.averageScore,
          status: d.status,
          aired: d.aired || d.startDate,
          image: d.image || d.coverImage?.large,
          trailer: d.trailer,
          genres: d.genres?.join(', '),
          year: d.year || d.seasonYear,
          season: d.season,
          type: d.format || d.type
        }
      }

      if (anime && anime.title!== 'Unknown') {
        logger?.info('ANIMESEARCH', `Found from ${source.name}`)
        return anime
      }

    } catch (e) {
      logger?.warn('ANIMESEARCH', `${source.name} failed: ${e.message}`)
      continue
    }
  }
  return null
}

export default {
  name: 'animesearch',
  alias: ['asearch', 'animeinfo', 'as'],
  desc: 'Search anime info with pic/trailer link',
  usage: '[name] +pic/+trailer',
  category: 'Anime',
  permission: 'public',

  execute: async (sock, m, args, { prefix, logger }) => {
    const from = m.key.remoteJid

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter anime name\n║ Example: ${prefix}as Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Check for +pic or +trailer flag
    const hasPic = args.includes('+pic')
    const hasTrailer = args.includes('+trailer') || args.includes('+video')
    const query = args.filter(a =>!a.startsWith('+')).join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter anime name\n║ Example: ${prefix}as Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const anime = await fetchAnimeInfo(query, logger)

      if (!anime) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anime not found\n║ Try: ${query}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      // Build info text
      let info = `╔═━━━━━━━━━━━━━━━━═❒
║ 🎌 ${anime.title.toUpperCase()}
╠═══════════════════
║ 𖠁 Japanese: ${anime.title_jp || 'N/A'}
║ 𖠁 Type: ${anime.type || 'N/A'}
║ 𖠁 Episodes: ${anime.episodes || 'N/A'}
║ 𖠁 Score: ${anime.score || 'N/A'}/10
║ 𖠁 Status: ${anime.status || 'N/A'}
║ 𖠁 Aired: ${anime.aired || 'N/A'}
║ 𖠁 Season: ${anime.season || 'N/A'} ${anime.year || ''}
║ 𖠁 Genres: ${anime.genres || 'N/A'}
╠═══════════════════
║ 📝 SYNOPSIS:
║ ${anime.synopsis? anime.synopsis.slice(0, 400).trim() + '...' : 'N/A'}`

      // Add trailer link if requested
      if (hasTrailer && anime.trailer) {
        info += `\n╠═══════════════════\n║ 🎬 TRAILER:\n║ ${anime.trailer}`
      }

      info += `\n╚━━━━━━━━━━━━━━━━━═❒`

      // Send with pic if requested
      if (hasPic && anime.image) {
        await sock.sendMessage(from, {
          image: { url: anime.image },
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
      logger.error('ANIMESEARCH', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}