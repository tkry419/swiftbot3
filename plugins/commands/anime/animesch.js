/**
 * SwiftBot - plugins/commands/anime/animeschedule.js
 * Anime Schedule - Today's/This Week Airing Anime
 * Owner/Public - 6 Fallback sources
 */

import axios from 'axios'

// 6 REAL SCHEDULE SOURCES
const SOURCES = [
  { name: 'jikan', url: 'https://api.jikan.moe/v4/schedules', key: 'data' },
  { name: 'anilist', url: 'https://graphql.anilist.co', key: null, graphql: true },
  { name: 'anichart', url: 'https://anichart.net/api/airing', key: null },
  { name: 'kitsu', url: 'https://kitsu.io/api/edge/anime?filter[status]=current', key: 'data' },
  { name: 'simkl', url: 'https://api.simkl.com/anime/calendar', key: null },
  { name: 'animeapi', url: 'https://api.animeapi.dev/v1/schedule', key: 'data' }
]

const ANILIST_QUERY = `
query {
  Page(page: 1, perPage: 20) {
    airingSchedules(notYetAired: false, sort: TIME_DESC) {
      media {
        title { romaji english }
        episodes
        coverImage { medium }
      }
      episode
      airingAt
    }
  }
}
`

function getDayName() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[new Date().getDay()]
}

function formatTime(timestamp) {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
}

async function fetchSchedule(day, logger) {
  for (const source of SOURCES) {
    try {
      let res, data

      if (source.graphql) {
        res = await axios.post(source.url, {
          query: ANILIST_QUERY
        }, {
          timeout: 8000,
          headers: { 'User-Agent': 'SwiftBot/3.2' }
        })
        data = res.data?.data?.Page?.airingSchedules
      } else if (source.name === 'jikan') {
        res = await axios.get(`${source.url}?filter=${day}`, {
          timeout: 8000,
          headers: { 'User-Agent': 'SwiftBot/3.2' }
        })
        data = res.data?.data
      } else {
        res = await axios.get(source.url, {
          timeout: 8000,
          headers: { 'User-Agent': 'SwiftBot/3.2' }
        })
        data = res.data?.data || res.data
      }

      if (!data || data.length === 0) continue

      let schedule = []

      // Parse based on source
      if (source.name === 'jikan') {
        schedule = data.slice(0, 15).map(d => ({
          title: d.title || d.title_english || 'Unknown',
          episode: d.episodes || '?',
          time: d.broadcast?.time || 'N/A',
          image: d.images?.jpg?.image_url
        }))
      }
      else if (source.name === 'anilist') {
        schedule = data.slice(0, 15).map(d => ({
          title: d.media?.title?.english || d.media?.title?.romaji || 'Unknown',
          episode: d.episode || '?',
          time: formatTime(d.airingAt),
          image: d.media?.coverImage?.medium
        }))
      }
      else if (source.name === 'kitsu') {
        schedule = data.slice(0, 15).map(d => ({
          title: d.attributes?.canonicalTitle || 'Unknown',
          episode: d.attributes?.episodeCount || '?',
          time: 'N/A',
          image: d.attributes?.posterImage?.small
        }))
      }

      if (schedule.length > 0) {
        logger?.info('ANIMESCHEDULE', `Got ${schedule.length} from ${source.name}`)
        return schedule
      }

    } catch (e) {
      logger?.warn('ANIMESCHEDULE', `${source.name} failed`)
      continue
    }
  }
  return null
}

export default {
  name: 'animeschedule',
  alias: ['aschedule', 'airing', 'schedule'],
  desc: 'Get anime airing schedule today/this week',
  usage: '[today/tomorrow/monday/tuesday/etc] +pic',
  category: 'Anime',
  permission: 'public',

  execute: async (sock, m, args, { logger }) => {
    const from = m.key.remoteJid

    // Parse day and +pic flag
    const hasPic = args.includes('+pic')
    const dayArg = args.filter(a =>!a.startsWith('+'))[0]?.toLowerCase()
    const day = dayArg || getDayName()

    const validDays = ['today', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    const targetDay = day === 'today'? getDayName() : day

    if (!validDays.includes(targetDay) && targetDay!== getDayName()) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid day\n║ Use: today, tomorrow, monday, etc\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const schedule = await fetchSchedule(targetDay, logger)

      if (!schedule || schedule.length === 0) {
        await sock.sendMessage(from, {
          react: { text: '❌', key: m.key }
        })
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ No anime airing ${targetDay}\n║ Try another day\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      // Build schedule text
      let text = `╔═━━━━━━━━━━━━━━━━═❒
║ 📅 ANIME SCHEDULE - ${targetDay.toUpperCase()}
╠═══════════════════\n`

      schedule.slice(0, 10).forEach((anime, i) => {
        text += `║ ${i + 1}. ${anime.title}\n`
        text += `║ 𖠁 EP: ${anime.episode} | ${anime.time}\n`
      })

      text += `╚━━━━━━━━━━━━━━━━━═❒`

      // Send with pic of first anime if requested
      if (hasPic && schedule[0]?.image) {
        await sock.sendMessage(from, {
          image: { url: schedule[0].image },
          caption: text
        }, { quoted: m })
      }
      // Send text only
      else {
        await sock.sendMessage(from, {
          text: text
        }, { quoted: m })
      }

      await sock.sendMessage(from, {
        react: { text: '📅', key: m.key }
      })

    } catch (e) {
      logger.error('ANIMESCHEDULE', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Something went wrong\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}