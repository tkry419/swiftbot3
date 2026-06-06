/**
 * SwiftBot - plugins/commands/tools/toimg.js
 * Convert Sticker to Image - vs Bot
 */

export default {
  name: 'toimg',
  alias: ['toimage', 'topng'],
  desc: 'Convert sticker to image',
  usage: 'reply sticker',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const sticker = quoted?.stickerMessage

    if (!sticker) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Reply a sticker\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const buffer = await sock.downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      )

      await sock.sendMessage(from, {
        image: buffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Sticker → Image ✅\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })
    } catch {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Conversion failed\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}