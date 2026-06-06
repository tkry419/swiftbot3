/**
 * SwiftBot - plugins/commands/download/instagram.js
 * Instagram Downloader — 15 API fallbacks, never-fail mode
 * Features: reels, posts (multi), stories, audio, metadata
 */

import fetch from 'node-fetch'

// ─────────────────────────────────────────────
// 15 API FALLBACKS
// ─────────────────────────────────────────────
const IG_APIS = [
  {
    name: 'instagramsave',
    fetch: async (url) => {
      const r = await fetch(`https://instagramsave.org/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const items = d?.data || d?.result || []
      const first = Array.isArray(items) ? items[0] : items
      const v = first?.url || first?.videoUrl || first?.src
      if (!v) return null
      return {
        type:    first.type === 'image' ? 'image' : 'video',
        url:     v,
        thumb:   first.thumbnail || first.thumb || null,
        title:   d.caption || d.title || 'Instagram Post',
        author:  d.username || d.author || 'Unknown',
        likes:   d.likes || 0,
        items:   Array.isArray(items) ? items.map(i => ({ url: i.url || i.src, type: i.type })) : []
      }
    }
  },
  {
    name: 'saveig',
    fetch: async (url) => {
      const r = await fetch(`https://saveig.app/api/ajaxSearch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: url, t: 'media', lang: 'en' }),
        timeout: 12000
      })
      const d = await r.json()
      const items = d?.data || []
      const vItem = items.find(i => i.type === 'video' || i.url?.includes('.mp4')) || items[0]
      if (!vItem?.url) return null
      return {
        type:   vItem.type || 'video',
        url:    vItem.url,
        thumb:  vItem.thumbnail || null,
        title:  'Instagram Post',
        author: 'Unknown',
        likes:  0,
        items:  items.map(i => ({ url: i.url, type: i.type }))
      }
    }
  },
  {
    name: 'rapidapi-instagram',
    fetch: async (url) => {
      const r = await fetch(`https://instagram-downloader-download-instagram-videos-stories.p.rapidapi.com/index?url=${encodeURIComponent(url)}`, {
        headers: {
          'x-rapidapi-host': 'instagram-downloader-download-instagram-videos-stories.p.rapidapi.com',
          'x-rapidapi-key': 'SIGN-UP-FOR-KEY'
        },
        timeout: 12000
      })
      const d = await r.json()
      const v = d?.url || d?.media || d?.video
      if (!v || v === 'SIGN-UP-FOR-KEY') return null
      return {
        type:   'video',
        url:    v,
        thumb:  d.thumbnail || null,
        title:  d.title || 'Instagram Post',
        author: d.username || 'Unknown',
        likes:  0,
        items:  []
      }
    }
  },
  {
    name: 'igram',
    fetch: async (url) => {
      const r = await fetch(`https://igram.world/api/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const items = d?.items || d?.data || []
      const first = Array.isArray(items) ? items[0] : null
      const v = first?.url || d?.url
      if (!v) return null
      return {
        type:   first?.type || 'video',
        url:    v,
        thumb:  first?.thumbnail || null,
        title:  d.caption || 'Instagram Post',
        author: d.owner?.username || 'Unknown',
        likes:  d.like_count || 0,
        items:  Array.isArray(items) ? items.map(i => ({ url: i.url, type: i.type })) : []
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
      const matches = [...text.matchAll(/href="(https:\/\/[^"]+\.(mp4|jpg)[^"]*?)"/g)]
      if (!matches.length) return null
      const v = matches.find(m => m[0].includes('.mp4')) || matches[0]
      return {
        type:   v[2] === 'mp4' ? 'video' : 'image',
        url:    v[1],
        thumb:  null,
        title:  'Instagram Post',
        author: 'Unknown',
        likes:  0,
        items:  matches.map(m => ({ url: m[1], type: m[2] === 'mp4' ? 'video' : 'image' }))
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
      const v = d?.url || d?.video || d?.data?.url
      if (!v) return null
      return {
        type:   'video',
        url:    v,
        thumb:  d.thumbnail || null,
        title:  d.title || 'Instagram Post',
        author: d.username || 'Unknown',
        likes:  0,
        items:  []
      }
    }
  },
  {
    name: 'instavideosave',
    fetch: async (url) => {
      const r = await fetch(`https://instavideosave.net/api?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const v = d?.url || d?.video || d?.data
      if (!v) return null
      return {
        type:   'video',
        url:    v,
        thumb:  null,
        title:  d.title || 'Instagram Post',
        author: 'Unknown',
        likes:  0,
        items:  []
      }
    }
  },
  {
    name: 'inflact',
    fetch: async (url) => {
      const r = await fetch(`https://inflact.com/downloader/instagram/api/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ link: url }),
        timeout: 12000
      })
      const d = await r.json()
      const items = d?.data?.items || []
      const first = items[0]
      const v = first?.url
      if (!v) return null
      return {
        type:   first.type === 'GraphImage' ? 'image' : 'video',
        url:    v,
        thumb:  first.thumbnail || null,
        title:  d.data?.caption || 'Instagram Post',
        author: d.data?.owner?.username || 'Unknown',
        likes:  d.data?.likes || 0,
        items:  items.map(i => ({ url: i.url, type: i.type?.includes('Image') ? 'image' : 'video' }))
      }
    }
  },
  {
    name: 'igdownloader',
    fetch: async (url) => {
      const r = await fetch(`https://igdownloader.app/api/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const v = d?.url || d?.video || d?.data?.url
      if (!v) return null
      return {
        type:   'video',
        url:    v,
        thumb:  d.thumbnail || null,
        title:  d.caption || 'Instagram Post',
        author: d.username || 'Unknown',
        likes:  0,
        items:  []
      }
    }
  },
  {
    name: 'instadown',
    fetch: async (url) => {
      const r = await fetch(`https://instadown.app/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const v = d?.url || d?.media
      if (!v) return null
      return {
        type:   'video',
        url:    v,
        thumb:  null,
        title:  'Instagram Post',
        author: 'Unknown',
        likes:  0,
        items:  []
      }
    }
  },
  {
    name: 'downloadgram',
    fetch: async (url) => {
      const r = await fetch(`https://downloadgram.net/wp-json/aio-dl/video-data/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const medias = d?.medias || []
      const v = medias.find(m => m.quality?.includes('mp4') || m.url?.includes('.mp4')) || medias[0]
      if (!v?.url) return null
      return {
        type:   v.url.includes('.mp4') ? 'video' : 'image',
        url:    v.url,
        thumb:  d.thumbnail || null,
        title:  d.title || 'Instagram Post',
        author: 'Unknown',
        likes:  0,
        items:  medias.map(m => ({ url: m.url, type: m.url?.includes('.mp4') ? 'video' : 'image' }))
      }
    }
  },
  {
    name: 'storiesig',
    fetch: async (url) => {
      const r = await fetch(`https://storiesig.info/api/downloader`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: 12000
      })
      const d = await r.json()
      const v = d?.video || d?.url
      if (!v) return null
      return {
        type:   'video',
        url:    v,
        thumb:  d.thumbnail || null,
        title:  d.title || 'Instagram Story',
        author: d.username || 'Unknown',
        likes:  0,
        items:  []
      }
    }
  },
  {
    name: 'saveinsta',
    fetch: async (url) => {
      const r = await fetch(`https://saveinsta.app/api/ajaxSearch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ q: url, lang: 'en' }),
        timeout: 12000
      })
      const d = await r.json()
      const items = d?.data || []
      const v = items.find(i => i.url?.includes('.mp4')) || items[0]
      if (!v?.url) return null
      return {
        type:   v.url?.includes('.mp4') ? 'video' : 'image',
        url:    v.url,
        thumb:  v.thumbnail || null,
        title:  d.title || 'Instagram Post',
        author: d.username || 'Unknown',
        likes:  0,
        items:  items.map(i => ({ url: i.url, type: i.url?.includes('.mp4') ? 'video' : 'image' }))
      }
    }
  },
  {
    name: 'reelsaver',
    fetch: async (url) => {
      const r = await fetch(`https://reelsaver.net/api/?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const v = d?.url || d?.video || d?.data
      if (!v) return null
      return {
        type:   'video',
        url:    v,
        thumb:  null,
        title:  'Instagram Reel',
        author: 'Unknown',
        likes:  0,
        items:  []
      }
    }
  },
  {
    name: 'igsave',
    fetch: async (url) => {
      const r = await fetch(`https://igsave.net/api?url=${encodeURIComponent(url)}`, { timeout: 12000 })
      const d = await r.json()
      const v = d?.url || d?.video || d?.media
      if (!v) return null
      return {
        type:   'video',
        url:    v,
        thumb:  null,
        title:  'Instagram Post',
        author: d?.username || 'Unknown',
        likes:  0,
        items:  []
      }
    }
  }
]

// ─────────────────────────────────────────────
// NEVER-FAIL ENGINE
// ─────────────────────────────────────────────
async function downloadIG(url) {
  for (const api of IG_APIS) {
    try {
      const result = await api.fetch(url)
      if (result?.url) {
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
  name: 'instagram',
  alias: ['ig', 'igdl', 'insta', 'reel'],
  desc: 'Instagram downloader — reels, posts, carousels, stories',
  usage: '<url> [image|video|all]',
  category: 'Download',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from   = m.key.remoteJid
    const prefix = await db.get('prefix') || '#'

    const quoted   = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedTx = quoted?.conversation || quoted?.extendedTextMessage?.text || ''
    const url      = args.find(a => a.includes('instagram.com')) || quotedTx

    const wantAll   = args.includes('all')
    const wantImg   = args.includes('image') || args.includes('photo')

    if (!url) {
      const help =
        `*Instagram Downloader*\n\n` +
        `Supports: Reels, Posts, Carousels, Stories\n\n` +
        `Usage:\n` +
        `  ${prefix}ig <url>         — Video/Reel\n` +
        `  ${prefix}ig <url> image   — Photo/Image\n` +
        `  ${prefix}ig <url> all     — All carousel items\n` +
        `  Reply a link + ${prefix}ig\n\n` +
        `Alias: instagram, igdl, insta, reel`
      return await sock.sendMessage(from, {
        text: nobox ? help : await box.info(help)
      }, { quoted: m })
    }

    if (!url.includes('instagram.com')) {
      return await sock.sendMessage(from, {
        text: nobox ? '❌ Invalid Instagram URL' : await box.error('Invalid Instagram URL')
      }, { quoted: m })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    const result = await downloadIG(url)

    if (!result) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: nobox ? '❌ All 15 APIs failed. Try another link.' : await box.error('All 15 APIs failed. Try another link.')
      }, { quoted: m })
    }

    const caption =
      `╔═━━━━━━━━━━━━━━━━═❒\n` +
      `║  INSTAGRAM DOWNLOADED\n` +
      `╠═━━━━━━━━━━━━━━━━═❒\n` +
      `║  📝 ${String(result.title).slice(0, 80)}\n` +
      `║  👤 ${result.author}\n` +
      `${result.likes ? `║  ❤️  ${fmtNum(result.likes)} likes\n` : ''}` +
      `${result.items?.length > 1 ? `║  🖼️  ${result.items.length} items\n` : ''}` +
      `║  📥 Downloaded\n` +
      `╚━━━━━━━━━━━━━━━━━═❒`

    try {
      // ── CAROUSEL / ALL ITEMS ─────────────────
      if (wantAll && result.items?.length > 1) {
        for (let i = 0; i < Math.min(result.items.length, 10); i++) {
          const item = result.items[i]
          if (!item?.url) continue
          if (item.type === 'image') {
            await sock.sendMessage(from, {
              image: { url: item.url },
              caption: i === 0 ? caption : `${i + 1}/${result.items.length}`
            }, { quoted: i === 0 ? m : undefined })
          } else {
            await sock.sendMessage(from, {
              video: { url: item.url },
              caption: i === 0 ? caption : `${i + 1}/${result.items.length}`
            }, { quoted: i === 0 ? m : undefined })
          }
        }
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
        return
      }

      // ── IMAGE ────────────────────────────────
      if (result.type === 'image' || wantImg) {
        await sock.sendMessage(from, {
          image: { url: result.url },
          caption
        }, { quoted: m })
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
        return
      }

      // ── VIDEO / REEL ─────────────────────────
      await sock.sendMessage(from, {
        video: { url: result.url },
        caption
      }, { quoted: m })

      // Hint if carousel has more
      if (result.items?.length > 1) {
        await sock.sendMessage(from, {
          text: `💡 This post has ${result.items.length} items. Use: ${prefix}ig ${url} all`
        })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (sendErr) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Send failed: ${sendErr.message}`
          : await box.error(`Send failed: ${sendErr.message}`)
      }, { quoted: m })
    }
  }
}
