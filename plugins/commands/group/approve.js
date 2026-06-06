/**
 * SwiftBot - plugins/commands/group/approve.js
 * Approve Group Join Requests - vs Bot
 * Usage: approve, approve all, approve 255712345678
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'approve',
  alias: ['accept', 'acceptrequest'],
  desc: 'Approve pending group join requests',
  usage: '[all|number]',
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

    const subCmd = args[0]?.toLowerCase()

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *APPROVE REQUESTS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ By: ${senderName}\n║\n║ Checking requests...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      const requests = await sock.groupRequestParticipantsList(from)

      if (!requests || requests.length === 0) {
        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *APPROVE REQUESTS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: No pending requests\n║ Queue is empty\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
        return
      }

      // APPROVE ALL
      if (subCmd === 'all') {
        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *APPROVE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Found: ${requests.length} requests\n║\n║ Approving...\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}

        await new Promise(r => setTimeout(r, 1500))

        const jids = requests.map(r => r.jid)
        await sock.groupRequestParticipantsUpdate(from, jids, 'approve')

        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *APPROVE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Approved: ${requests.length} ✅\n║ All joined group\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
        return
      }

      // APPROVE SPECIFIC NUMBER
      if (args[0] && /^\d+$/.test(args[0])) {
        const number = args[0].replace(/[^0-9]/g, '')
        const targetJid = number + '@s.whatsapp.net'

        const found = requests.find(r => r.jid === targetJid)
        if (!found) {
          throw new Error('NOT_IN_REQUESTS')
        }

        await sock.groupRequestParticipantsUpdate(from, [targetJid], 'approve')

        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *APPROVE USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Number: +${number}\n║ Status: Approved ✅\n║ User joined group\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
        return
      }

      // LIST REQUESTS
      let listText = requests.slice(0, 15).map((r, i) => `║ ${i + 1}. @${r.jid.split('@')[0]}`).join('\n')
      if (requests.length > 15) listText += `\n║... and ${requests.length - 15} more`

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *PENDING REQUESTS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Total: ${requests.length} pending\n║\n${listText}\n║\n║ Usage: ${prefix}approve all\n║ Usage: ${prefix}approve 255712345678\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: resultText,
          mentions: requests.slice(0, 15).map(r => r.jid)
        })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message === 'NOT_IN_REQUESTS') errorMsg = 'Number not in pending requests'
      else if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('406')) errorMsg = 'Group creator only'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *APPROVE FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}