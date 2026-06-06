/**
 * SwiftBot - plugins/commands/download/facebook.js
 * Facebook Downloader - 15 Online APIs
 * Video / Reel Downloader
 * English only - vs Bot
 */

import fetch from 'node-fetch'
import axios from 'axios'

const FACEBOOK_APIS = [
  { url: 'https://api.fdownloader.app/api', type: 'fdownloader' },
  { url: 'https://api.getmyfb.com/api', type: 'getmyfb' },
  { url: 'https://api.fbdownloader.app/api', type: 'fbdownloader' },
  { url: 'https://api.savefb.app/api/ajaxSearch', type: 'savefb' },
  { url: 'https://api.snapsave.app/api', type: 'snapsave' },
  { url: 'https://api.fsave.io/api', type: 'fsave' },
  { url: 'https://api.fbvideo.app/api', type: 'fbvideo' },
  { url: 'https://api.downvideo.net/api', type: 'downvideo' },
  { url: 'https://api.socialmate.app/api', type: 'socialmate' },
  { url: 'https://api.fastdl.app/api/convert', type: 'fastdl' },
  { url: 'https://api.fdownload.net/api', type: 'fdownload' },
  { url: 'https://api.fbvideodown.com/api', type: 'fbvideodown' },
  { url: 'https://api.reeldownloader.net/api', type: 'reeldown' },
  { url: 'https://api.fbdown.me/api', type: 'fbdown' },
  { url: 'https://api.sssfacebook.com/api/convert', type: 'sssfacebook' }
]

async function downloadFacebook(url, api) {
  try {
    let apiUrl = ''
    let options = { method: 'GET' }

    if (
      api.type === 'savefb' ||
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
    let title = 'Facebook Video'
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
  name: 'facebook',
  alias: ['fb', 'fbdl', 'facebookdl', 'fbvideo'],
  desc: 'Facebook downloader - 15 fallbacks',
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
║ ${prefix}facebook https://facebook.com/...
║ Reply link ${prefix}facebook
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (
      !url.includes('facebook.com') &&
      !url.includes('fb.watch')
    ) {
      return await sock.sendMessage(from, {
        text:
`╔═━━━━━━━━━━━━━━━━═❒
║ Invalid Facebook URL
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let result = null

      // Try all 15 APIs
      for (const api of FACEBOOK_APIS) {
        result = await downloadFacebook(url, api)

        if (result && result.videoUrl) break
      }

      if (!result) throw new Error('DOWNLOAD_FAILED')

      await sock.sendMessage(from, {
        video: { url: result.videoUrl },
        caption:
`╔═━━━━━━━━━━━━━━━━═❒
║ *FACEBOOK DOWNLOADED*
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