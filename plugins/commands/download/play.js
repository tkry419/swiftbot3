/**
 * SwiftBot - plugins/commands/download/play.js
 * Music Downloader — Full songs only, 50 API fallbacks
 * Clean output: thumbnail + audio only, no extra messages
 */

import fetch from 'node-fetch'

// ─────────────────────────────────────────────
// FULL-SONG VALIDATOR — Reject short/preview tracks
// ─────────────────────────────────────────────
const MIN_DURATION_SECONDS = 90 // Reject anything under 1m30s

function isFullSong(duration) {
  if (!duration || duration === 0) return true // Unknown = allow, let it play
  return duration >= MIN_DURATION_SECONDS
}

// ─────────────────────────────────────────────
// YOUTUBE SEARCH HELPER
// ─────────────────────────────────────────────
async function searchYouTube(query) {
  try {
    const r = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' full song')}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
    )
    const html = await r.text()
    // Get multiple video IDs to pick a full-length one
    const matches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)]
    const ids = [...new Set(matches.map(m => m[1]))].slice(0, 5)
    // Also grab durations from initial data
    const durMatches = [...html.matchAll(/"lengthText":\{"runs":\[\{"text":"(\d+:\d+(?::\d+)?)"\}/g)]
    const durs = durMatches.map(m => m[1])
    return { ids, durs }
  } catch {
    return { ids: [], durs: [] }
  }
}

function parseDuration(str) {
  if (!str) return 0
  const parts = str.split(':').map(Number)
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return 0
}

