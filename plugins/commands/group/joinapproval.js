/**
 * SwiftBot - plugins/commands/group/joinapproval.js
 * Toggle Admin Approval for Joins - vs Bot
 * Controls if new members need approval
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'joinapproval',
  alias: ['approval', 'memberapproval'],
  desc: 'Toggle admin approval for new members',
  usage: '[on|off|enable|disable]',
  category: 'Group',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const prefix = await db.get('prefix')

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Group command only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const value = args[0]?.toLowerCase()

    if (!value) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *JOIN APPROVAL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}joinapproval on/off\n║ on = Admins must approve\n║ off = Auto join via link\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *JOIN APPROVAL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ By: ${senderName}\n║\n║ Updating...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      let resultText = ''

      if (value === 'on' || value === 'enable') {
        await sock.groupJoinApprovalMode(from, 'on')
        resultText = `Join approval: Enabled ✅\nAdmins must approve new members`
      } else if (value === 'off' || value === 'disable') {
        await sock.groupJoinApprovalMode(from, 'off')
        resultText = `Join approval: Disabled ❌\nAnyone with link can join`
      } else {
        throw new Error('INVALID_VALUE')
      }

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *JOIN APPROVAL UPDATED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ ${resultText}\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message === 'INVALID_VALUE') errorMsg = 'Use on/off or enable/disable'
      else if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('406')) errorMsg = 'Group creator only'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *UPDATE FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}