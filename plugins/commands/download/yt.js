/**
 * SwiftBot - plugins/commands/download/video.js
 * YouTube Video Downloader - 40 Online APIs
 * Search + Direct URL Support
 * English only - vs Bot
 */

import fetch from 'node-fetch'
import axios from 'axios'

const VIDEO_APIS = [
  { url: 'https://api.ytmp4.app/api', type: 'ytmp4' },
  { url: 'https://api.cobalt.tools/api/json', type: 'cobalt' },
  { url: 'https://api.vevioz.com/api/button/mp4', type: 'vevioz' },
  { url: 'https://api.y2mate.is/api', type: 'y2mate' },
  { url: 'https://api.ytdownloader.app/api', type: 'ytdownloader' },
  { url: 'https://api.savefrom.fun/api', type: 'savefrom' },
  { url: 'https://api.snapsave.app/api', type: 'snapsave' },
  { url: 'https://api.fastdl.app/api/convert', type: 'fastdl' },
  { url: 'https://api.yt5s.io/api/ajaxSearch', type: 'yt5s' },
  { url: 'https://api.loader.to/api/button', type: 'loaderto' },
  { url: 'https://api.y2meta.app/api', type: 'y2meta' },
  { url: 'https://api.youtubedownloader.app/api', type: 'ytdlapp' },
  { url: 'https://api.keepvid.app/api', type: 'keepvid' },
  { url: 'https://api.clipto.com/api', type: 'clipto' },
  { url: 'https://api.socialmate.app/api', type: 'socialmate' },
  { url: 'https://api.downvideo.net/api', type: 'downvideo' },
  { url: 'https://api.ytmp3.cc/api', type: 'ytmp3cc' },
  { url: 'https://api.yt1s.com/api', type: 'yt1s' },
  { url: 'https://api.ssyoutube.com/api', type: 'ssyoutube' },
  { url: 'https://api.onlinevideoconverter.pro/api', type: 'ovc' },
  { url: 'https://api.flvto.best/api', type: 'flvto' },
  { url: 'https://api.y2down.cc/api', type: 'y2down' },
  { url: 'https://api.ytdownload.net/api', type: 'ytdownload' },
  { url: 'https://api.tubedown.app/api', type: 'tubedown' },
  { url: 'https://api.videohunter.net/api', type: 'videohunter' },
  { url: 'https://api.videodownloader.so/api', type: 'videodownloader' },
  { url: 'https://api.downloaderto.com/api', type: 'downloaderto' },
  { url: 'https://api.ytbdownload.com/api', type: 'ytbdownload' },
  { url: 'https://api.mp4upload.app/api', type: 'mp4upload' },
  { url: 'https://api.ytdl.plus/api', type: 'ytdlplus' },
  { url: 'https://api.youtubepi.com/api', type: 'youtubepi' },
  { url: 'https://api.ytvideo.download/api', type: 'ytvideodownload' },
  { url: 'https://api.y2hub.app/api', type: 'y2hub' },
  { url: 'https://api.videofk.com/api', type: 'videofk' },
  { url: 'https://api.getvideo.at/api', type: 'getvideo' },
  { url: 'https://api.tubeoffline.com/api', type: 'tubeoffline' },
  { url: 'https://api.convert2mp4.app/api', type: 'convert2mp4' },
  { url: 'https://api.ytdlp.online/api', type: 'ytdlp' },
  { url: 'https://api.youtubetomp4.sc/api', type: 'youtubetomp4' },
  { url: 'https://api.ytconverter.app/api', type: 'ytconverter' }
]

async function searchYouTube(query) {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    )

    const html = await res.text()

    const match = html.match(/"videoId":"(.*?)"/)

    if (!match || !match[1]) return null

    return `https://www.youtube.com/watch?v=${match[1]}`
  } catch {
    return null
  }
}

async function downloadVideo(url, api) {
  try {
    let apiUrl = ''
    let options = { method: 'GET' }

    if (
      api.type === 'cobalt' ||
      api.type === 'fastdl'
    ) {
      apiUrl = api.url

      options = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url
        })
      }
    } else {
      apiUrl = `${api.url}?url=${encodeURIComponent(url)}`
    }

    const res = await fetch(apiUrl, options)

    if (!res.ok) return null

    const data = await res.json()

    let videoUrl = null
    let title = 'YouTube Video'
    let author = 'Unknown'

    // Parse responses
    if (data.url) videoUrl = data.url
    else if (data.video) videoUrl = data.video
    else if (data.downloadUrl) videoUrl = data.downloadUrl
    else if (data.result?.url) videoUrl = data.result.url
    else if (data.result?.video) videoUrl = data.result.video
    else if (data.data?.url) videoUrl = data.data.url
    else if (data.data?.video) videoUrl = data.data.video
    else if (data.link) videoUrl = data.link
    else if (data.download) videoUrl = data.download
    else if (Array.isArray(data.data) && data.data[0]?.url) {
      videoUrl = data.data[0].url
    }

    if (data.title) title = data.title
    else if (data.data?.title) title = data.data.title
    else if (data.result?.title) title = data.result.title

    if (data.author) author = data.author
    else if (data.data?.author) author = data.data.author
    else if (data.result?.author) author = data.result.author

    if (!videoUrl) return null

    return {
      videoUrl,
      title,
      author
    }
  } catch {
    return null
  }
}

export default {
  name: 'video',
  alias: [
    'ytvideo',
    'ytmp4',
    'youtubevideo',
    'videodl',
    'mp4'
  ],
  desc: 'YouTube video downloader - 40 fallbacks',
  usage: 'query or youtube url',
  category: 'Download',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted =
      m.message?.extendedTextMessage?.contextInfo?.quotedMessage

    const quotedText =
      quoted?.conversation ||
      quoted?.extendedTextMessage?.text ||
      ''

    let input = args.join(' ') || quotedText

    if (!input) {
      return await sock.sendMessage(from, {
        text:
`╔═━━━━━━━━━━━━━━━━═❒
║ Usage:
║ ${prefix}video believer imagine dragons
║ ${prefix}video https://youtube.com/watch?v=...
║ Reply link ${prefix}video
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: {
        text: '⏳',
        key: m.key
      }
    })

    try {
      let url = input

      // Search if not URL
      if (
        !input.includes('youtube.com') &&
        !input.includes('youtu.be')
      ) {
        const searched = await searchYouTube(input)

        if (!searched) {
          throw new Error('SEARCH_FAILED')
        }

        url = searched
      }

      let result = null

      // Try all 40 APIs
      for (const api of VIDEO_APIS) {
        result = await downloadVideo(url, api)

        if (result && result.videoUrl) break
      }

      if (!result) {
        throw new Error('DOWNLOAD_FAILED')
      }

      await sock.sendMessage(from, {
        video: {
          url: result.videoUrl
        },
        caption:
`╔═━━━━━━━━━━━━━━━━═❒
║ *VIDEO DOWNLOADED*
╚━━━━━━━━━━━━━━━━━═❒

📝 Title: ${result.title.slice(0, 100)}
👤 Author: ${result.author}
🎬 Quality: MP4
✅ Download Complete`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: {
          text: '✅',
          key: m.key
        }
      })

    } catch {
      await sock.sendMessage(from, {
        react: {
          text: '❌',
          key: m.key
        }
      })

      await sock.sendMessage(from, {
        text:
`╔═━━━━━━━━━━━━━━━━═❒
║ Download failed
║ Try another query or link
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}