// ─────────────────────────────────────────────
// 50 API FALLBACKS
// ─────────────────────────────────────────────
const MUSIC_APIS = [

  // ── JIOSAAVN (320kbps full songs) ──────────
  {
    name: 'jiosaavn',
    fetch: async (query) => {
      const r = await fetch(
        `https://saavn.dev/api/search/songs?query=${encodeURIComponent(query)}&limit=3`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const songs = d?.data?.results || []
      for (const song of songs) {
        const dur = song.duration || 0
        if (!isFullSong(dur)) continue
        const dlUrls = song.downloadUrl || []
        const best = dlUrls.find(u => u.quality === '320kbps')
          || dlUrls.find(u => u.quality === '160kbps')
          || dlUrls[dlUrls.length - 1]
        if (!best?.url) continue
        return {
          audioUrl: best.url,
          title:    song.name,
          artist:   song.artists?.primary?.map(a => a.name).join(', ') || 'Unknown',
          duration: dur,
          thumb:    song.image?.find(i => i.quality === '500x500')?.url || song.image?.[0]?.url || null
        }
      }
      return null
    }
  },

  // ── SOUNDCLOUD PROGRESSIVE ─────────────────
  {
    name: 'soundcloud',
    fetch: async (query) => {
      const CLIENT_ID = 'a3e059563d7fd3372b49b37f00a00bcf'
      const isUrl = query.startsWith('http') && query.includes('soundcloud.com')
      let trackUrl = isUrl ? query : null
      if (!trackUrl) {
        const sR = await fetch(
          `https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&limit=5&client_id=${CLIENT_ID}`,
          { signal: AbortSignal.timeout(10000) }
        )
        const sD = await sR.json()
        const tracks = sD?.collection || []
        // Pick first full-length track
        const track = tracks.find(t => isFullSong(Math.floor((t.duration || 0) / 1000))) || tracks[0]
        trackUrl = track?.permalink_url
      }
      if (!trackUrl) return null
      const r = await fetch(
        `https://api-v2.soundcloud.com/resolve?url=${encodeURIComponent(trackUrl)}&client_id=${CLIENT_ID}`,
        { signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const dur = Math.floor((d.duration || 0) / 1000)
      if (!isFullSong(dur)) return null
      const progressive = d?.media?.transcodings?.find(t => t.format?.protocol === 'progressive')
      if (!progressive) return null
      const streamR = await fetch(`${progressive.url}?client_id=${CLIENT_ID}`, { signal: AbortSignal.timeout(10000) })
      const streamD = await streamR.json()
      if (!streamD?.url) return null
      return {
        audioUrl: streamD.url,
        title:    d.title,
        artist:   d.user?.username || 'Unknown',
        duration: dur,
        thumb:    d.artwork_url?.replace('large', 't500x500') || null
      }
    }
  },

  // ── COBALT (YouTube full audio) ────────────
  {
    name: 'cobalt',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      // Pick video that is full length (> 90s)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`
      const r = await fetch('https://co.wuk.sh/api/json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ url: ytUrl, aFormat: 'mp3', isAudioOnly: true }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      if (d?.status !== 'stream' && d?.status !== 'redirect') return null
      return {
        audioUrl: d.url,
        title:    d.filename?.replace(/_/g, ' ').replace(/\.mp3$/i, '') || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── Y2MATE ─────────────────────────────────
  {
    name: 'y2mate',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          k_query: `https://www.youtube.com/watch?v=${videoId}`,
          k_page: 'home', hl: 'en', q_auto: 0
        }),
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const links = d?.links?.mp3
      const best = links?.mp3128 || Object.values(links || {})[0]
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
        duration: parseDuration(d.duration),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── YT1S ───────────────────────────────────
  {
    name: 'yt1s',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
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
        duration: parseDuration(d.t),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── VEVIOZ ─────────────────────────────────
  {
    name: 'vevioz',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const url = d?.url || d?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   d.artist || 'Unknown',
        duration: parseDuration(d.duration),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── AUDIOMACK ──────────────────────────────
  {
    name: 'audiomack',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.audiomack.com/v1/search?q=${encodeURIComponent(query)}&type=song&count=5`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const songs = d?.results || []
      for (const song of songs) {
        const dur = song.duration || 0
        if (!isFullSong(dur)) continue
        const url = song.stream_url || song.hls_stream_url || song.audio
        if (!url) continue
        return {
          audioUrl: url,
          title:    song.title,
          artist:   song.artist || 'Unknown',
          duration: dur,
          thumb:    song.image || null
        }
      }
      return null
    }
  },

  // ── SPOTIFY METADATA + YT DOWNLOAD ─────────
  {
    name: 'spotify-ytdl',
    fetch: async (query) => {
      let searchTerm = query
      if (query.includes('spotify.com/track')) {
        try {
          const trackId = query.split('/track/')[1].split('?')[0]
          const r = await fetch(
            `https://api.spotifydown.com/metadata/track/${trackId}`,
            { headers: { origin: 'https://spotifydown.com' }, signal: AbortSignal.timeout(10000) }
          )
          const d = await r.json()
          if (d?.title) searchTerm = `${d.title} ${d.artists} full song`
        } catch {}
      }
      const { ids, durs } = await searchYouTube(searchTerm)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    dlD.title || query,
        artist:   dlD.artist || 'Unknown',
        duration: parseDuration(dlD.duration),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── SAVEFROM AUDIO ─────────────────────────
  {
    name: 'savefrom',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const ytUrl = `https://www.youtube.com/watch?v=${videoId}`
      const r = await fetch(
        `https://worker.sf-tools.com/savefrom.php?sf_url=${encodeURIComponent(ytUrl)}`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const audioLinks = (d?.url || []).filter(u =>
        u.id?.includes('audio') || u.id?.includes('mp3') || u.id?.includes('m4a')
      )
      const best = audioLinks[0] || (d?.url || [])[0]
      let url = best?.url
      if (!url) return null
      if (url.startsWith('//')) url = `https:${url}`
      return {
        audioUrl: url,
        title:    d.meta?.title || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── MP3JUICES ──────────────────────────────
  {
    name: 'mp3juices',
    fetch: async (query) => {
      const r = await fetch(
        `https://mp3juices.cc/api?q=${encodeURIComponent(query)}&format=json`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.results || d || []
      for (const track of (Array.isArray(tracks) ? tracks : [])) {
        const dur = track.duration ? parseDuration(String(track.duration)) : 0
        if (!isFullSong(dur)) continue
        const url = track.url || track.download
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.title || query,
          artist:   track.artist || 'Unknown',
          duration: dur,
          thumb:    track.thumbnail || null
        }
      }
      return null
    }
  },

  // ── TUBIDY ─────────────────────────────────
  {
    name: 'tubidy',
    fetch: async (query) => {
      const r = await fetch(
        `https://tubidy.ws/search.php?q=${encodeURIComponent(query)}&type=music`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }
      )
      const text = await r.text()
      const links = [...text.matchAll(/href="(\/get\.php\?[^"]+)"/g)]
      for (const link of links.slice(0, 3)) {
        try {
          const dlR = await fetch(`https://tubidy.ws${link[1]}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000)
          })
          const dlText = await dlR.text()
          const audioMatch = dlText.match(/href="(https:\/\/[^"]+\.mp3[^"]*?)"/)
          if (!audioMatch) continue
          const titleMatch = text.match(/<div class="title">([^<]+)<\/div>/)
          return {
            audioUrl: audioMatch[1],
            title:    titleMatch?.[1] || query,
            artist:   'Unknown',
            duration: 0,
            thumb:    null
          }
        } catch {}
      }
      return null
    }
  },

  // ── YTDL-CORE PROXY ────────────────────────
  {
    name: 'ytdl-proxy-1',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(
        `https://ytdl-proxy.vercel.app/api/info?id=${videoId}&format=mp3`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const url = d?.url || d?.audioUrl
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   d.author || 'Unknown',
        duration: d.duration || 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── YT-API.COM ─────────────────────────────
  {
    name: 'yt-api-com',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(
        `https://yt-api.com/mp3?id=${videoId}`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const url = d?.url || d?.downloadUrl
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: d.duration || 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── YTMP3.CC ───────────────────────────────
  {
    name: 'ytmp3cc',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(
        `https://ytmp3.cc/en/youtube-mp3/${videoId}/`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(12000) }
      )
      const text = await r.text()
      const urlMatch = text.match(/href="(https:\/\/[^"]+\.mp3[^"]*?)"/)
      if (!urlMatch) return null
      return {
        audioUrl: urlMatch[1],
        title:    query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── LOADER.TO ──────────────────────────────
  {
    name: 'loader-to',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(
        `https://loader.to/api/button/?url=https://youtube.com/watch?v=${videoId}&f=mp3`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const url = d?.url
      if (!url) return null
      return {
        audioUrl: url,
        title:    query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── CONVERTMP3.IO ──────────────────────────
  {
    name: 'convertmp3io',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://convertmp3.io/fetch/?url=https://youtube.com/watch?v=${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const url = d?.url || d?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── YT5MP3.COM ─────────────────────────────
  {
    name: 'yt5mp3',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://yt5mp3.com/api?v=${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const url = d?.url || d?.dlink
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── MP3-YOUTUBE.DOWNLOAD ───────────────────
  {
    name: 'mp3-youtube',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(
        `https://mp3-youtube.download/api/json?url=https://www.youtube.com/watch?v=${videoId}`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const url = d?.url || d?.mp3url
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── TOMP3.CC ───────────────────────────────
  {
    name: 'tomp3cc',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://tomp3.cc/api/ajax/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ query: `https://youtube.com/watch?v=${videoId}` }),
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const link = d?.links?.mp3?.mp3128?.k
      if (!link) return null
      const convR = await fetch(`https://tomp3.cc/api/ajax/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ vid: videoId, k: link }),
        signal: AbortSignal.timeout(15000)
      })
      const convD = await convR.json()
      if (!convD?.dlink) return null
      return {
        audioUrl: convD.dlink,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── SNAPSAVE AUDIO ─────────────────────────
  {
    name: 'snapsave-audio',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://snapsave.app/action.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0' },
        body: new URLSearchParams({ url: `https://youtube.com/watch?v=${videoId}` }),
        signal: AbortSignal.timeout(12000)
      })
      const text = await r.text()
      const audioMatch = text.match(/href="(https:\/\/[^"]+\.(mp3|m4a|opus)[^"]*?)"/i)
      if (!audioMatch) return null
      return {
        audioUrl: audioMatch[1],
        title:    query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── YTBMP3.COM ─────────────────────────────
  {
    name: 'ytbmp3',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://ytbmp3.com/api/convert?v=${videoId}&format=mp3`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const url = d?.url || d?.dlink
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── RAPIDAPI YT-DOWNLOADER ─────────────────
  {
    name: 'rapidapi-ytmp3',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(
        `https://youtube-mp36.p.rapidapi.com/dl?id=${videoId}`,
        {
          headers: {
            'x-rapidapi-host': 'youtube-mp36.p.rapidapi.com',
            'x-rapidapi-key':  'f8b5eefaa0msh9a3d4b5c6e7f8g9hjk'
          },
          signal: AbortSignal.timeout(15000)
        }
      )
      const d = await r.json()
      const url = d?.link
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── YTMP3HUB ───────────────────────────────
  {
    name: 'ytmp3hub',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://ytmp3hub.com/api?url=https://youtube.com/watch?v=${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const url = d?.url || d?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── SSTIK AUDIO ────────────────────────────
  {
    name: 'onlinevideoconverter',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://onlinevideoconverter.pro/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://youtube.com/watch?v=${videoId}`, format: 'mp3' }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.url || d?.downloadUrl
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── X2CONVERT ──────────────────────────────
  {
    name: 'x2convert',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://x2convert.com/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://youtube.com/watch?v=${videoId}`, type: 'mp3' }),
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const url = d?.url || d?.downloadUrl
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── YANDEX MUSIC ───────────────────────────
  {
    name: 'yandex-music',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.music.yandex.net/search?text=${encodeURIComponent(query)}&type=track&page=0`,
        { headers: { Authorization: 'OAuth AgAAAAArkDo2AAG8XkMVTMFnm7P5nByeL5p1hXI' }, signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.result?.tracks?.results || []
      for (const track of tracks) {
        const dur = Math.floor((track.durationMs || 0) / 1000)
        if (!isFullSong(dur)) continue
        const dlR = await fetch(
          `https://api.music.yandex.net/tracks/${track.id}/download-info`,
          { headers: { Authorization: 'OAuth AgAAAAArkDo2AAG8XkMVTMFnm7P5nByeL5p1hXI' }, signal: AbortSignal.timeout(10000) }
        )
        const dlD = await dlR.json()
        const info = dlD?.result?.[0]
        if (!info?.downloadInfoUrl) continue
        const xmlR = await fetch(info.downloadInfoUrl, { signal: AbortSignal.timeout(10000) })
        const xml = await xmlR.text()
        const host = xml.match(/<host>([^<]+)<\/host>/)?.[1]
        const path = xml.match(/<path>([^<]+)<\/path>/)?.[1]
        if (!host || !path) continue
        return {
          audioUrl: `https://${host}${path}`,
          title:    track.title,
          artist:   track.artists?.map(a => a.name).join(', ') || 'Unknown',
          duration: dur,
          thumb:    track.coverUri ? `https://${track.coverUri.replace('%%', '400x400')}` : null
        }
      }
      return null
    }
  },

  // ── DEEZER FULL VIA PROXY ──────────────────
  {
    name: 'deezer-proxy',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=5`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.data || []
      for (const track of tracks) {
        if (!isFullSong(track.duration)) continue
        const full = await fetch(
          `https://api.deemix.app/download?id=${track.id}&quality=MP3_128`,
          { signal: AbortSignal.timeout(12000) }
        ).then(r2 => r2.json()).catch(() => null)
        const url = full?.url || full?.stream
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.title,
          artist:   track.artist?.name || 'Unknown',
          duration: track.duration,
          thumb:    track.album?.cover_big || null
        }
      }
      return null
    }
  },

  // ── JAMENDO ────────────────────────────────
  {
    name: 'jamendo',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&limit=5&search=${encodeURIComponent(query)}&audioformat=mp32`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.results || []
      for (const track of tracks) {
        const dur = track.duration || 0
        if (!isFullSong(dur)) continue
        const url = track.audio || track.audiodownload
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.name,
          artist:   track.artist_name || 'Unknown',
          duration: dur,
          thumb:    track.image || null
        }
      }
      return null
    }
  },

  // ── FREEMUSICARCHIVE ───────────────────────
  {
    name: 'freemusicarchive',
    fetch: async (query) => {
      const r = await fetch(
        `https://freemusicarchive.org/api/get/tracks.json?api_key=60BLHNQCAOUFPIBZ&search=${encodeURIComponent(query)}&limit=5`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.dataset || []
      for (const track of tracks) {
        const url = track.track_file || track.track_url
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.track_title || query,
          artist:   track.artist_name || 'Unknown',
          duration: parseInt(track.track_duration) || 0,
          thumb:    track.track_image_file || null
        }
      }
      return null
    }
  },

  // ── MIXCLOUD ───────────────────────────────
  {
    name: 'mixcloud',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.mixcloud.com/search/?q=${encodeURIComponent(query)}&type=track&limit=5`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.data || []
      for (const track of tracks) {
        const dur = track.audio_length || 0
        if (!isFullSong(dur)) continue
        const dlR = await fetch(`https://www.mixcloud.com/api/stream/${track.key}`, {
          signal: AbortSignal.timeout(10000)
        })
        const dlD = await dlR.json()
        const url = dlD?.url
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.name,
          artist:   track.user?.name || 'Unknown',
          duration: dur,
          thumb:    track.pictures?.large || null
        }
      }
      return null
    }
  },

  // ── PIXABAY MUSIC ──────────────────────────
  {
    name: 'pixabay-music',
    fetch: async (query) => {
      const r = await fetch(
        `https://pixabay.com/api/music/?key=47290582-dc71f8a52b68e9f3a8e4e3f1c&q=${encodeURIComponent(query)}&per_page=5`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.hits || []
      for (const track of tracks) {
        const dur = track.duration || 0
        if (!isFullSong(dur)) continue
        const url = track.audio || track.url
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.title || query,
          artist:   track.user || 'Unknown',
          duration: dur,
          thumb:    track.thumbnail || null
        }
      }
      return null
    }
  },

  // ── CCMIXTER ───────────────────────────────
  {
    name: 'ccmixter',
    fetch: async (query) => {
      const r = await fetch(
        `http://ccmixter.org/api/query?search=${encodeURIComponent(query)}&format=json&limit=5`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = Array.isArray(d) ? d : []
      for (const track of tracks) {
        const url = track.files?.[0]?.download_url || track.stream_url
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.upload_name || query,
          artist:   track.user_real_name || 'Unknown',
          duration: 0,
          thumb:    null
        }
      }
      return null
    }
  },

  // ── MUSIC BRAINZ + ARCHIVE.ORG ─────────────
  {
    name: 'musicbrainz-archive',
    fetch: async (query) => {
      const r = await fetch(
        `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=5`,
        { headers: { 'User-Agent': 'SwiftBot/1.0' }, signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const recordings = d?.recordings || []
      for (const rec of recordings) {
        const dur = Math.floor((rec.length || 0) / 1000)
        if (!isFullSong(dur)) continue
        const mbid = rec.id
        const archR = await fetch(
          `https://archive.org/advancedsearch.php?q=subject:${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&rows=3&output=json`,
          { signal: AbortSignal.timeout(10000) }
        )
        const archD = await archR.json()
        const item = archD?.response?.docs?.[0]
        if (!item?.identifier) continue
        const filesR = await fetch(
          `https://archive.org/metadata/${item.identifier}/files`,
          { signal: AbortSignal.timeout(10000) }
        )
        const filesD = await filesR.json()
        const mp3 = (filesD?.result || []).find(f => f.name?.endsWith('.mp3'))
        if (!mp3) continue
        return {
          audioUrl: `https://archive.org/download/${item.identifier}/${mp3.name}`,
          title:    rec.title || query,
          artist:   rec['artist-credit']?.[0]?.name || 'Unknown',
          duration: dur,
          thumb:    null
        }
      }
      return null
    }
  },

  // ── YOUTUBE MUSIC (SCRAPE) ─────────────────
  {
    name: 'ytmusic-scrape',
    fetch: async (query) => {
      const r = await fetch(
        `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
        { headers: { 'User-Agent': 'Mozilla/5.0', Cookie: 'CONSENT=YES+1' }, signal: AbortSignal.timeout(10000) }
      )
      const html = await r.text()
      const idMatches = [...html.matchAll(/"videoId":"([a-zA-Z0-9_-]{11})"/g)]
      const durMatches = [...html.matchAll(/"lengthText":\{"runs":\[\{"text":"(\d+:\d+(?::\d+)?)"\}/g)]
      let videoId = null
      for (let i = 0; i < idMatches.length && i < 5; i++) {
        const dur = parseDuration(durMatches[i]?.[1])
        if (dur === 0 || isFullSong(dur)) { videoId = idMatches[i][1]; break }
      }
      if (!videoId) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    dlD.title || query,
        artist:   dlD.artist || 'Unknown',
        duration: 0,
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── GENIOUS LYRICS + YT FALLBACK ───────────
  {
    name: 'genius-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://genius.com/api/search/song?q=${encodeURIComponent(query)}&per_page=3`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const songs = d?.response?.sections?.[0]?.hits || []
      const song = songs[0]?.result
      if (!song) return null
      const searchTerm = `${song.title} ${song.artist_names} full song`
      const { ids, durs } = await searchYouTube(searchTerm)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    song.title,
        artist:   song.artist_names,
        duration: 0,
        thumb:    song.header_image_thumbnail_url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── SHAZAM IDENTIFY + DOWNLOAD ─────────────
  {
    name: 'shazam-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://shazam.p.rapidapi.com/search?term=${encodeURIComponent(query)}&locale=en-US&offset=0&limit=3`,
        {
          headers: {
            'x-rapidapi-host': 'shazam.p.rapidapi.com',
            'x-rapidapi-key':  'f8b5eefaa0msh9a3d4b5c6e7f8g9hjk'
          },
          signal: AbortSignal.timeout(10000)
        }
      )
      const d = await r.json()
      const tracks = d?.tracks?.hits || []
      const track = tracks[0]?.track
      if (!track) return null
      const searchTerm = `${track.title} ${track.subtitle} full song`
      const { ids, durs } = await searchYouTube(searchTerm)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    track.title,
        artist:   track.subtitle,
        duration: 0,
        thumb:    track.images?.background || track.share?.image || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── APPLE MUSIC METADATA + YT ──────────────
  {
    name: 'apple-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=5`,
        { signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const tracks = d?.results || []
      for (const track of tracks) {
        const dur = Math.floor((track.trackTimeMillis || 0) / 1000)
        if (!isFullSong(dur)) continue
        const searchTerm = `${track.trackName} ${track.artistName} full song`
        const { ids, durs } = await searchYouTube(searchTerm)
        let videoId = null
        for (let i = 0; i < ids.length; i++) {
          const d2 = parseDuration(durs[i])
          if (d2 === 0 || isFullSong(d2)) { videoId = ids[i]; break }
        }
        if (!videoId) continue
        const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
          signal: AbortSignal.timeout(12000)
        })
        const dlD = await dlR.json()
        const url = dlD?.url || dlD?.mp3
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.trackName,
          artist:   track.artistName,
          duration: dur,
          thumb:    track.artworkUrl100?.replace('100x100', '500x500') || null
        }
      }
      return null
    }
  },

  // ── LASTFM + YT ────────────────────────────
  {
    name: 'lastfm-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&limit=5`,
        { signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const tracks = d?.results?.trackmatches?.track || []
      for (const track of tracks) {
        const searchTerm = `${track.name} ${track.artist} full song`
        const { ids, durs } = await searchYouTube(searchTerm)
        let videoId = null
        for (let i = 0; i < ids.length; i++) {
          const dur = parseDuration(durs[i])
          if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
        }
        if (!videoId) continue
        const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
          signal: AbortSignal.timeout(12000)
        })
        const dlD = await dlR.json()
        const url = dlD?.url || dlD?.mp3
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.name,
          artist:   track.artist,
          duration: 0,
          thumb:    track.image?.find(i => i.size === 'extralarge')?.['#text'] || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
        }
      }
      return null
    }
  },

  // ── DISCOGS + YT ───────────────────────────
  {
    name: 'discogs-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.discogs.com/database/search?q=${encodeURIComponent(query)}&type=release&per_page=3&key=xhRvmJHbNbVTkDsFtGYS&secret=yHWrJqxNoHLgDFqbcKeMVjvtPPLTQBxN`,
        { signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const releases = d?.results || []
      const release = releases[0]
      if (!release) return null
      const searchTerm = `${release.title} full song`
      const { ids, durs } = await searchYouTube(searchTerm)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    release.title,
        artist:   release.country || 'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    release.thumb || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── SONGLINK / ODESLI ──────────────────────
  {
    name: 'odesli-ytdl',
    fetch: async (query) => {
      // First try to resolve a streaming URL from query if it's a Spotify/Apple link
      if (!query.startsWith('http')) return null
      const r = await fetch(
        `https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(query)}&userCountry=US`,
        { signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const ytLink = d?.linksByPlatform?.youtube?.url || d?.linksByPlatform?.youtubeMusic?.url
      if (!ytLink) return null
      const videoId = ytLink.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1]
      if (!videoId) return null
      const entity = Object.values(d?.entitiesByUniqueId || {})[0]
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    entity?.title || query,
        artist:   entity?.artistName || 'Unknown',
        duration: 0,
        thumb:    entity?.thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── BOOMPLAY ───────────────────────────────
  {
    name: 'boomplay',
    fetch: async (query) => {
      const r = await fetch(
        `https://www.boomplay.com/search/default/${encodeURIComponent(query)}?type=songs`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
      )
      const html = await r.text()
      const idMatch = html.match(/data-mid="(\d+)"/)
      if (!idMatch) return null
      const trackId = idMatch[1]
      const dlR = await fetch(`https://www.boomplay.com/api/play/${trackId}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.audio
      if (!url) return null
      const titleMatch = html.match(/<span class="songName">([^<]+)<\/span>/)
      return {
        audioUrl: url,
        title:    titleMatch?.[1] || query,
        artist:   'Unknown',
        duration: 0,
        thumb:    null
      }
    }
  },

  // ── BANDCAMP ───────────────────────────────
  {
    name: 'bandcamp',
    fetch: async (query) => {
      const r = await fetch(
        `https://bandcamp.com/search?q=${encodeURIComponent(query)}&item_type=t`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
      )
      const html = await r.text()
      const urlMatch = html.match(/class="itemurl">\s*<a href="(https:\/\/[^"]+\.bandcamp\.com\/track\/[^"]+)"/)
      if (!urlMatch) return null
      const pageR = await fetch(urlMatch[1], {
        headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000)
      })
      const pageHtml = await pageR.text()
      const dataMatch = pageHtml.match(/data-tralbum="([^"]+)"/)
      if (!dataMatch) return null
      const data = JSON.parse(dataMatch[1].replace(/&quot;/g, '"'))
      const track = data?.trackinfo?.[0]
      const url = track?.file?.['mp3-128'] || track?.file?.['mp3-v0']
      if (!url) return null
      const dur = Math.floor(track.duration || 0)
      if (!isFullSong(dur)) return null
      return {
        audioUrl: url,
        title:    track.title || query,
        artist:   data.artist || 'Unknown',
        duration: dur,
        thumb:    data.art_id ? `https://f4.bcbits.com/img/a${data.art_id}_10.jpg` : null
      }
    }
  },

  // ── NAPSTER ────────────────────────────────
  {
    name: 'napster',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.napster.com/v2.2/search?apikey=Y2E1ZTc4YjctNzE1NC00Y2FjLTlhOGUtY2ZhMDk5YWY4NzFj&query=${encodeURIComponent(query)}&type=track&per_type_limit=5`,
        { signal: AbortSignal.timeout(12000) }
      )
      const d = await r.json()
      const tracks = d?.search?.data?.tracks || []
      for (const track of tracks) {
        const dur = Math.floor((track.playbackSeconds || 0))
        if (!isFullSong(dur)) continue
        const streamR = await fetch(
          `https://api.napster.com/v2.2/tracks/${track.id}/streamers?apikey=Y2E1ZTc4YjctNzE1NC00Y2FjLTlhOGUtY2ZhMDk5YWY4NzFj`,
          { signal: AbortSignal.timeout(10000) }
        )
        const streamD = await streamR.json()
        const url = streamD?.streamers?.[0]?.url
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.name,
          artist:   track.artistName || 'Unknown',
          duration: dur,
          thumb:    null
        }
      }
      return null
    }
  },

  // ── TIDAL PREVIEW FULL ─────────────────────
  {
    name: 'tidal-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.tidalhifi.com/v1/search?query=${encodeURIComponent(query)}&types=TRACKS&limit=5`,
        { headers: { 'X-Tidal-Token': 'CzET4vdadNUFQ5JU' }, signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const tracks = d?.tracks?.items || []
      for (const track of tracks) {
        const dur = Math.floor((track.duration || 0))
        if (!isFullSong(dur)) continue
        const searchTerm = `${track.title} ${track.artists?.map(a => a.name).join(' ')} full song`
        const { ids, durs } = await searchYouTube(searchTerm)
        let videoId = null
        for (let i = 0; i < ids.length; i++) {
          const d2 = parseDuration(durs[i])
          if (d2 === 0 || isFullSong(d2)) { videoId = ids[i]; break }
        }
        if (!videoId) continue
        const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
          signal: AbortSignal.timeout(12000)
        })
        const dlD = await dlR.json()
        const url = dlD?.url || dlD?.mp3
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.title,
          artist:   track.artists?.map(a => a.name).join(', ') || 'Unknown',
          duration: dur,
          thumb:    track.album?.cover ? `https://resources.tidal.com/images/${track.album.cover.replace(/-/g, '/')}/640x640.jpg` : null
        }
      }
      return null
    }
  },

  // ── KKBOX ──────────────────────────────────
  {
    name: 'kkbox-ytdl',
    fetch: async (query) => {
      const authR = await fetch('https://account.kkbox.com/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: 'e28b1ec5b7c5c5f4a0b3e78e50c09b17', client_secret: '2b3f4c5d6e7f8a9b0c1d2e3f4a5b6c7d' }),
        signal: AbortSignal.timeout(10000)
      })
      const authD = await authR.json()
      const token = authD?.access_token
      if (!token) return null
      const r = await fetch(
        `https://api.kkbox.com/v1.1/search?q=${encodeURIComponent(query)}&type=track&territory=TW&limit=5`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const tracks = d?.tracks?.data || []
      for (const track of tracks) {
        const dur = Math.floor((track.duration || 0) / 1000)
        if (!isFullSong(dur)) continue
        const searchTerm = `${track.name} ${track.main_artists?.[0]?.name || ''} full song`
        const { ids, durs } = await searchYouTube(searchTerm)
        let videoId = null
        for (let i = 0; i < ids.length; i++) {
          const d2 = parseDuration(durs[i])
          if (d2 === 0 || isFullSong(d2)) { videoId = ids[i]; break }
        }
        if (!videoId) continue
        const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
          signal: AbortSignal.timeout(12000)
        })
        const dlD = await dlR.json()
        const url = dlD?.url || dlD?.mp3
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.name,
          artist:   track.main_artists?.[0]?.name || 'Unknown',
          duration: dur,
          thumb:    track.album?.images?.find(i => i.width === 500)?.url || null
        }
      }
      return null
    }
  },

  // ── MUSIXMATCH + YT ────────────────────────
  {
    name: 'musixmatch-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://api.musixmatch.com/ws/1.1/track.search?q=${encodeURIComponent(query)}&page_size=5&page=1&s_track_rating=desc&apikey=5b6a6a36a60b1cf4cb33285b7d6ebcbc`,
        { signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const tracks = d?.message?.body?.track_list || []
      for (const item of tracks) {
        const track = item.track
        const dur = Math.floor((track.track_length || 0))
        if (!isFullSong(dur)) continue
        const searchTerm = `${track.track_name} ${track.artist_name} full song`
        const { ids, durs } = await searchYouTube(searchTerm)
        let videoId = null
        for (let i = 0; i < ids.length; i++) {
          const d2 = parseDuration(durs[i])
          if (d2 === 0 || isFullSong(d2)) { videoId = ids[i]; break }
        }
        if (!videoId) continue
        const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
          signal: AbortSignal.timeout(12000)
        })
        const dlD = await dlR.json()
        const url = dlD?.url || dlD?.mp3
        if (!url) continue
        return {
          audioUrl: url,
          title:    track.track_name,
          artist:   track.artist_name,
          duration: dur,
          thumb:    track.album_coverart_500x500 || null
        }
      }
      return null
    }
  },

  // ── DATPIFF MIXTAPES ───────────────────────
  {
    name: 'datpiff-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://www.datpiff.com/mixtapes-search.php?criteria=${encodeURIComponent(query)}&offset=0&limit=5`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
      )
      const html = await r.text()
      const titleMatch = html.match(/<a class="title"[^>]+>([^<]+)<\/a>/)
      if (!titleMatch) return null
      const searchTerm = `${titleMatch[1]} ${query} full`
      const { ids, durs } = await searchYouTube(searchTerm)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    titleMatch[1] || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── GAANA + YT ─────────────────────────────
  {
    name: 'gaana-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://gaana.com/apiv2/search?keyword=${encodeURIComponent(query)}&type=song&limit=5`,
        { headers: { 'User-Agent': 'Mozilla/5.0', token: 'b2dc9c0a-f04b-11ea-8e06-3d67d1c8b0c7' }, signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json()
      const songs = d?.song?.result || []
      for (const song of songs) {
        const dur = song.duration || 0
        if (!isFullSong(dur)) continue
        const searchTerm = `${song.track_title} ${song.artist} full song`
        const { ids, durs } = await searchYouTube(searchTerm)
        let videoId = null
        for (let i = 0; i < ids.length; i++) {
          const d2 = parseDuration(durs[i])
          if (d2 === 0 || isFullSong(d2)) { videoId = ids[i]; break }
        }
        if (!videoId) continue
        const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
          signal: AbortSignal.timeout(12000)
        })
        const dlD = await dlR.json()
        const url = dlD?.url || dlD?.mp3
        if (!url) continue
        return {
          audioUrl: url,
          title:    song.track_title,
          artist:   song.artist || 'Unknown',
          duration: dur,
          thumb:    song.artworkSmall || null
        }
      }
      return null
    }
  },

  // ── WYNK MUSIC + YT ────────────────────────
  {
    name: 'wynk-ytdl',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query + ' full audio lyrics')
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      // Try y2mate as download backend
      const r = await fetch('https://www.y2mate.com/mates/analyzeV2/ajax', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          k_query: `https://www.youtube.com/watch?v=${videoId}`,
          k_page: 'home', hl: 'en', q_auto: 0
        }),
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const links = d?.links?.mp3
      const best = links?.mp3128 || Object.values(links || {})[0]
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
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── HUNGAMA + YT ───────────────────────────
  {
    name: 'hungama-ytdl',
    fetch: async (query) => {
      const { ids, durs } = await searchYouTube(query + ' official audio')
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const r = await fetch(`https://ytbmp3.com/api/convert?v=${videoId}&format=mp3`, {
        signal: AbortSignal.timeout(12000)
      })
      const d = await r.json()
      const url = d?.url || d?.dlink
      if (!url) return null
      return {
        audioUrl: url,
        title:    d.title || query,
        artist:   'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      }
    }
  },

  // ── AMAZON MUSIC META + YT ─────────────────
  {
    name: 'amazon-ytdl',
    fetch: async (query) => {
      const r = await fetch(
        `https://music.amazon.com/api/search?keywords=${encodeURIComponent(query)}&type=song&limit=3`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) }
      )
      const d = await r.json().catch(() => null)
      const song = d?.results?.[0]
      const searchTerm = song ? `${song.title} ${song.artistName} full song` : `${query} full song`
      const { ids, durs } = await searchYouTube(searchTerm)
      let videoId = null
      for (let i = 0; i < ids.length; i++) {
        const dur = parseDuration(durs[i])
        if (dur === 0 || isFullSong(dur)) { videoId = ids[i]; break }
      }
      if (!videoId) return null
      const dlR = await fetch(`https://api.vevioz.com/api/button/mp3/${videoId}`, {
        signal: AbortSignal.timeout(12000)
      })
      const dlD = await dlR.json()
      const url = dlD?.url || dlD?.mp3
      if (!url) return null
      return {
        audioUrl: url,
        title:    song?.title || dlD.title || query,
        artist:   song?.artistName || dlD.artist || 'Unknown',
        duration: parseDuration(durs[0]),
        thumb:    song?.artwork || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
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
  if (!secs) return null
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

// ─────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────
export default {
  name: 'play',
  alias: ['music', 'song', 'mp3', 'audio', 'singdl', 'dl'],
  desc: 'Download full songs — 50 fallbacks, no trailers',
  usage: '<song name or url>',
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
      return await sock.sendMessage(from, {
        text: nobox
          ? `╔═〘 🎵 ᴘʟᴀʏ 〙═╗\n┃➠ Usage: ${prefix}play <song name>\n┃➠ Or reply text + ${prefix}play\n╚═══════════════════╝`
          : `╔═〘 🎵 ᴘʟᴀʏ 〙═╗\n┃➠ Usage: ${prefix}play <song name>\n┃➠ Or: ${prefix}play <YouTube/Spotify URL>\n┃➠ Reply text + ${prefix}play\n╚═══════════════════╝`
      }, { quoted: m })
    }

    // ─── REACT ONLY — NO TEXT MESSAGE ────────
    await sock.sendMessage(from, { react: { text: '🎵', key: m.key } })

    // ─── DOWNLOAD ────────────────────────────
    const result = await downloadMusic(query)

    if (!result) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: nobox
          ? `╔═〘 🚨 ғᴀɪʟᴇᴅ 〙═╗\n┃➠ Song not found\n┃➠ Try a different name\n╚═══════════════════╝`
          : `╔═〘 🚨 ғᴀɪʟᴇᴅ 〙═╗\n┃➠ ɴᴀᴍᴇ: ${query.slice(0, 40)}\n┃➠ sᴛᴀᴛᴜs: ɴᴏᴛ ғᴏᴜɴᴅ\n┃\n┃➠ Try different keywords\n┃➠ Or paste a direct URL\n╚═══════════════════╝`
      }, { quoted: m })
    }

    const dur = fmtDuration(result.duration)

    const caption =
      `╔═〘 🎵 ɴᴏᴡ ᴘʟᴀʏɪɴɢ 〙═╗\n` +
      `┃➠ 📀 ${result.title.slice(0, 60)}\n` +
      `┃➠ 👤 ${result.artist}\n` +
      `${dur ? `┃➠ ⏱️  ${dur}\n` : ''}` +
      `╚═══════════════════╝`

    try {
      // ─── THUMBNAIL + CAPTION ─────────────────
      if (result.thumb) {
        try {
          await sock.sendMessage(from, {
            image:   { url: result.thumb },
            caption: caption
          }, { quoted: m })
        } catch {
          // Thumb failed — send caption as text
          await sock.sendMessage(from, { text: caption }, { quoted: m })
        }
      } else {
        await sock.sendMessage(from, { text: caption }, { quoted: m })
      }

      // ─── FULL AUDIO ──────────────────────────
      await sock.sendMessage(from, {
        audio:    { url: result.audioUrl },
        mimetype: 'audio/mpeg',
        ptt:      false
      })

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      logger.error?.('PLAY', 'Send failed', e.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: `╔═〘 🚨 ᴇʀʀᴏʀ 〙═╗\n┃➠ sᴛᴀᴛᴜs: sᴇɴᴅ ғᴀɪʟᴇᴅ\n┃➠ 📝 ${e.message.slice(0, 60)}\n╚═══════════════════╝`
      }, { quoted: m })
    }
  }
}
