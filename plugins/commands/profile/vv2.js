/**
 * SwiftBot - plugins/commands/utility/vv2.js
 * ViewOnce Revealer — Sends PRIVATELY to sender's DM only
 * Group: reveals to DM of command sender, group sees nothing
 * Supports: image, video, audio — shows caption if exists
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default {
  name: 'vv2',
  alias: ['vvprivate', 'vvdm', 'vop', 'revealme'],
  desc: 'Reveal view-once media privately to your DM',
  usage: 'Reply a view-once message with #vv2',
  category: 'profile',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox, logger }) => {
    const from    = m.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const prefix  = await db.get('prefix') || '#'

    // ─── SENDER DM JID ───────────────────────
    const senderJid = (isGroup ? m.key.participant : from) || from
    const dmJid     = senderJid.includes('@') ? senderJid : `${senderJid}@s.whatsapp.net`

    // ─── GET QUOTED MESSAGE ──────────────────
    const ctx    = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage

    if (!quoted) {
      return await sock.sendMessage(from, {
        text: nobox
          ? `Reply a view-once message with ${prefix}vv2`
          : await box.error(`Reply a view-once message with ${prefix}vv2`)
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

    // ─── REACT IN ORIGINAL CHAT ──────────────
    await sock.sendMessage(from, { react: { text: '📩', key: m.key } })

    const stanzaId    = ctx?.stanzaId
    const participant = ctx?.participant || from
    const sourceLabel = isGroup ? 'Group' : 'DM'

    // ─── BUILD PROPER MESSAGE OBJECT ─────────
    // downloadMediaMessage needs the message structured correctly
    // We reconstruct a fake full message from quoted context
    const fakeMsg = {
      key: {
        remoteJid: participant,
        id:        stanzaId,
        fromMe:    false
      },
      message: voMsg
    }

    try {

      // ─── IMAGE ──────────────────────────────
      if (imageMsg) {
        const caption     = imageMsg.caption || ''
        const captionLine = caption ? `\n║  📝 _${caption}_` : ''
        const dmCaption =
          `╔═━━━━━━━━━━━━━━━━═❒\n` +
          `║  🔓  VIEW ONCE UNLOCKED\n` +
          `║  🖼️   Image  •  Private\n` +
          `╠═━━━━━━━━━━━━━━━━═❒\n` +
          `║  📍 Source: ${sourceLabel}${captionLine}\n` +
          `╚━━━━━━━━━━━━━━━━━═❒`

        let buffer
        try {
          buffer = await downloadMediaMessage(
            fakeMsg, 'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          )
        } catch {
          // Second attempt: wrap inside viewOnceMessage
          buffer = await downloadMediaMessage(
            { key: fakeMsg.key, message: { viewOnceMessage: { message: voMsg } } },
            'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          )
        }

        await sock.sendMessage(dmJid, { image: buffer, caption: dmCaption })

        return await sock.sendMessage(from, {
          text: nobox
            ? '✅ Sent to your DM privately 📩'
            : `╔═━━━━━━━━━━━━━━━━═❒\n║  ✅ Sent to your DM\n║  📩 Check your private chat\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      // ─── VIDEO ──────────────────────────────
      if (videoMsg) {
        const caption     = videoMsg.caption || ''
        const captionLine = caption ? `\n║  📝 _${caption}_` : ''
        const dmCaption =
          `╔═━━━━━━━━━━━━━━━━═❒\n` +
          `║  🔓  VIEW ONCE UNLOCKED\n` +
          `║  🎬  Video  •  Private\n` +
          `╠═━━━━━━━━━━━━━━━━═❒\n` +
          `║  📍 Source: ${sourceLabel}${captionLine}\n` +
          `╚━━━━━━━━━━━━━━━━━═❒`

        let buffer
        try {
          buffer = await downloadMediaMessage(
            fakeMsg, 'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          )
        } catch {
          buffer = await downloadMediaMessage(
            { key: fakeMsg.key, message: { viewOnceMessage: { message: voMsg } } },
            'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          )
        }

        await sock.sendMessage(dmJid, { video: buffer, caption: dmCaption })

        return await sock.sendMessage(from, {
          text: nobox
            ? '✅ Sent to your DM privately 📩'
            : `╔═━━━━━━━━━━━━━━━━═❒\n║  ✅ Sent to your DM\n║  📩 Check your private chat\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      // ─── AUDIO ──────────────────────────────
      if (audioMsg) {
        const isPtt = audioMsg.ptt || false

        let buffer
        try {
          buffer = await downloadMediaMessage(
            fakeMsg, 'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          )
        } catch {
          buffer = await downloadMediaMessage(
            { key: fakeMsg.key, message: { viewOnceMessage: { message: voMsg } } },
            'buffer', {},
            { logger: console, reuploadRequest: sock.updateMediaMessage }
          )
        }

        await sock.sendMessage(dmJid, {
          audio:    buffer,
          mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
          ptt:      false
        })

        await sock.sendMessage(dmJid, {
          text:
            `╔═━━━━━━━━━━━━━━━━═❒\n` +
            `║  🔓  VIEW ONCE UNLOCKED\n` +
            `║  🎵  ${isPtt ? 'Voice Note' : 'Audio'}  •  Private\n` +
            `╠═━━━━━━━━━━━━━━━━═❒\n` +
            `║  📍 Source: ${sourceLabel}\n` +
            `╚━━━━━━━━━━━━━━━━━═❒`
        })

        return await sock.sendMessage(from, {
          text: nobox
            ? '✅ Sent to your DM privately 📩'
            : `╔═━━━━━━━━━━━━━━━━═❒\n║  ✅ Sent to your DM\n║  📩 Check your private chat\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

    } catch (e) {
      logger.error?.('VV2', 'Private reveal failed', e.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Failed to send to DM: ${e.message}\n\nChat the bot privately first.`
          : await box.error(`Failed to send to your DM: ${e.message}\n\nChat the bot privately first.`)
      }, { quoted: m })
    }
  }
}
