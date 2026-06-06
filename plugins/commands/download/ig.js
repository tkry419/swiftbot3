/**
 * SwiftBot - plugins/commands/download/instagram.js
 * Instagram Downloader - 15 Online APIs
 * Reels / Video / Post Downloader
 * English only - vs Bot
 */

import fetch from 'node-fetch'
import axios from 'axios'

const INSTAGRAM_APIS = [
  { url: 'https://api.igdownloader.app/api', type: 'igdownloader' },
  { url: 'https://api.instadownloader.co/api', type: 'instadl' },
  { url: 'https://api.saveinsta.app/api/ajaxSearch', type: 'saveinsta' },
  { url: 'https://api.snapinsta.app/api', type: 'snapinsta' },
  { url: 'https://api.fastdl.app/api/convert', type: 'fastdl' },
  { url: 'https://api.igram.world/api', type: 'igram' },
  { url: 'https://api.instafinsta.com/api', type: 'instafinsta' },
  { url: 'https://api.reeldownloader.net/api', type: 'reeldown' },
  { url: 'https://api.socialmate.app/api', type: 'socialmate' },
  { url: 'https://api.igvideo.app/api', type: 'igvideo' },
  { url: 'https://api.instasave.website/api', type: 'instasave' },
  { url: 'https://api.igdown.app/api', type: 'igdown' },
  { url: 'https://api.storysaver.net/api', type: 'storysaver' },
  { url: 'https://api.instadp.io/api', type: 'instadp' },
  { url: 'https://api.sssinstagram.com/api/convert', type: 'sssinstagram' }
]

async function downloadInstagram(url, api) {
  try {
    let apiUrl = ''
    let options = { method: 'GET' }

    if (
      api.type === 'saveinsta' ||
      api.type === 'fastdl'
    ) {
      apiUrl = api.url

      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }
    } else {
      apiUrl = `${api.url}?url=${encodeURIComponent(url)}`
    }

    const res = await fetch(apiUrl, options)

    if (!res.ok) return null

    const data = await res.json()

    // Parse responses
    let videoUrl = null
    let title = 'Instagram Video'
    let author = 'Unknown'

    if (data.data?.video) videoUrl = data.data.video
    else if (data.data?.url) videoUrl = data.data.url
    else if (data.video) videoUrl = data.video
    else if (data.url) videoUrl = data.url
    else if (data.result?.url) videoUrl = data.result.url
    else if (data.result?.video) videoUrl = data.result.video
    else if (data.downloadUrl) videoUrl = data.downloadUrl
    else if (data.link) videoUrl = data.link
    else if (Array.isArray(data.data) && data.data[0]?.url) {
      videoUrl = data.data[0].url
    }

    if (data.data?.title) title = data.data.title
    else if (data.title) title = data.title
    else if (data.caption) title = data.caption

    if (data.data?.author) author = data.data.author
    else if (data.author) author = data.author
    else if (data.username) author = data.username

    if (!videoUrl) return null

    return { videoUrl, title, author }
  } catch {
    return null
  }
}

export default {
  name: 'instagram',
  alias: ['ig', 'igdl', 'insta', 'instagramdl'],
  desc: 'Instagram downloader - 15 fallbacks',
  usage: 'url or reply link',
  category: 'Download',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage

    const quotedText =
      quoted?.conversation ||
      quoted?.extendedTextMessage?.text ||
      ''

    let url = args[0] || quotedText

    if (!url) {
      return await sock.sendMessage(from, {
        text:
`╔═━━━━━━━━━━━━━━━━═❒
║ Usage:
║ ${prefix}instagram https://instagram.com/reel/...
║ Reply link ${prefix}instagram
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (
      !url.includes('instagram.com') &&
      !url.includes('instagr.am')
    ) {
      return await sock.sendMessage(from, {
        text:
`╔═━━━━━━━━━━━━━━━━═❒
║ Invalid Instagram URL
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let result = null

      // Try all 15 APIs
      for (const api of INSTAGRAM_APIS) {
        result = await downloadInstagram(url, api)

        if (result && result.videoUrl) break
      }

      if (!result) throw new Error('DOWNLOAD_FAILED')

      await sock.sendMessage(from, {
        video: { url: result.videoUrl },
        caption:
`╔═━━━━━━━━━━━━━━━━═❒
║ *INSTAGRAM DOWNLOADED*
╚━━━━━━━━━━━━━━━━━═❒

📝 Title: ${result.title.slice(0, 100)}
👤 Author: ${result.author}
✅ HD Download`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text:
`╔═━━━━━━━━━━━━━━━━═❒
║ Download failed
║ Try another link
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}