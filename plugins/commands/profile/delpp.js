/**
 * SwiftBot - plugins/commands/profile/delpp.js
 * Delete Bot Profile Picture - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'delpp',
  alias: ['deldp', 'removepp', 'removedp'],
  desc: 'Delete bot profile picture',
  usage: '',
  category: 'Profile',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DELETE PROFILE PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║\n║ Removing...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      await sock.removeProfilePicture(sock.user.id)

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DELETE PROFILE PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Removed ✅\n║ Changed by: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to remove PP\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}