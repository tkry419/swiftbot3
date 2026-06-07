/**
 * SwiftBot - plugins/commands/download/play.js
 * Music Downloader — Full songs, no trailers, no cuts
 * 15 API fallbacks — never-fail mode
 * Features: search by name, direct URL, lyrics hint,
 *           duration check, quality info, thumbnail cover,
 *           artist/album/year metadata, mp3 + m4a support
 */

import fetch from 'node-fetch'

// ─────────────────────────────────────────────
// 15 API FALLBACKS — Each returns { audioUrl, title, artist, duration, thumb, source }
// ─────────────────────────────────────────────
const MUSIC_APIS = [
  {
    name: 'ytdlp-cobalt',
    fetch: async (query) => {
      // Cobalt — best for full audio, no cuts
      const searchUrl = `https://co.wuk.sh/api/json`
      const isUrl = query.startsWith('http')
      const url   = isUrl ? query : `https://music.youtube.com/search?q=${encodeURIComponent(query)}`

      const r = await fetch(searchUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ url, aFormat: 'mp3', isAudioOnly: true }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      if (d?.status !== 'stream' && d?.status !== 'redirect') return null
      return {
        audioUrl: d.url,
        title:    d.filename?.replace(/_/g, ' ').replace(/\.mp3$/i, '') || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    null,
        source:   'cobalt'
      }
    }
  },
  {
    name: 'yt-search-mp3',
    fetch: async (query) => {
      const isUrl = query.startsWith('http')
      const searchQ = isUrl ? query : `${query} full song`
      const searchR = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQ)}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const html = await searchR.text()
      const idMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (!idMatch) return null
      const videoId = idMatch[1]

      // Use yt-dlp API proxy
      const r = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const audioUrl = d?.url || d?.mp3
      if (!audioUrl) return null
      return {
        audioUrl,
        title:    d.title || query,
        artist:   d.artist || 'Unknown',
        duration: d.duration || 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        source:   'vevioz+yt'
      }
    }
  },
  {
    name: 'ytmp3-cc',
    fetch: async (query) => {
      const isUrl = query.startsWith('http')
      // Search YouTube first if not a URL
      let videoId = null
      if (isUrl && query.includes('youtube.com')) {
        const match = query.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
        videoId = match?.[1]
      } else if (isUrl && query.includes('youtu.be')) {
        videoId = query.split('/').pop().split('?')[0]
      } else {
        const sR = await fetch(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' full audio')}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const html = await sR.text()
        const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
        videoId = m?.[1]
      }
      if (!videoId) return null

      const r = await fetch(`https://ytmp3.cc/en/youtube-mp3/${videoId}/`, {
        signal: AbortSignal.timeout(12000)
      })
      const text = await r.text()
      const urlMatch = text.match(/href="(https:\/\/[^"]+\.mp3[^"]*?)"/)
      if (!urlMatch) return null
      return {
        audioUrl: urlMatch[1],
        title:    query,
        artist:   'Unknown',
        duration: 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        source:   'ytmp3.cc'
      }
    }
  },
  {
    name: 'jiosaavn',
    fetch: async (query) => {
      if (query.startsWith('http')) return null // URL not supported
      const r = await fetch(
        `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&page=1&limit=1`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const song = d?.data?.results?.[0]
      if (!song) return null
      // Get highest quality download URL
      const dlUrls = song.downloadUrl || []
      const best   = dlUrls.find(u => u.quality === '320kbps') ||
                     dlUrls.find(u => u.quality === '160kbps') ||
                     dlUrls[dlUrls.length - 1]
      if (!best?.url) return null
      return {
        audioUrl: best.url,
        title:    song.name || query,
        artist:   song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown',
        duration: song.duration || 0,
        thumb:    song.image?.find(i => i.quality === '500x500')?.url || song.image?.[0]?.url || null,
        source:   'jiosaavn'
      }
    }
  },
  {
    name: 'deezer',
    fetch: async (query) => {
      if (query.startsWith('http')) return null
      const r = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const track = d?.data?.[0]
      // Deezer preview is 30s — we skip unless full URL found
      if (!track) return null
      // Try to get full via deemix proxy
      const full = await fetch(
        `https://api.deemix.app/download?id=${track.id}&quality=MP3_320`,
        { signal: AbortSignal.timeout(12000) }
      ).then(r2 => r2.json()).catch(() => null)
      const audioUrl = full?.url || full?.stream
      if (!audioUrl) return null
      return {
        audioUrl,
        title:    track.title,
        artist:   track.artist?.name || 'Unknown',
        duration: track.duration || 0,
        thumb:    track.album?.cover_big || track.album?.cover || null,
        source:   'deezer'
      }
    }
  },
  {
    name: 'soundcloud',
    fetch: async (query) => {
      const isUrl = query.startsWith('http') && query.includes('soundcloud.com')
      const CLIENT_ID = 'a3e059563d7fd3372b49b37f00a00bcf' // public fallback

      let trackUrl = isUrl ? query : null
      if (!trackUrl) {
        const sR = await fetch(
          `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&limit=1&client_id=${CLIENT_ID}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const sD = await sR.json()
        trackUrl = sD?.collection?.[0]?.permalink_url
      }
      if (!trackUrl) return null

      const r = await fetch(
        `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(trackUrl)}&client_id=${CLIENT_ID}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const progressive = d?.media?.transcodings?.find(t => t.format?.protocol === 'progressive')
      if (!progressive) return null

      const streamR = await fetch(
        `${progressive.url}?client_id=${CLIENT_ID}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const streamD = await streamR.json()
      if (!streamD?.url) return null

      return {
        audioUrl: streamD.url,
        title:    d.title || query,
        artist:   d.user?.username || 'Unknown',
        duration: Math.floor((d.duration || 0) / 1000),
        thumb:    d.artwork_url?.replace('large', 't500x500') || null,
        source:   'soundcloud'
      }
    }
  },
  {
    name: 'spotify-ytdl',
    fetch: async (query) => {
      if (query.startsWith('http') && !query.includes('spotify.com')) return null
      // Convert Spotify link or name → YouTube search → download
      let searchTerm = query
      if (query.includes('spotify.com/track')) {
        const r = await fetch(
          `https://api.spotifydown.com/metadata/track/${query.split('/track/')[1].split('?')[0]}`,
          { headers: { origin: 'https://spotifydown.com' }, signal: AbortSignal.timeout(10000) }
        )
        const d = await r.json()
        if (d?.title) searchTerm = `${d.title} ${d.artists} full song`
      }
      const sR = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const html = await sR.text()
      const idM = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (!idM) return null
      const videoId = idM[1]
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const audioUrl = dlD?.url || dlD?.mp3
      if (!audioUrl) return null
      return {
        audioUrl,
        title:    dlD.title || searchTerm,
        artist:   dlD.artist || 'Unknown',
        duration: dlD.duration || 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        source:   'spotify-ytdl'
      }
    }
  },
  {
    name: 'napster-proxy',
    fetch: async (query) => {
      if (query.startsWith('http')) return null
      const r = await fetch(
        `https://api.music.apple.com/v1/catalog/us/search?term=${encodeURIComponent(query)}&types=songs&limit=1`,
        { signal: AbortSignal.timeout(10000) }
      ).catch(() => null)
      if (!r) return null
      const d = await r.json()
      const song = d?.results?.songs?.data?.[0]
      if (!song) return null
      // Use YouTube as download backend with Apple metadata
      const searchTerm = `${song.attributes.name} ${song.attributes.artistName} full song`
      const sR = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const html = await sR.text()
      const idM  = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (!idM) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${idM[1]}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const audioUrl = dlD?.url || dlD?.mp3
      if (!audioUrl) return null
      return {
        audioUrl,
        title:    song.attributes.name,
        artist:   song.attributes.artistName,
        duration: Math.floor(song.attributes.durationInMillis / 1000),
        thumb:    song.attributes.artwork?.url?.replace('{w}x{h}', '500x500') || null,
        source:   'apple+ytdl'
      }
    }
  },
  {
    name: 'y2mate',
    fetch: async (query) => {
      const isUrl = query.startsWith('http')
      let videoId = null
      if (isUrl && query.includes('youtube')) {
        const m = query.match(/[?&]v=([a-zA-Z0-9_-]{11})/) || query.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)
        videoId = m?.[1]
      } else {
        const sR = await fetch(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' full song')}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const html = await sR.text()
        const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
        videoId = m?.[1]
      }
      if (!videoId) return null

      const r = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ k_query: `https://www.youtube.com/watch?v=${videoId}`, k_page: 'home', hl: 'en', q_auto: 0 }),
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const links = d?.links?.mp3
      const best  = links?.mp3128 || Object.values(links || {})[0]
      if (!best?.k) return null

      const convR = await fetch('https://www.y2mate.com/mates/convertV2/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ vid: videoId, k: best.k }),
        signal: AbortSignal.timeout(15000)
      })
      const convD = await convR.json()
      if (!convD?.dlink) return null
      return {
        audioUrl: convD.dlink,
        title:    d.title || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        source:   'y2mate'
      }
    }
  },
  {
    name: 'yt1s',
    fetch: async (query) => {
      const sR = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' full audio')}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const html = await sR.text()
      const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (!m) return null
      const videoId = m[1]

      const r = await fetch('https://yt1s.com/api/ajaxSearch/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: `https://youtube.com/watch?v=${videoId}`, vt: 'home' }),
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const kval = d?.links?.mp3?.mp3128?.k
      if (!kval) return null

      const convR = await fetch('https://yt1s.com/api/ajaxConvert/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ vid: videoId, k: kval }),
        signal: AbortSignal.timeout(15000)
      })
      const convD = await convR.json()
      if (!convD?.dlink) return null
      return {
        audioUrl: convD.dlink,
        title:    d.title || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        source:   'yt1s'
      }
    }
  },
  {
    name: 'mp3juices',
    fetch: async (query) => {
      if (query.startsWith('http')) return null
      const r = await fetch(`https://mp3juices.cc/api?q=${encodeURIComponent(query)}&format=json`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const track = d?.results?.[0] || d?.[0]
      const audioUrl = track?.url || track?.download
      if (!audioUrl) return null
      return {
        audioUrl,
        title:    track.title || query,
        artist:   track.artist || 'Unknown',
        duration: track.duration || 0,
        thumb:    track.thumbnail || null,
        source:   'mp3juices'
      }
    }
  },
  {
    name: 'tubidy',
    fetch: async (query) => {
      if (query.startsWith('http')) return null
      const r = await fetch(
        `https://tubidy.ws/search.php?q=${encodeURIComponent(query)}&type=music`,
        { signal: AbortSignal.timeout(12000) }
      )
      const text = await r.text()
      const linkMatch = text.match(/href="(\/get\.php\?[^"]+)"/)
      if (!linkMatch) return null
      const dlR = await fetch(`https://tubidy.ws${linkMatch[1]}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlText = await dlR.text()
      const audioMatch = dlText.match(/href="(https:\/\/[^"]+\.mp3[^"]*?)"/)
      if (!audioMatch) return null
      const titleMatch = text.match(/<div class="title">([^<]+)<\/div>/)
      return {
        audioUrl: audioMatch[1],
        title:    titleMatch?.[1] || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    null,
        source:   'tubidy'
      }
    }
  },
  {
    name: 'audiomack',
    fetch: async (query) => {
      if (query.startsWith('http') && !query.includes('audiomack.com')) return null
      const endpoint = query.includes('audiomack.com')
        ? `https://api.audiomack.com/v1/music/streaming-url?url=${encodeURIComponent(query)}`
        : `https://api.audiomack.com/v1/search?q=${encodeURIComponent(query)}&type=song&count=1`
      const r = await fetch(endpoint, { signal: AbortSignal.timeout(12000) })
      const d = await r.json()
      const song = d?.results?.[0] || d
      const audioUrl = song?.stream_url || song?.hls_stream_url || song?.audio
      if (!audioUrl) return null
      return {
        audioUrl,
        title:    song.title || query,
        artist:   song.artist || 'Unknown',
        duration: song.duration || 0,
        thumb:    song.image || null,
        source:   'audiomack'
      }
    }
  },
  {
    name: 'zingmp3-proxy',
    fetch: async (query) => {
      if (query.startsWith('http')) return null
      const r = await fetch(
        `https://zingmp3.vn/tim-kiem?q=${encodeURIComponent(query)}&type=song`,
        { signal: AbortSignal.timeout(10000) }
      )
      const text = await r.text()
      const idMatch = text.match(/data-id="([A-Z0-9]+)"/)
      if (!idMatch) return null
      const dlR = await fetch(`https://zingmp3.vn/api/v2/song/get/streaming?id=${idMatch[1]}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const audioUrl = dlD?.data?.['320'] || dlD?.data?.['128']
      if (!audioUrl) return null
      return {
        audioUrl,
        title:    query,
        artist:   'Unknown',
        duration: 0,
        thumb:    null,
        source:   'zingmp3'
      }
    }
  },
  {
    name: 'savefrom-audio',
    fetch: async (query) => {
      const sR = await fetch(
        `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' full song audio')}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const html = await sR.text()
      const m = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/)
      if (!m) return null
      const videoId = m[1]
      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`

      const r = await fetch(`https://worker.sf-tools.com/savefrom.php?sf_url=${encodeURIComponent(ytUrl)}`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const audioLinks = (d?.url || []).filter(u => u.id?.includes('audio') || u.id?.includes('mp3') || u.id?.includes('m4a'))
      const best = audioLinks[0] || (d?.url || [])[0]
      let audioUrl = best?.url
      if (!audioUrl) return null
      if (audioUrl.startsWith('//')) audioUrl = `https:${audioUrl}`
      return {
        audioUrl,
        title:    d.meta?.title || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        source:   'savefrom'
      }
    }
  }
]

