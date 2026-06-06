/**
 * SwiftBot - plugins/commands/profile/unblock.js
 * Unblock User - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'unblock',
  alias: ['unban'],
  desc: 'Unblock a user',
  usage: '@tag|reply|number',
  category: 'Profile',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const prefix = await db.get('prefix')

    let targetJid

    // DETERMINE TARGET
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
    if (quoted) targetJid = quoted
    else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    }
    else if (args[0]) {
      const number = args[0].replace(/[^0-9]/g, '')
      if (number.length < 10) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid number\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      targetJid = number + '@s.whatsapp.net'
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *UNBLOCK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}unblock @tag\n║ Usage: ${prefix}unblock reply\n║ Usage: ${prefix}unblock 255712345678\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const targetName = getName(m, targetJid)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *UNBLOCK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Unblocking...\n╚━━━━━━━━━━━━━━━━━═❒`,
      mentions: [targetJid]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      await sock.updateBlockStatus(targetJid, 'unblock')

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *UNBLOCK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Status: Unblocked ✅\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [targetJid]
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to unblock user\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}