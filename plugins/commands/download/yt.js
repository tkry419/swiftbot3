/**
 * SwiftBot - plugins/commands/download/yt.js
 * YouTube video/audio downloader with fallbacks
 * Uses cobalt -> ytdl-core -> play-dl
 */

import ytdl from '@distube/ytdl-core'
import play from 'play-dl'

export default {
  name: 'yt',
  alias: ['youtube', 'yta', 'ytv'],
  desc: 'Download YouTube video or audio',
  usage: '<url/search> [audio/video]',
  category: 'download',
  permission: 'all',

  execute: async (sock, m, args, { db, box, fonts, logger, nobox }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')
    const type = args[args.length - 1]?.toLowerCase()
    const isAudio = type === 'audio' || type === 'mp3' || type === 'yta'
    const format = isAudio? 'audio' : 'video'

    if (!query) {
      const prefix = await db.get('prefix')
      const msg = nobox
       ? `Usage: ${prefix}yt <url/search> [audio/video]\nExample: ${prefix}yt never gonna give you up audio`
        : await box.error(`Usage: ${fonts.mono(prefix + 'yt <url/search> [audio/video]')}\nExample: ${fonts.mono(prefix + 'yt never gonna give you up audio')}`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    let videoUrl = query
    let videoInfo = null

    try {
      // STEP 1: Get video info + URL if search term
      if (!ytdl.validateURL(query)) {
        logger.cmd('YT', 'Searching YouTube', query)
        const search = await play.search(query, { limit: 1 })
        if (!search.length) throw new Error('No results found')
        videoInfo = search[0]
        videoUrl = videoInfo.url
      } else {
        videoInfo = await play.video_info(videoUrl)
        videoInfo = videoInfo.video_details
      }

      const { title, durationRaw, thumbnails, channel } = videoInfo
      const thumb = thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url

      // STEP 2: Try Cobalt API first - fastest
      let downloadUrl = null
      try {
        const res = await fetch('https://api.cobalt.tools/api/json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({
            url: videoUrl,
            vQuality: '720',
            isAudioOnly: isAudio
          }),
          timeout: 15000
        })
        const data = await res.json()
        if (data.status === 'stream' && data.url) downloadUrl = data.url
      } catch (e) {
        logger.warn('YT', 'Cobalt failed, trying ytdl-core')
      }

      // STEP 3: Fallback to ytdl-core
      if (!downloadUrl) {
        try {
          const info = await ytdl.getInfo(videoUrl)
          if (isAudio) {
            const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' })
            downloadUrl = format?.url
          } else {
            const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'videoandaudio' })
            downloadUrl = format?.url
          }
        } catch (e) {
          logger.warn('YT', 'ytdl-core failed, trying play-dl')
        }
      }

      // STEP 4: Fallback to play-dl
      if (!downloadUrl) {
        const stream = await play.stream(videoUrl, {
          quality: isAudio? 2 : 1
        })
        downloadUrl = stream.url
      }

      if (!downloadUrl) throw new Error('All download methods failed')

      // STEP 5: Send info box with thumbnail
      const infoBox = nobox
       ? `📥 ${title}\n\nChannel: ${channel?.name || 'Unknown'}\nDuration: ${durationRaw || 'N/A'}\nType: ${format.toUpperCase()}\n\nDownloading...`
        : await box.info(
            'YouTube Download',
            `${fonts.bold(title)}\n\n` +
            `Channel: ${fonts.sans(channel?.name || 'Unknown')}\n` +
            `Duration: ${fonts.mono(durationRaw || 'N/A')}\n` +
            `Type: ${fonts.bold(format.toUpperCase())}\n` +
            `Quality: ${fonts.mono(isAudio? '128kbps' : '720p')}\n\n` +
            `${fonts.smallCaps('Downloading...')}`
          )

      await sock.sendMessage(from, {
        image: { url: thumb },
        caption: infoBox
      }, { quoted: m })

      // STEP 6: Send media
      if (isAudio) {
        await sock.sendMessage(from, {
          audio: { url: downloadUrl },
          mimetype: 'audio/mpeg',
          fileName: `${title.substring(0, 50)}.mp3`
        }, { quoted: m })
      } else {
        await sock.sendMessage(from, {
          video: { url: downloadUrl },
          mimetype: 'video/mp4',
          fileName: `${title.substring(0, 50)}.mp4`,
          caption: nobox? 'Downloaded by SwiftBot' : fonts.smallCaps('Downloaded by SwiftBot')
        }, { quoted: m })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      logger.error('YT', 'Download failed', e.message)
      const msg = nobox
       ? `Download failed: ${e.message}`
        : await box.error(`Download failed: ${e.message}`)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
    }
  }
}