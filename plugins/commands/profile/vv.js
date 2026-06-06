/**
 * SwiftBot - plugins/commands/utility/vv.js
 * ViewOnce Revealer — Sends to same chat (profile/category)
 * Supports: image, video, audio — shows caption if exists
 */

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
    const ctx     = m.message?.extendedTextMessage?.contextInfo
    const quoted  = ctx?.quotedMessage

    if (!quoted) {
      return await sock.sendMessage(from, {
        text: nobox
          ? `Reply a view-once message with ${prefix}vv`
          : await box.error(`Reply a view-once message with ${prefix}vv`)
      }, { quoted: m })
    }

    // ─── DETECT VIEW-ONCE TYPE ───────────────
    // viewOnceMessage / viewOnceMessageV2 / viewOnceMessageV2Extension
    const voMsg =
      quoted.viewOnceMessage?.message ||
      quoted.viewOnceMessageV2?.message ||
      quoted.viewOnceMessageV2Extension?.message ||
      quoted  // fallback: direct quoted might already be unwrapped

    const imageMsg  = voMsg?.imageMessage
    const videoMsg  = voMsg?.videoMessage
    const audioMsg  = voMsg?.audioMessage

    if (!imageMsg && !videoMsg && !audioMsg) {
      return await sock.sendMessage(from, {
        text: nobox
          ? '❌ Not a view-once message. Reply a view-once image, video, or audio.'
          : await box.error('Not a view-once message. Reply a view-once image, video, or audio.')
      }, { quoted: m })
    }

    // ─── SEND TYPING ────────────────────────
    try { await sock.sendPresenceUpdate('composing', from) } catch {}

    const stanzaId   = ctx?.stanzaId
    const participant = ctx?.participant || m.key.remoteJid

    // ─── BUILD FORWARD KEY ──────────────────
    const forwardKey = {
      remoteJid: participant,
      id:        stanzaId,
      fromMe:    false
    }

    try {
      // ─── IMAGE ────────────────────────────
      if (imageMsg) {
        const caption = imageMsg.caption || ''
        const captionLine = caption ? `\n\n📝 _${caption}_` : ''

        await sock.sendMessage(from, {
          image:   { url: `https://mmg.whatsapp.net${imageMsg.url}` },
          caption: `╔═━━━━━━━━━━━━━━━━═❒\n║  👁️  VIEW ONCE REVEALED\n║  🖼️  Image${captionLine}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mimetype: imageMsg.mimetype || 'image/jpeg'
        }, { quoted: m })

        // Fallback: try downloading via sock
        .catch(async () => {
          const buffer = await sock.downloadMediaMessage({ key: forwardKey, message: { imageMessage: imageMsg } })
          await sock.sendMessage(from, {
            image:   buffer,
            caption: `╔═━━━━━━━━━━━━━━━━═❒\n║  👁️  VIEW ONCE REVEALED\n║  🖼️  Image${captionLine}\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        })

        return await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
      }

      // ─── VIDEO ────────────────────────────
      if (videoMsg) {
        const caption = videoMsg.caption || ''
        const captionLine = caption ? `\n\n📝 _${caption}_` : ''

        await sock.sendMessage(from, {
          video:   { url: `https://mmg.whatsapp.net${videoMsg.url}` },
          caption: `╔═━━━━━━━━━━━━━━━━═❒\n║  👁️  VIEW ONCE REVEALED\n║  🎬  Video${captionLine}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mimetype: videoMsg.mimetype || 'video/mp4'
        }, { quoted: m })

        .catch(async () => {
          const buffer = await sock.downloadMediaMessage({ key: forwardKey, message: { videoMessage: videoMsg } })
          await sock.sendMessage(from, {
            video:   buffer,
            caption: `╔═━━━━━━━━━━━━━━━━═❒\n║  👁️  VIEW ONCE REVEALED\n║  🎬  Video${captionLine}\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        })

        return await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
      }

      // ─── AUDIO ────────────────────────────
      if (audioMsg) {
        const isPtt = audioMsg.ptt || false

        await sock.sendMessage(from, {
          audio:    { url: `https://mmg.whatsapp.net${audioMsg.url}` },
          mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
          ptt:      false  // Always send as audio file, not voice note
        }, { quoted: m })

        .catch(async () => {
          const buffer = await sock.downloadMediaMessage({ key: forwardKey, message: { audioMessage: audioMsg } })
          await sock.sendMessage(from, {
            audio:    buffer,
            mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
            ptt:      false
          }, { quoted: m })
        })

        // Send label separately for audio (no caption support)
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║  👁️  VIEW ONCE REVEALED\n║  🎵  ${isPtt ? 'Voice Note' : 'Audio'}\n╚━━━━━━━━━━━━━━━━━═❒`
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
