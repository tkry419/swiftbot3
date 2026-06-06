/**
 * SwiftBot - plugins/commands/profile/vv.js
 * View Once Remover - vs Bot
 * Simple instant resend
 * Supports image, video, audio, sticker, document
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'vv',
  alias: [
    'viewonce',
    'readviewonce',
    'antiviewonce',
    'vo'
  ],
  desc: 'Open any view once message',
  usage: 'reply view once message',
  category: 'Profile',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const prefix = await db.get('prefix')

    const quoted =
      m.message?.extendedTextMessage?.contextInfo?.quotedMessage

    // HELP
    if (!quoted) {
      return await sock.sendMessage(from, {
        text:
`Reply to any view once message

${prefix}vv`
      }, { quoted: m })
    }

    // GET VIEW ONCE
    const viewOnce =
      quoted?.viewOnceMessage?.message ||
      quoted?.viewOnceMessageV2?.message ||
      quoted?.viewOnceMessageV2Extension?.message

    if (!viewOnce) {
      return await sock.sendMessage(from, {
        text: 'This is not a view once message'
      }, { quoted: m })
    }

    try {

      // IMAGE
      if (viewOnce.imageMessage) {
        const media = viewOnce.imageMessage

        return await sock.sendMessage(from, {
          image: media,
          caption: media.caption || ''
        }, { quoted: m })
      }

      // VIDEO
      if (viewOnce.videoMessage) {
        const media = viewOnce.videoMessage

        return await sock.sendMessage(from, {
          video: media,
          caption: media.caption || ''
        }, { quoted: m })
      }

      // AUDIO
      if (viewOnce.audioMessage) {
        const media = viewOnce.audioMessage

        return await sock.sendMessage(from, {
          audio: media,
          mimetype: media.mimetype || 'audio/mpeg',
          ptt: media.ptt || false
        }, { quoted: m })
      }

      // STICKER
      if (viewOnce.stickerMessage) {
        const media = viewOnce.stickerMessage

        return await sock.sendMessage(from, {
          sticker: media
        }, { quoted: m })
      }

      // DOCUMENT
      if (viewOnce.documentMessage) {
        const media = viewOnce.documentMessage

        return await sock.sendMessage(from, {
          document: media,
          mimetype:
            media.mimetype ||
            'application/octet-stream',
          fileName:
            media.fileName ||
            'viewonce-file'
        }, { quoted: m })
      }

      // CONTACT
      if (viewOnce.contactMessage) {
        return await sock.sendMessage(from, {
          contacts: {
            displayName:
              viewOnce.contactMessage.displayName,
            contacts: [
              {
                vcard: viewOnce.contactMessage.vcard
              }
            ]
          }
        }, { quoted: m })
      }

      // LOCATION
      if (viewOnce.locationMessage) {
        return await sock.sendMessage(from, {
          location: {
            degreesLatitude:
              viewOnce.locationMessage.degreesLatitude,
            degreesLongitude:
              viewOnce.locationMessage.degreesLongitude,
            name:
              viewOnce.locationMessage.name || '',
            address:
              viewOnce.locationMessage.address || ''
          }
        }, { quoted: m })
      }

      // FALLBACK
      return await sock.sendMessage(from, {
        text: 'Unsupported view once type'
      }, { quoted: m })

    } catch (e) {
      return await sock.sendMessage(from, {
        text: 'Failed to open view once message'
      }, { quoted: m })
    }
  }
}