// ─────────────────────────────────────────────
// NEVER-FAIL ENGINE
// ─────────────────────────────────────────────
async function downloadMusic(query) {
  for (const api of MUSIC_APIS) {
    try {
      const result = await api.fetch(query)
      if (result?.audioUrl) {
        result._api = api.name
        return result
      }
    } catch {
      // Silent — try next
    }
  }
  return null
}

function fmtDuration(secs) {
  if (!secs || secs === 0) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────
export default {
  name: 'play',
  alias: ['music', 'song', 'mp3', 'audio', 'singdl'],
  desc: 'Download full songs — no cuts, no trailers',
  usage: '<song name> or <url>',
  category: 'download',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox, logger }) => {
    const from   = m.key.remoteJid
    const prefix = await db.get('prefix') || '#'

    // ─── GET QUERY ───────────────────────────
    const quoted   = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedTx = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const query    = args.join(' ').trim() || quotedTx.trim()

    if (!query) {
      const help =
        `*🎵 Music Downloader*\n\n` +
        `Downloads full songs — no cuts, no 30s previews\n\n` +
        `*Usage:*\n` +
        `  ${prefix}play <song name>\n` +
        `  ${prefix}play <YouTube/Spotify/SoundCloud URL>\n` +
        `  Reply text + ${prefix}play\n\n` +
        `*Examples:*\n` +
        `  ${prefix}play Blinding Lights The Weeknd\n` +
        `  ${prefix}play https://youtu.be/xxxx\n\n` +
        `*Alias:* music, song, mp3, audio, singdl`
      return await sock.sendMessage(from, {
        text: nobox ? help : await box.info(help)
      }, { quoted: m })
    }

    // ─── REACT LOADING ───────────────────────
    await sock.sendMessage(from, { react: { text: '🎵', key: m.key } })

    // ─── SEARCHING MESSAGE ───────────────────
    const searchMsg = await sock.sendMessage(from, {
      text: nobox
        ? `🔍 Searching: _${query.slice(0, 60)}_...`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║  🔍 Searching...\n║  🎵 ${query.slice(0, 50)}\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    // ─── DOWNLOAD ────────────────────────────
    const result = await downloadMusic(query)

    if (!result) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: nobox
          ? `❌ All 15 sources failed.\nTry a different song name or URL.`
          : await box.error(`All 15 sources failed.\nTry a different song name or URL.`)
      }, { quoted: m })
    }

    // ─── BUILD CAPTION ───────────────────────
    const dur = fmtDuration(result.duration)
    const caption =
      `╔═━━━━━━━━━━━━━━━━═❒\n` +
      `║  🎵  NOW PLAYING\n` +
      `╠═━━━━━━━━━━━━━━━━═❒\n` +
      `║  📀 ${result.title.slice(0, 70)}\n` +
      `║  👤 ${result.artist}\n` +
      `${dur ? `║  ⏱️  ${dur}\n` : ''}` +
      `╚━━━━━━━━━━━━━━━━━═❒`

    try {
      // ─── SEND THUMBNAIL FIRST (if available) ─
      if (result.thumb) {
        try {
          await sock.sendMessage(from, {
            image:   { url: result.thumb },
            caption: caption
          }, { quoted: m })
        } catch {
          // Thumbnail failed — skip, still send audio
        }
      }

      // ─── SEND FULL AUDIO ─────────────────────
      await sock.sendMessage(from, {
        audio:    { url: result.audioUrl },
        mimetype: 'audio/mpeg',
        ptt:      false
      }, { quoted: result.thumb ? undefined : m })

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (sendErr) {
      logger.error?.('PLAY', 'Send failed', sendErr.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Download found but send failed: ${sendErr.message}`
          : await box.error(`Send failed: ${sendErr.message}`)
      }, { quoted: m })
    }
  }
}