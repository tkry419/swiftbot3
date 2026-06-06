/**
 * SwiftBot - plugins/commands/group/kick.js
 * Kick Group Member - vs Bot
 * No permission check
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'kick',
  alias: ['remove'],
  desc: 'Kick user from group',
  usage: '@tag|reply|number',
  category: 'Group',
  permission: 'all', // Imebadilika kutoka 'admin'

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Group command only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    let targetJid
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Tag or reply user\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (targetJid === sock.user.id) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Cannot kick myself\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const targetName = getName(m, targetJid)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *KICK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Removing...\n╚━━━━━━━━━━━━━━━━━═❒`,
      mentions: [targetJid]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      await sock.groupParticipantsUpdate(from, [targetJid], 'remove')

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *KICK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Status: Kicked ✅\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [targetJid]
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to kick user\n║ Bot must be admin\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}