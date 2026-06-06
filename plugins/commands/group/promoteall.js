/**
 * SwiftBot - plugins/commands/group/promoteall.js
 * Promote All Members - vs Bot
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'promoteall',
  alias: ['adminall'],
  desc: 'Promote all members to admin',
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
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROMOTE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ By: ${senderName}\n║\n║ Scanning members...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      const groupMeta = await sock.groupMetadata(from)
      const toPromote = groupMeta.participants.filter(p =>
      !p.admin && p.id!== sock.user.id
      )

      if (toPromote.length === 0) {
        throw new Error('ALL_ADMINS')
      }

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROMOTE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Found: ${toPromote.length} members\n║\n║ Promoting...\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

      await new Promise(r => setTimeout(r, 1500))

      const jids = toPromote.map(p => p.id)
      await sock.groupParticipantsUpdate(from, jids, 'promote')

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROMOTE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Promoted: ${toPromote.length} 👑\n║ All are admins now\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message === 'ALL_ADMINS') errorMsg = 'Everyone is admin already'
      else if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('406')) errorMsg = 'Group creator only'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROMOTE ALL FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}