/**
 * SwiftBot - plugins/commands/group/demote.js
 * Demote User from Admin - vs Bot
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'demote',
  alias: ['unadmin'],
  desc: 'Demote admin to member',
  usage: '@tag|reply|number',
  category: 'Group',
  permission: 'all',

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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Tag or reply to user\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const targetName = getName(m, targetJid)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DEMOTE USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Demoting...\n╚━━━━━━━━━━━━━━━━━═❒`,
      mentions: [targetJid]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      const groupMeta = await sock.groupMetadata(from)
      const targetData = groupMeta.participants.find(p => p.id === targetJid)

      if (!targetData) {
        throw new Error('NOT_IN_GROUP')
      }
      if (!targetData.admin) {
        throw new Error('NOT_ADMIN')
      }
      if (groupMeta.owner === targetJid) {
        throw new Error('GROUP_CREATOR')
      }

      await sock.groupParticipantsUpdate(from, [targetJid], 'demote')

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DEMOTE USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Status: Member now ✅\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [targetJid]
        })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message === 'NOT_IN_GROUP') errorMsg = 'User not in group'
      else if (error.message === 'NOT_ADMIN') errorMsg = 'User is not admin'
      else if (error.message === 'GROUP_CREATOR') errorMsg = 'Cannot demote group creator'
      else if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('406')) errorMsg = 'Group creator only'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DEMOTE FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}