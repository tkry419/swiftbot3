/**
 * SwiftBot - plugins/commands/group/promote.js
 * Promote User to Admin - vs Bot
 * No permission check
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'promote',
  alias: ['admin', 'makeadmin'],
  desc: 'Promote user to admin',
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
      targetJid = number + '@s.whatsapp.net'
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Tag or reply user\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const targetName = getName(m, targetJid)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROMOTE USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Promoting...\n╚━━━━━━━━━━━━━━━━━═❒`,
      mentions: [targetJid]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      await sock.groupParticipantsUpdate(from, [targetJid], 'promote')

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROMOTE USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Status: Admin now 👑\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [targetJid]
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to promote\n║ Bot must be admin\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}