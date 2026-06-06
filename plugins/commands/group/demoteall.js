/**
 * SwiftBot - plugins/commands/group/demoteall.js
 * Demote All Admins - vs Bot
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'demoteall',
  alias: ['unadminall'],
  desc: 'Demote all admins to members',
  usage: '',
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

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DEMOTE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ By: ${senderName}\n║\n║ Scanning admins...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      const groupMeta = await sock.groupMetadata(from)
      const toDemote = groupMeta.participants.filter(p =>
        p.admin && p.id!== sock.user.id && p.id!== groupMeta.owner
      )

      if (toDemote.length === 0) {
        throw new Error('NO_ADMINS')
      }

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DEMOTE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Found: ${toDemote.length} admins\n║\n║ Demoting...\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

      await new Promise(r => setTimeout(r, 1500))

      const jids = toDemote.map(p => p.id)
      await sock.groupParticipantsUpdate(from, jids, 'demote')

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DEMOTE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Demoted: ${toDemote.length} ✅\n║ Creator & Bot kept\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message === 'NO_ADMINS') errorMsg = 'No admins to demote'
      else if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('406')) errorMsg = 'Group creator only'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DEMOTE ALL FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}