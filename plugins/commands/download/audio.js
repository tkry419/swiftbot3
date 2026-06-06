/**
 * SwiftBot - plugins/commands/download/play.js
 * YouTube Music Downloader - 40 Online APIs
 * Search + Direct URL Support
 * Sends full audio song
 * English only - vs Bot
 */

import fetch from 'node-fetch'
import axios from 'axios'

const PLAY_APIS = [
  { url: 'https://api.ytmp3.app/api', type: 'ytmp3' },
  { url: 'https://api.cobalt.tools/api/json', type: 'cobalt' },
  { url: 'https://api.vevioz.com/api/button/mp3', type: 'vevioz' },
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
  { url: 'https://api.mp3download.to/api', type: 'mp3download' },
  { url: 'https://api.ytdl.plus/api', type: 'ytdlplus' },
  { url: 'https://api.youtubepi.com/api', type: 'youtubepi' },
  { url: 'https://api.ytaudio.download/api', type: 'ytaudiodownload' },
  { url: 'https://api.y2hub.app/api', type: 'y2hub' },
  { url: 'https://api.audiofk.com/api', type: 'audiofk' },
  { url: 'https://api.getaudio.at/api', type: 'getaudio' },
  { url: 'https://api.tubeoffline.com/api', type: 'tubeoffline' },
  { url: 'https://api.convert2mp3.app/api', type: 'convert2mp3' },
  { url: 'https://api.ytdlp.online/api', type: 'ytdlp' },
  { url: 'https://api.youtubetomp3.sc/api', type: 'youtubetomp3' },
  { url: 'https://api.ytconverter.app/api', type: 'ytconverter' }
]

async function searchYouTube(query) {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    )

    const html = await res.text()

    const videoIdMatch = html.match(/"videoId":"(.*?)"/)
    const titleMatch = html.match(/"title":{"runs":\[{"text":"(.*?)"/)
    const channelMatch = html.match(/"ownerText":{"runs":\[{"text":"(.*?)"/)

    if (!videoIdMatch || !videoIdMatch[1]) return null

    return {
      url: `https://www.youtube.com/watch?v=${videoIdMatch[1]}`,
      title: titleMatch?.[1] || 'YouTube Audio',
      author: channelMatch?.[1] || 'Unknown'
    }
  } catch {
    return null
  }
}

async function downloadAudio(url, api) {
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

    let audioUrl = null
    let title = 'YouTube Audio'
    let author = 'Unknown'
    let thumbnail = null

    // Parse different responses
    if (data.url) audioUrl = data.url
    else if (data.audio) audioUrl = data.audio
    else if (data.downloadUrl) audioUrl = data.downloadUrl
    else if (data.result?.url) audioUrl = data.result.url
    else if (data.result?.audio) audioUrl = data.result.audio
    else if (data.data?.url) audioUrl = data.data.url
    else if (data.data?.audio) audioUrl = data.data.audio
    else if (data.link) audioUrl = data.link
    else if (data.download) audioUrl = data.download
    else if (Array.isArray(data.data) && data.data[0]?.url) {
      audioUrl = data.data[0].url
    }

    if (data.title) title = data.title
    else if (data.data?.title) title = data.data.title
    else if (data.result?.title) title = data.result.title

    if (data.author) author = data.author
    else if (data.data?.author) author = data.data.author
    else if (data.result?.author) author = data.result.author

    if (data.thumbnail) thumbnail = data.thumbnail
    else if (data.image) thumbnail = data.image
    else if (data.data?.thumbnail) thumbnail = data.data.thumbnail

    if (!audioUrl) return null

    return {
      audioUrl,
      title,
      author,
      thumbnail
    }
  } catch {
    return null
  }
}

export default {
  name: 'play',
  alias: [
    'song',
    'music',
    'ytmp3',
    'audio',
    'playmusic'
  ],
  desc: 'Music downloader - 40 fallbacks',
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
║ ${prefix}play believer imagine dragons
║ ${prefix}play https://youtube.com/watch?v=...
║ Reply link ${prefix}play
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
      let searchData = null

      // Search if not URL
      if (
        !input.includes('youtube.com') &&
        !input.includes('youtu.be')
      ) {
        searchData = await searchYouTube(input)

        if (!searchData) {
          throw new Error('SEARCH_FAILED')
        }

        url = searchData.url
      }

      let result = null

      // Try all 40 APIs
      for (const api of PLAY_APIS) {
        result = await downloadAudio(url, api)

        if (result && result.audioUrl) break
      }

      if (!result) {
        throw new Error('DOWNLOAD_FAILED')
      }

      const title =
        result.title ||
        searchData?.title ||
        'YouTube Audio'

      const author =
        result.author ||
        searchData?.author ||
        'Unknown'

      await sock.sendMessage(from, {
        audio: {
          url: result.audioUrl
        },
        mimetype: 'audio/mpeg',
        ptt: false,
        fileName: `${title}.mp3`,
        contextInfo: {
          externalAdReply: {
            title: title.slice(0, 60),
            body: `By ${author}`,
            mediaType: 1,
            previewType: 0,
            renderLargerThumbnail: true,
            thumbnailUrl:
              result.thumbnail ||
              'https://i.imgur.com/JPw4B2x.jpeg',
            sourceUrl: url
          }
        }
      }, { quoted: m })

      await sock.sendMessage(from, {
        text:
`╔═━━━━━━━━━━━━━━━━═❒
║ *SONG DOWNLOADED*
╚━━━━━━━━━━━━━━━━━═❒

🎵 Title: ${title.slice(0, 100)}
👤 Artist: ${author}
📤 Full Song Sent
✅ MP3 Audio Complete`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: {
          text: '✅',
          key: m.key
        }
      })

    } catch (e) {
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