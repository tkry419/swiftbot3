/**
 * SwiftBot - plugins/commands/download/yt.js
 * YouTube video/audio downloader
 */

export default {
  name: 'yt',
  alias: ['youtube', 'yta', 'ytv'],
  desc: 'Download YouTube video or audio',
  usage: '<url> [audio/video]',
  category: 'download',
  permission: 'all',

  execute: async (sock, m, args, { db, box, fonts, logger }) => {
    const from = m.key.remoteJid
    const url = args[0]
    const type = args[1] || 'video' // default video

    if (!url ||!url.includes('youtu')) {
      const msg = await box.error(`Usage: ${fonts.mono(await db.get('prefix') + 'yt <url> [audio/video]')}`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    try {
      // Using free API — replace with your own if needed
      const apiUrl = `https://api.cobalt.tools/api/json`
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          url: url,
          vQuality: '720',
          isAudioOnly: type === 'audio'
        })
      })

      const data = await res.json()

      if (data.status!== 'stream' ||!data.url) {
        throw new Error(data.text || 'Failed to get download link')
      }

      const caption = await box.info(
        'YouTube Download',
        `Type: ${fonts.bold(type.toUpperCase())}\n` +
        `Quality: ${fonts.mono('720p')}\n\n` +
        `${fonts.smallCaps('Downloading...')}`
      )

      await sock.sendMessage(from, { text: caption }, { quoted: m })

      // Send media
      if (type === 'audio') {
        await sock.sendMessage(from, {
          audio: { url: data.url },
          mimetype: 'audio/mpeg',
          fileName: `youtube.mp3`
        }, { quoted: m })
      } else {
        await sock.sendMessage(from, {
          video: { url: data.url },
          mimetype: 'video/mp4',
          fileName: `youtube.mp4`,
          caption: fonts.smallCaps('Downloaded by SwiftBot')
        }, { quoted: m })
      }

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      logger.error('YT', 'Download failed', e.message)
      const msg = await box.error(`Download failed: ${e.message}`)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
    }
  }
}