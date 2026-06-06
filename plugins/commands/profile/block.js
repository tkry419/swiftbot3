/**
 * SwiftBot - plugins/commands/profile/block.js
 * Block User - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'block',
  alias: ['ban'],
  desc: 'Block a user',
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BLOCK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}block @tag\n║ Usage: ${prefix}block reply\n║ Usage: ${prefix}block 255712345678\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (targetJid === sock.user.id) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Cannot block myself\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const targetName = getName(m, targetJid)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BLOCK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Blocking...\n╚━━━━━━━━━━━━━━━━━═❒`,
      mentions: [targetJid]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      await sock.updateBlockStatus(targetJid, 'block')

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BLOCK USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Status: Blocked ✅\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [targetJid]
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to block user\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}