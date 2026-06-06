/**
 * SwiftBot - plugins/commands/utility/vv2.js
 * ViewOnce Revealer — Sends PRIVATELY to sender's DM only
 * Works in groups: reveals to DM of the person who sent #vv2
 * Original chat is untouched — no media sent there
 * Supports: image, video, audio — shows caption if exists
 */

export default {
  name: 'vv2',
  alias: ['vvprivate', 'vvdm', 'vop', 'revealme'],
  desc: 'Reveal view-once media privately to your DM',
  usage: 'Reply a view-once message with #vv2',
  category: 'Profile',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox, logger }) => {
    const from    = m.key.remoteJid
    const isGroup = from.endsWith('@g.us')
    const prefix  = await db.get('prefix') || '#'

    // ─── WHO SENT THE COMMAND ────────────────
    // In group: m.key.participant is the real sender
    // In DM: m.key.remoteJid is the sender
    const senderJid = (isGroup ? m.key.participant : from) || from
    // DM JID — always the bare number@s.whatsapp.net
    const dmJid = senderJid.includes('@') ? senderJid : `${senderJid}@s.whatsapp.net`

    // ─── GET QUOTED MESSAGE ──────────────────
    const ctx    = m.message?.extendedTextMessage?.contextInfo
    const quoted = ctx?.quotedMessage

    if (!quoted) {
      // Reply in same chat (no private message needed for error)
      return await sock.sendMessage(from, {
        text: nobox
          ? `Reply a view-once message with ${prefix}vv2`
          : await box.error(`Reply a view-once message with ${prefix}vv2`)
      }, { quoted: m })
    }

    // ─── DETECT VIEW-ONCE TYPE ───────────────
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

    // ─── ACK IN GROUP / ORIGINAL CHAT ───────
    // Only send a small ✅ reaction in the original chat — NO media here
    await sock.sendMessage(from, {
      react: { text: '📩', key: m.key }
    })

    const stanzaId    = ctx?.stanzaId
    const participant = ctx?.participant || from

    const forwardKey = {
      remoteJid: participant,
      id:        stanzaId,
      fromMe:    false
    }

    // ─── HEADER FOR DM ──────────────────────
    const sourceLabel = isGroup ? `from group` : `from DM`

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

        const sent = await sock.sendMessage(dmJid, {
          image:   { url: `https://mmg.whatsapp.net${imageMsg.url}` },
          caption: dmCaption,
          mimetype: imageMsg.mimetype || 'image/jpeg'
        }).catch(async () => {
          // Fallback: download buffer
          const buffer = await sock.downloadMediaMessage({
            key: forwardKey,
            message: { imageMessage: imageMsg }
          })
          return await sock.sendMessage(dmJid, {
            image:   buffer,
            caption: dmCaption
          })
        })

        if (sent) {
          // Confirm in original chat
          await sock.sendMessage(from, {
            text: nobox
              ? '✅ Sent to your DM privately 📩'
              : `╔═━━━━━━━━━━━━━━━━═❒\n║  ✅ Sent to your DM\n║  📩 Check your private chat\n╚━━━━━━━━━━━━━━━━━═❒`,
            react: { text: '✅', key: m.key }
          }, { quoted: m })
        }
        return
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

        const sent = await sock.sendMessage(dmJid, {
          video:   { url: `https://mmg.whatsapp.net${videoMsg.url}` },
          caption: dmCaption,
          mimetype: videoMsg.mimetype || 'video/mp4'
        }).catch(async () => {
          const buffer = await sock.downloadMediaMessage({
            key: forwardKey,
            message: { videoMessage: videoMsg }
          })
          return await sock.sendMessage(dmJid, {
            video:   buffer,
            caption: dmCaption
          })
        })

        if (sent) {
          await sock.sendMessage(from, {
            text: nobox
              ? '✅ Sent to your DM privately 📩'
              : `╔═━━━━━━━━━━━━━━━━═❒\n║  ✅ Sent to your DM\n║  📩 Check your private chat\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        }
        return
      }

      // ─── AUDIO ──────────────────────────────
      if (audioMsg) {
        const isPtt = audioMsg.ptt || false

        const sent = await sock.sendMessage(dmJid, {
          audio:    { url: `https://mmg.whatsapp.net${audioMsg.url}` },
          mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
          ptt:      false
        }).catch(async () => {
          const buffer = await sock.downloadMediaMessage({
            key: forwardKey,
            message: { audioMessage: audioMsg }
          })
          return await sock.sendMessage(dmJid, {
            audio:    buffer,
            mimetype: audioMsg.mimetype || 'audio/ogg; codecs=opus',
            ptt:      false
          })
        })

        // Label message separately in DM (audio has no caption)
        await sock.sendMessage(dmJid, {
          text:
            `╔═━━━━━━━━━━━━━━━━═❒\n` +
            `║  🔓  VIEW ONCE UNLOCKED\n` +
            `║  🎵  ${isPtt ? 'Voice Note' : 'Audio'}  •  Private\n` +
            `╠═━━━━━━━━━━━━━━━━═❒\n` +
            `║  📍 Source: ${sourceLabel}\n` +
            `╚━━━━━━━━━━━━━━━━━═❒`
        })

        if (sent) {
          await sock.sendMessage(from, {
            text: nobox
              ? '✅ Sent to your DM privately 📩'
              : `╔═━━━━━━━━━━━━━━━━═❒\n║  ✅ Sent to your DM\n║  📩 Check your private chat\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        }
        return
      }

    } catch (e) {
      logger.error?.('VV2', 'Private reveal failed', e.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Failed to send DM: ${e.message}\n\nMake sure you have chatted with the bot before.`
          : await box.error(`Failed to send to your DM: ${e.message}\n\nChat the bot privately first.`)
      }, { quoted: m })
    }
  }
}
