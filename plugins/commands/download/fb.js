/**
 * SwiftBot - plugins/commands/download/facebook.js
 * Facebook Downloader — 15 API fallbacks, never-fail mode
 * Features: videos, reels, stories, HD/SD quality, metadata
 */

import fetch from 'node-fetch'

// ─────────────────────────────────────────────
// 15 API FALLBACKS
// ─────────────────────────────────────────────
const FB_APIS = [
  {
    name: 'fdownloader',
    fetch: async (url) => {
      const r = await fetch(`https://fdownloader.net/api/ajaxSearch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: url, lang: 'en' }),
        timeout: 12000
      })
      const d = await r.json()
      const items = d?.data || []
      const hd  = items.find(i => i.resolution?.includes('HD') || i.quality === 'hd')
      const sd  = items.find(i => i.resolution?.includes('SD') || i.quality === 'sd') || items[0]
      const picked = hd || sd
      if (!picked?.url) return null
      return {
        hdUrl: hd?.url || null,
        sdUrl: sd?.url || picked?.url,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'getfvid',
    fetch: async (url) => {
      const r = await fetch(`https://getfvid.com/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const hd = d?.hdUrl || d?.hd || d?.data?.hd
      const sd = d?.sdUrl || d?.sd || d?.data?.sd || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'savefrom',
    fetch: async (url) => {
      const r = await fetch(`https://worker.sf-tools.com/savefrom.php?sf_url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const urls = d?.url || []
      const hd  = urls.find(u => u.id?.includes('hd'))
      const sd  = urls.find(u => u.id?.includes('sd')) || urls[0]
      const hUrl = hd?.url ? (hd.url.startsWith('//') ? `https:${hd.url}` : hd.url) : null
      const sUrl = sd?.url ? (sd.url.startsWith('//') ? `https:${sd.url}` : sd.url) : null
      if (!sUrl && !hUrl) return null
      return {
        hdUrl: hUrl,
        sdUrl: sUrl || hUrl,
        thumb: d.thumb || null,
        title: d.meta?.title || 'Facebook Video',
        duration: 0,
        quality: hUrl ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'fbdown',
    fetch: async (url) => {
      const r = await fetch(`https://fbdown.net/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl || d?.data?.hd
      const sd = d?.sd || d?.sdUrl || d?.data?.sd || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'fbvideodownloader',
    fetch: async (url) => {
      const r = await fetch(`https://fbvideodownloader.net/ccf29b7db7c28b4a2de8d2a8c7e2d1f5`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': 'https://fbvideodownloader.net'
        },
        body: new URLSearchParams({ URLz: url }),
        timeout: 12000
      })
      const text = await r.text()
      const hdMatch = text.match(/href="(https:\/\/[^"]+\.mp4[^"]*?)"\s*[^>]*>[^<]*HD/i)
      const sdMatch = text.match(/href="(https:\/\/[^"]+\.mp4[^"]*?)"\s*[^>]*>[^<]*SD/i) ||
                      text.match(/href="(https:\/\/[^"]+\.mp4[^"]*?)"/)
      if (!hdMatch && !sdMatch) return null
      return {
        hdUrl: hdMatch ? hdMatch[1] : null,
        sdUrl: sdMatch ? sdMatch[1] : hdMatch?.[1],
        thumb: null,
        title: 'Facebook Video',
        duration: 0,
        quality: hdMatch ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'downloadfb',
    fetch: async (url) => {
      const r = await fetch(`https://www.downloadfb.com/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl
      const sd = d?.sd || d?.sdUrl || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'snapsave',
    fetch: async (url) => {
      const r = await fetch(`https://snapsave.app/action.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: new URLSearchParams({ url }),
        timeout: 12000
      })
      const text = await r.text()
      const matches = [...text.matchAll(/href="(https:\/\/[^"]+\.mp4[^"]*?)"/g)]
      if (!matches.length) return null
      return {
        hdUrl: matches[0]?.[1] || null,
        sdUrl: matches[1]?.[1] || matches[0]?.[1],
        thumb: null,
        title: 'Facebook Video',
        duration: 0,
        quality: matches.length > 1 ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'fastdl',
    fetch: async (url) => {
      const r = await fetch(`https://fastdl.app/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl
      const sd = d?.sd || d?.sdUrl || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'fbsave',
    fetch: async (url) => {
      const r = await fetch(`https://fbsave.net/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl || d?.data?.hd
      const sd = d?.sd || d?.sdUrl || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: null,
        title: d.title || 'Facebook Video',
        duration: 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'v3.fdownloader',
    fetch: async (url) => {
      const r = await fetch(`https://v3.fdownloader.net/api/ajaxSearch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: url, lang: 'en', w: '' }),
        timeout: 12000
      })
      const d = await r.json()
      const items = d?.data || []
      const hd  = items.find(i => i.quality === 'hd' || i.resolution?.toLowerCase().includes('hd'))
      const sd  = items.find(i => i.quality === 'sd') || items[0]
      if (!sd?.url && !hd?.url) return null
      return {
        hdUrl: hd?.url || null,
        sdUrl: sd?.url || hd?.url,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'videodl',
    fetch: async (url) => {
      const r = await fetch(`https://videodl.org/api/facebook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl
      const sd = d?.sd || d?.sdUrl || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'fbvideo',
    fetch: async (url) => {
      const r = await fetch(`https://fbvideo.download/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl
      const sd = d?.sd || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: null,
        title: d.title || 'Facebook Video',
        duration: 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'keepvid',
    fetch: async (url) => {
      const r = await fetch(`https://keepvid.ch/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl
      const sd = d?.sd || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: d.thumbnail || null,
        title: d.title || 'Facebook Video',
        duration: d.duration || 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'savevid',
    fetch: async (url) => {
      const r = await fetch(`https://savevid.net/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl
      const sd = d?.sd || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: null,
        title: d.title || 'Facebook Video',
        duration: 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  },
  {
    name: 'loopsaver',
    fetch: async (url) => {
      const r = await fetch(`https://loopsaver.com/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const hd = d?.hd || d?.hdUrl
      const sd = d?.sd || d?.url
      if (!sd && !hd) return null
      return {
        hdUrl: hd || null,
        sdUrl: sd || hd,
        thumb: null,
        title: d.title || 'Facebook Video',
        duration: 0,
        quality: hd ? 'HD+SD' : 'SD'
      }
    }
  }
]

// ─────────────────────────────────────────────
// NEVER-FAIL ENGINE
// ─────────────────────────────────────────────
async function downloadFB(url) {
  for (const api of FB_APIS) {
    try {
      const result = await api.fetch(url)
      if (result?.sdUrl || result?.hdUrl) {
        result._api = api.name
        return result
      }
    } catch {
      // Silent — next API
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
  name: 'facebook',
  alias: ['fb', 'fbdl', 'fbvideo', 'reelfb'],
  desc: 'Facebook downloader — videos, reels, stories, HD/SD',
  usage: '<url> [hd|sd]',
  category: 'Download',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from   = m.key.remoteJid
    const prefix = await db.get('prefix') || '#'

    const quoted   = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedTx = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const url      = args.find(a =>
      a.includes('facebook.com') ||
      a.includes('fb.watch') ||
      a.includes('fb.com')
    ) || quotedTx

    const wantHD = args.includes('hd')
    const wantSD = args.includes('sd')

    if (!url) {
      const help =
        `*Facebook Downloader*\n\n` +
        `Supports: Videos, Reels, Stories\n` +
        `Quality: HD & SD auto-detected\n\n` +
        `Usage:\n` +
        `  ${prefix}fb <url>      — Best quality\n` +
        `  ${prefix}fb <url> hd  — Force HD\n` +
        `  ${prefix}fb <url> sd  — Force SD\n` +
        `  Reply a link + ${prefix}fb\n\n` +
        `Alias: facebook, fbdl, fbvideo, reelfb`
      return await sock.sendMessage(from, {
        text: nobox ? help : await box.info(help)
      }, { quoted: m })
    }

    if (!url.includes('facebook.com') && !url.includes('fb.watch') && !url.includes('fb.com')) {
      return await sock.sendMessage(from, {
        text: nobox ? '❌ Invalid Facebook URL' : await box.error('Invalid Facebook URL')
      }, { quoted: m })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    const result = await downloadFB(url)

    if (!result) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: nobox ? '❌ All 15 APIs failed. Try another link or check if video is public.' : await box.error('All 15 APIs failed. Check if video is public.')
      }, { quoted: m })
    }

    // Pick quality
    let sendUrl = result.sdUrl
    let qualityLabel = 'SD'
    if (wantHD && result.hdUrl) {
      sendUrl = result.hdUrl
      qualityLabel = 'HD'
    } else if (!wantSD && result.hdUrl) {
      // Default: HD if available
      sendUrl = result.hdUrl
      qualityLabel = 'HD'
    }

    const caption =
      `╔═━━━━━━━━━━━━━━━━═❒\n` +
      `║  FACEBOOK DOWNLOADED\n` +
      `╠═━━━━━━━━━━━━━━━━═❒\n` +
      `║  📝 ${String(result.title).slice(0, 80)}\n` +
      `${result.duration ? `║  ⏱️  ${result.duration}s\n` : ''}` +
      `║  🎯 Quality: ${qualityLabel}\n` +
      `║  📥 Downloaded\n` +
      `╚━━━━━━━━━━━━━━━━━═❒`

    try {
      await sock.sendMessage(from, {
        video: { url: sendUrl },
        caption
      }, { quoted: m })

      // If HD available and user didn't specifically ask for SD, offer SD too
      if (result.hdUrl && result.sdUrl && !wantHD && !wantSD) {
        await sock.sendMessage(from, {
          text: `💡 Also available: ${prefix}fb ${url} sd (smaller file)`
        })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (sendErr) {
      // If HD failed, fallback to SD
      if (qualityLabel === 'HD' && result.sdUrl && result.sdUrl !== sendUrl) {
        try {
          await sock.sendMessage(from, {
            video: { url: result.sdUrl },
            caption: caption.replace('HD', 'SD (HD failed, fallback)')
          }, { quoted: m })
          await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
          return
        } catch {}
      }

      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Send failed: ${sendErr.message}`
          : await box.error(`Send failed: ${sendErr.message}`)
      }, { quoted: m })
    }
  }
}
