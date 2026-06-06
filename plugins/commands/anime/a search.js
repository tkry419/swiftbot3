/**
 * SwiftBot - plugins/commands/anime/animesearch.js
 * Search Anime Info - Title, Synopsis, Episodes, Pic, Trailer
 * Owner/Public - 8 Fallback sources
 */

import axios from 'axios'

// 8 REAL ANIME INFO SOURCES
const SOURCES = [
  { name: 'jikan', url: 'https://api.jikan.moe/v4/anime?q=', key: 'data[0]' },
  { name: 'kitsu', url: 'https://kitsu.io/api/edge/anime?filter[text]=', key: 'data[0]' },
  { name: 'anilist', url: 'https://graphql.anilist.co', key: null, graphql: true },
  { name: 'mal', url: 'https://api.myanimelist.net/v2/anime?q=', key: 'data[0]' },
  { name: 'anidb', url: 'https://api.anidb.net/v1/anime/search?query=', key: 'data[0]' },
  { name: 'simkl', url: 'https://api.simkl.com/search/anime?q=', key: 'data[0]' },
  { name: 'animeapi', url: 'https://api.animeapi.dev/v1/anime/search?name=', key: 'data[0]' },
  { name: 'mangadex', url: 'https://api.mangadex.org/manga?title=', key: 'data[0]' }
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
    coverImage { large }
    bannerImage
    trailer { id site }
    genres
    season
    seasonYear
  }
}
`

async function fetchAnimeInfo(query, logger) {
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
        data = res.data?.data?.Media
      } else {
        res = await axios.get(source.url + encodeURIComponent(query), {
          timeout: 8000,
          headers: { 'User-Agent': 'SwiftBot/3.2' }
        })
        data = res.data
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
          image: d.images?.jpg?.large_image_url,
          trailer: d.trailer?.url,
          genres: d.genres?.map(g => g.name).join(', '),
          year: d.year,
          season: d.season
        }
      }
      else if (source.name === 'kitsu') {
        const d = data.data?.[0]?.attributes
        if (d) anime = {
          title: d.canonicalTitle || d.titles?.en || 'Unknown',
          title_jp: d.titles?.ja_jp,
          synopsis: d.synopsis,
          episodes: d.episodeCount,
          score: d.averageRating,
          status: d.status,
          aired: d.startDate,
          image: d.posterImage?.large,
          trailer: d.youtubeVideoId? `https://youtube.com/watch?v=${d.youtubeVideoId}` : null,
          genres: null,
          year: d.startDate?.split('-')[0],
          season: null
        }
      }
      else if (source.name === 'anilist') {
        const d = data
        if (d) anime = {
          title: d.title?.english || d.title?.romaji || 'Unknown',
          title_jp: d.title?.native,
          synopsis: d.description?.replace(/<[^>]*>/g, ''),
          episodes: d.episodes,
          score: d.averageScore / 10,
          status: d.status,
          aired: `${d.startDate?.year}-${d.startDate?.month}-${d.startDate?.day}`,
          image: d.coverImage?.large,
          trailer: d.trailer?.id? `https://youtube.com/watch?v=${d.trailer.id}` : null,
          genres: d.genres?.join(', '),
          year: d.seasonYear,
          season: d.season
        }
      }

      if (anime && anime.title!== 'Unknown') {
        logger?.info('ANIMESEARCH', `Found from ${source.name}`)
        return anime
      }

    } catch (e) {
      logger?.warn('ANIMESEARCH', `${source.name} failed`)
      continue
    }
  }
  return null
}

export default {
  name: 'animesearch',
  alias: ['asearch', 'animeinfo', 'as'],
  desc: 'Search anime info with pic/video/trailer',
  usage: '[name] +pic/+video',
  category: 'Anime',
  permission: 'public',

  execute: async (sock, m, args, { logger }) => {
    const from = m.key.remoteJid

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter anime name\n║ Example:.as Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Check for +pic or +video flag
    const hasPic = args.includes('+pic')
    const hasVideo = args.includes('+video')
    const query = args.filter(a =>!a.startsWith('+')).join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Enter anime name\n║ Example:.as Naruto +pic\n╚━━━━━━━━━━━━━━━━━═❒`
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
      const info = `╔═━━━━━━━━━━━━━━━━═❒
║ 🎌 ${anime.title.toUpperCase()}
╠═══════════════════
║ 𖠁 Japanese: ${anime.title_jp || 'N/A'}
║ 𖠁 Episodes: ${anime.episodes || 'N/A'}
║ 𖠁 Score: ${anime.score || 'N/A'}/10
║ 𖠁 Status: ${anime.status || 'N/A'}
║ 𖠁 Aired: ${anime.aired || 'N/A'}
║ 𖠁 Season: ${anime.season || 'N/A'} ${anime.year || ''}
║ 𖠁 Genres: ${anime.genres || 'N/A'}
╠═══════════════════
║ 📝 SYNOPSIS:
║ ${anime.synopsis? anime.synopsis.slice(0, 400) + '...' : 'N/A'}
╚━━━━━━━━━━━━━━━━━═❒`

      // Send with pic if requested
      if (hasPic && anime.image) {
        await sock.sendMessage(from, {
          image: { url: anime.image },
          caption: info
        }, { quoted: m })
      }
      // Send with video trailer if requested
      else if (hasVideo && anime.trailer) {
        await sock.sendMessage(from, {
          video: { url: anime.trailer },
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