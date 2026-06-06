/**
 * SwiftBot - plugins/commands/profile/vv2.js
 * Silent View Once Forward - vs Bot
 * Sends unlocked media silently to user's DM
 * No confirmations
 * Supports image, video, audio, sticker, document
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'vv2',
  alias: [
    'vvdm',
    'viewoncedm',
    'vvdm2'
  ],
  desc: 'Send view once media silently to your DM',
  usage: 'reply to view once',
  category: 'Profile',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {

    const sender =
      m.key.participant ||
      m.key.remoteJid

    const quoted =
      m.message?.extendedTextMessage?.contextInfo?.quotedMessage

    // NO REPLY
    if (!quoted) return

    // GET VIEW ONCE
    const viewOnce =
      quoted?.viewOnceMessage?.message ||
      quoted?.viewOnceMessageV2?.message ||
      quoted?.viewOnceMessageV2Extension?.message

    // NOT VIEW ONCE
    if (!viewOnce) return

    const dm = sender

    try {

      // IMAGE
      if (viewOnce.imageMessage) {
        const media = viewOnce.imageMessage

        return await sock.sendMessage(dm, {
          image: media,
          caption: media.caption || ''
        })
      }

      // VIDEO
      if (viewOnce.videoMessage) {
        const media = viewOnce.videoMessage

        return await sock.sendMessage(dm, {
          video: media,
          caption: media.caption || ''
        })
      }

      // AUDIO
      if (viewOnce.audioMessage) {
        const media = viewOnce.audioMessage

        return await sock.sendMessage(dm, {
          audio: media,
          mimetype:
            media.mimetype ||
            'audio/mpeg',
          ptt: media.ptt || false
        })
      }

      // STICKER
      if (viewOnce.stickerMessage) {
        const media = viewOnce.stickerMessage

        return await sock.sendMessage(dm, {
          sticker: media
        })
      }

      // DOCUMENT
      if (viewOnce.documentMessage) {
        const media = viewOnce.documentMessage

        return await sock.sendMessage(dm, {
          document: media,
          mimetype:
            media.mimetype ||
            'application/octet-stream',
          fileName:
            media.fileName ||
            'viewonce-file'
        })
      }

      // CONTACT
      if (viewOnce.contactMessage) {
        return await sock.sendMessage(dm, {
          contacts: {
            displayName:
              viewOnce.contactMessage.displayName,
            contacts: [
              {
                vcard:
                  viewOnce.contactMessage.vcard
              }
            ]
          }
        })
      }

      // LOCATION
      if (viewOnce.locationMessage) {
        return await sock.sendMessage(dm, {
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
        })
      }

    } catch {

      // FALLBACK COPY
      try {
        await sock.copyNForward(
          dm,
          quoted,
          true
        )
      } catch {}

    }
  }
}