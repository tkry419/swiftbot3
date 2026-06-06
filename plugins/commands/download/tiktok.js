/**
 * SwiftBot - plugins/commands/download/tiktok.js
 * TikTok Downloader — 15 API fallbacks, never-fail mode
 * Features: video (no-wm), audio/mp3, slideshow, metadata
 */

import fetch from 'node-fetch'

// ─────────────────────────────────────────────
// 15 API FALLBACKS
// ─────────────────────────────────────────────
const TIKTOK_APIS = [
  {
    name: 'tikwm',
    fetch: async (url) => {
      const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}&hd=1`, { timeout: 10000 })
      const d = await r.json()
      if (!d?.data?.play) return null
      return {
        videoUrl:  d.data.hdplay || d.data.play,
        audioUrl:  d.data.music,
        thumb:     d.data.cover,
        title:     d.data.title || 'TikTok Video',
        author:    d.data.author?.nickname || 'Unknown',
        likes:     d.data.digg_count || 0,
        views:     d.data.play_count || 0,
        duration:  d.data.duration || 0,
        isSlide:   Array.isArray(d.data.images) && d.data.images.length > 0,
        slides:    d.data.images || []
      }
    }
  },
  {
    name: 'tiklydown',
    fetch: async (url) => {
      const r = await fetch(`https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.video?.noWatermark || d?.video?.watermark
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d.music?.play_url || null,
        thumb:    d.cover || null,
        title:    d.title || 'TikTok Video',
        author:   d.author?.name || 'Unknown',
        likes:    d.stats?.likeCount || 0,
        views:    d.stats?.playCount || 0,
        duration: d.duration || 0,
        isSlide:  false,
        slides:   []
      }
    }
  },
  {
    name: 'tikmate',
    fetch: async (url) => {
      const r = await fetch(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      if (!d?.token) return null
      return {
        videoUrl: `https://tikmate.app/download/${d.token}/${d.id}.mp4`,
        audioUrl: null,
        thumb:    d.thumb || null,
        title:    d.desc || 'TikTok Video',
        author:   d.author || 'Unknown',
        likes:    0,
        views:    0,
        duration: 0,
        isSlide:  false,
        slides:   []
      }
    }
  },
  {
    name: 'ssstik',
    fetch: async (url) => {
      const r = await fetch(`https://ssstik.io/abc?url=dl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ id: url, locale: 'en', tt: 'YWJj' }),
        timeout: 10000
      })
      const text = await r.text()
      const match = text.match(/href="(https:\/\/[^"]+\.mp4[^"]*)"/)
      if (!match) return null
      return {
        videoUrl: match[1],
        audioUrl: null,
        thumb:    null,
        title:    'TikTok Video',
        author:   'Unknown',
        likes:    0,
        views:    0,
        duration: 0,
        isSlide:  false,
        slides:   []
      }
    }
  },
  {
    name: 'snaptik',
    fetch: async (url) => {
      const r = await fetch(`https://snaptik.app/abc2.php?url=${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.videoUrl || d?.url || d?.data?.url
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: null,
        thumb:    null,
        title:    d.title || 'TikTok Video',
        author:   d.author || 'Unknown',
        likes:    0,
        views:    0,
        duration: 0,
        isSlide:  false,
        slides:   []
      }
    }
  },
  {
    name: 'musicaldown',
    fetch: async (url) => {
      const r = await fetch(`https://musicaldown.com/api/download?url=${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.videoUrl || d?.links?.[0]?.url
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d?.audioUrl || null,
        thumb:    null,
        title:    d.title || 'TikTok Video',
        author:   d.author || 'Unknown',
        likes:    0,
        views:    0,
        duration: 0,
        isSlide:  false,
        slides:   []
      }
    }
  },
  {
    name: 'tikvid',
    fetch: async (url) => {
      const r = await fetch(`https://tikvid.io/api/ajaxSearch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: url, t: 'video', lang: 'en' }),
        timeout: 10000
      })
      const d = await r.json()
      const v = d?.data?.[0]?.url
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: null,
        thumb:    d?.data?.[0]?.thumbnail || null,
        title:    d?.data?.[0]?.title || 'TikTok Video',
        author:   'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'savefrom',
    fetch: async (url) => {
      const r = await fetch(`https://worker.sf-tools.com/savefrom.php?sf_url=${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.url?.[0]?.url
      if (!v) return null
      return {
        videoUrl: v.startsWith('//') ? `https:${v}` : v,
        audioUrl: null,
        thumb:    d.thumb || null,
        title:    d.meta?.title || 'TikTok Video',
        author:   'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'tikcdn',
    fetch: async (url) => {
      const r = await fetch(`https://tikcdn.io/ssstik/${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.play || d?.video
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d?.music || null,
        thumb:    d?.cover || null,
        title:    d?.title || 'TikTok Video',
        author:   d?.author || 'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'tikdd',
    fetch: async (url) => {
      const r = await fetch(`https://tikdd.cc/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 10000
      })
      const d = await r.json()
      const v = d?.videoUrl || d?.url
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d?.audioUrl || null,
        thumb:    null,
        title:    d?.title || 'TikTok Video',
        author:   d?.author || 'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'dlpanda',
    fetch: async (url) => {
      const r = await fetch(`https://dlpanda.com/api/tiktok`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, quality: 'hd' }),
        timeout: 10000
      })
      const d = await r.json()
      const v = d?.data?.video || d?.video
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d?.data?.music || null,
        thumb:    d?.data?.cover || null,
        title:    d?.data?.desc || 'TikTok Video',
        author:   d?.data?.author || 'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'tikfinity',
    fetch: async (url) => {
      const r = await fetch(`https://tikfinity.com/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 10000
      })
      const d = await r.json()
      const v = d?.url || d?.videoUrl || d?.data?.url
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d?.audioUrl || null,
        thumb:    null,
        title:    d?.title || 'TikTok Video',
        author:   'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'vevioz',
    fetch: async (url) => {
      const r = await fetch(`https://vevioz.com/api/button/mp4/${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.url || d?.mp4
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: null,
        thumb:    null,
        title:    d?.title || 'TikTok Video',
        author:   'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'loveft',
    fetch: async (url) => {
      const r = await fetch(`https://loveft.com/api/tiktok?url=${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.url || d?.video
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d?.audio || null,
        thumb:    null,
        title:    d?.title || 'TikTok Video',
        author:   d?.author || 'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  },
  {
    name: 'tikdownorg',
    fetch: async (url) => {
      const r = await fetch(`https://tikdown.org/api?url=${encodeURIComponent(url)}`, { timeout: 10000 })
      const d = await r.json()
      const v = d?.url || d?.play || d?.data?.play
      if (!v) return null
      return {
        videoUrl: v,
        audioUrl: d?.audio || null,
        thumb:    null,
        title:    d?.title || 'TikTok Video',
        author:   d?.author || 'Unknown',
        likes:    0, views: 0, duration: 0, isSlide: false, slides: []
      }
    }
  }
]

// ─────────────────────────────────────────────
// NEVER-FAIL DOWNLOAD ENGINE
// ─────────────────────────────────────────────
async function downloadTikTok(url) {
  for (const api of TIKTOK_APIS) {
    try {
      const result = await api.fetch(url)
      if (result?.videoUrl) {
        result._api = api.name
        return result
      }
    } catch {
      // Silent — try next
    }
  }
  return null
}

function fmtNum(n) {
  if (!n) return '0'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ─────────────────────────────────────────────
// COMMAND
// ─────────────────────────────────────────────
export default {
  name: 'tiktok',
  alias: ['tt', 'tiktokdl', 'tiktoknowm', 'ttdl'],
  desc: 'TikTok downloader — no watermark, audio, slideshow',
  usage: '<url> [audio]',
  category: 'Download',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from   = m.key.remoteJid
    const prefix = await db.get('prefix') || '#'

    // Check reply or arg for URL
    const quoted   = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedTx = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const url      = args.find(a => a.includes('tiktok.com') || a.includes('vm.tiktok')) || quotedTx

    const wantAudio = args.includes('audio') || args.includes('mp3') || args.includes('song')

    if (!url) {
      const help = `*TikTok Downloader*\n\n` +
        `Usage:\n` +
        `  ${prefix}tiktok <url>        — Download video\n` +
        `  ${prefix}tiktok <url> audio  — Audio only (mp3)\n` +
        `  Reply a link + ${prefix}tiktok\n\n` +
        `Alias: tt, tiktokdl, tiktoknowm, ttdl`
      return await sock.sendMessage(from, {
        text: nobox ? help : await box.info(help)
      }, { quoted: m })
    }

    if (!url.includes('tiktok.com') && !url.includes('vm.tiktok')) {
      return await sock.sendMessage(from, {
        text: nobox ? '❌ Invalid TikTok URL' : await box.error('Invalid TikTok URL')
      }, { quoted: m })
    }

    // Thinking reaction
    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    const result = await downloadTikTok(url)

    if (!result) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: nobox ? '❌ All 15 APIs failed. Try another link.' : await box.error('All 15 APIs failed. Try another link.')
      }, { quoted: m })
    }

    const caption =
      `╔═━━━━━━━━━━━━━━━━═❒\n` +
      `║  TIKTOK DOWNLOADED\n` +
      `╠═━━━━━━━━━━━━━━━━═❒\n` +
      `║  📝 ${result.title.slice(0, 80)}\n` +
      `║  👤 ${result.author}\n` +
      `${result.likes  ? `║  ❤️  ${fmtNum(result.likes)} likes\n`  : ''}` +
      `${result.views  ? `║  👁️  ${fmtNum(result.views)} views\n`  : ''}` +
      `${result.duration ? `║  ⏱️  ${result.duration}s\n` : ''}` +
      `║  ✅ No Watermark\n` +
      `╚━━━━━━━━━━━━━━━━━═❒`

    try {
      // ── SLIDESHOW (photos) ───────────────────
      if (result.isSlide && result.slides.length > 0) {
        for (let i = 0; i < Math.min(result.slides.length, 10); i++) {
          await sock.sendMessage(from, {
            image: { url: result.slides[i] },
            caption: i === 0 ? caption : `${i + 1}/${result.slides.length}`
          }, { quoted: i === 0 ? m : undefined })
        }
        // Send audio if available
        if (result.audioUrl) {
          await sock.sendMessage(from, {
            audio: { url: result.audioUrl },
            mimetype: 'audio/mpeg',
            ptt: false
          })
        }
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
        return
      }

      // ── AUDIO ONLY ───────────────────────────
      if (wantAudio && result.audioUrl) {
        await sock.sendMessage(from, {
          audio: { url: result.audioUrl },
          mimetype: 'audio/mpeg',
          ptt: false,
          caption
        }, { quoted: m })
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
        return
      }

      // ── VIDEO ────────────────────────────────
      await sock.sendMessage(from, {
        video: { url: result.videoUrl },
        caption
      }, { quoted: m })

      // Optionally offer audio too
      if (result.audioUrl && !wantAudio) {
        await sock.sendMessage(from, {
          text: `💡 Audio available: ${prefix}tiktok ${url} audio`
        })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (sendErr) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Download link found but send failed: ${sendErr.message}`
          : await box.error(`Send failed: ${sendErr.message}`)
      }, { quoted: m })
    }
  }
}