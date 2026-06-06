/**
 * SwiftBot - plugins/commands/utility/vv.js
 * ViewOnce Revealer — Sends to same chat
 * Supports: image, video, audio — shows caption if exists
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default {
  name: 'vv',
  alias: ['viewonce', 'vo', 'reveal'],
  desc: 'Reveal view-once media and send to this chat',
  usage: 'Reply a view-once message with #vv',
  category: 'Profile',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox, logger }) => {
    const from   = m.key.remoteJid
    const prefix = await db.get('prefix') || '#'

    // ─── GET QUOTED MESSAGE ──────────────────
    const ctx    = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage

    if (!quoted) {
      return await sock.sendMessage(from, {
        text: nobox
          ? `Reply a view-once message with ${prefix}vv`
          : await box.error(`Reply a view-once message with ${prefix}vv`)
      }, { quoted: m })
    }

    // ─── DETECT VIEW-ONCE WRAPPER ────────────
    const voMsg =
      quoted.viewOnceMessage?.message ||
      quoted.viewOnceMessageV2?.message ||
      quoted.viewOnceMessageV2Extension?.message ||
      quoted

    const imageMsg = voMsg?.imageMessage
    const videoMsg = voMsg?.videoMessage
    const audioMsg = voMsg?.audioMessage

    if (!imageMsg && !videoMsg && !audioMsg) {
      return await sock.sendMessage(from, {
        text: nobox
          ? '❌ Not a view-once message. Reply a view-once image, video, or audio.'
          : await box.error('Not a view-once message. Reply a view-once image, video, or audio.')
      }, { quoted: m })
    }

    // ─── TYPING ──────────────────────────────
    try { await sock.sendPresenceUpdate('composing', from) } catch {}

    // ─── BUILD FAKE MESSAGE FOR DOWNLOAD ─────
    // downloadMediaMessage needs a full message object
    const stanzaId    = ctx?.stanzaId
    const participant = ctx?.participant || from

    try {

      // ─── IMAGE ──────────────────────────────
      if (imageMsg) {
        const caption     = imageMsg.caption || ''
        const captionLine = caption ? `\n║  📝 _${caption}_` : ''
        const label =
          `╔═━━━━━━━━━━━━━━━━═❒\n` +
          `║  👁️  VIEW ONCE REVEALED\n` +
          `║  🖼️  Image${captionLine}\n` +
          `╚━━━━━━━━━━━━━━━━━═❒`

        const buffer = await downloadMediaMessage(
          {
            key: { remoteJid: participant, id: stanzaId, fromMe: false },
            message: voMsg
          },
          'buffer',
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        )

        await sock.sendMessage(from, {
          image:   buffer,
          caption: label
        }, { quoted: m })

        return await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
      }

      // ─── VIDEO ──────────────────────────────
      if (videoMsg) {
        const caption     = videoMsg.caption || ''
        const captionLine = caption ? `\n║  📝 _${caption}_` : ''
        const label =
          `╔═━━━━━━━━━━━━━━━━═❒\n` +
          `║  👁️  VIEW ONCE REVEALED\n` +
          `║  🎬  Video${captionLine}\n` +
          `╚━━━━━━━━━━━━━━━━━═❒`

        const buffer = await downloadMediaMessage(
          {
            key: { remoteJid: participant, id: stanzaId, fromMe: false },
            message: voMsg
          },
          'buffer',
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        )

        await sock.sendMessage(from, {
          video:   buffer,
          caption: label
        }, { quoted: m })

        return await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
      }

      // ─── AUDIO ──────────────────────────────
      if (audioMsg) {
        const isPtt = audioMsg.ptt || false

        const buffer = await downloadMediaMessage(
          {
            key: { remoteJid: participant, id: stanzaId, fromMe: false },
            message: voMsg
          },
          'buffer',
          {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        )

        await sock.sendMessage(from, {
          audio:    buffer,
          mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
          ptt:      false
        }, { quoted: m })

        await sock.sendMessage(from, {
          text:
            `╔═━━━━━━━━━━━━━━━━═❒\n` +
            `║  👁️  VIEW ONCE REVEALED\n` +
            `║  🎵  ${isPtt ? 'Voice Note' : 'Audio'}\n` +
            `╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })

        return await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
      }

    } catch (e) {
      logger.error?.('VV', 'Reveal failed', e.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Failed to reveal: ${e.message}`
          : await box.error(`Failed to reveal: ${e.message}`)
      }, { quoted: m })
    }
  }
}
