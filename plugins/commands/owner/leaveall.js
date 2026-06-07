/**
 * SwiftBot - plugins/commands/owner/leaveall.js
 * Leave All Groups - DANGEROUS
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'leaveall',
  alias: ['leaveallgroups'],
  desc: 'Leave all groups',
  usage: '<confirm>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox, prefix }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const confirm = args[0]?.toLowerCase()

    if (confirm!== 'confirm') {
      const msg = nobox
  ? `⚠️ LEAVE ALL GROUPS\n\nThis will make bot leave ALL groups.\nCannot be undone.\n\nTo proceed: ${prefix}leaveall confirm`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *⚠️ LEAVE ALL GROUPS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Bot will leave ALL groups\n║ Cannot be undone!\n║\n║ To proceed:\n║ ${prefix}leaveall confirm\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const groups = await sock.groupFetchAllParticipating()
    const groupIds = Object.keys(groups)

    const sent = await sock.sendMessage(from, {
      text: nobox
  ? `Leaving ${groupIds.length} groups...\n\nBy: ${senderName}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *LEAVE ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Groups: ${groupIds.length}\n║ By: ${senderName}\n║\n║ Leaving...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    let left = 0, failed = 0
    for (const jid of groupIds) {
      try {
        await sock.groupLeave(jid)
        left++
        await new Promise(r => setTimeout(r, 2000))
      } catch {
        failed++
      }
    }

    await sock.sendMessage(from, {
      edit: sent.key,
      text: nobox
  ? `Left all groups ✅\n\nSuccess: ${left}\nFailed: ${failed}\nTotal: ${groupIds.length}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *LEAVE ALL DONE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Left: ${left} ✅\n║ Failed: ${failed} ❌\n║ Total: ${groupIds.length}\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}