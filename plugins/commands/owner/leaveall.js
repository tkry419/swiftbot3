/**
 * SwiftBot - plugins/commands/owner/broadcast.js
 * Broadcast Message to All Users/Groups
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'broadcast',
  alias: ['bc', 'announce'],
  desc: 'Broadcast to all users/groups',
  usage: '<users/groups/all> <message>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox, body, prefix, cmdName }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const target = args[0]?.toLowerCase()
    const message = body.slice(prefix.length + cmdName.length + target.length).trim()

    if (!target ||!['users', 'groups', 'all'].includes(target) ||!message) {
      const msg = nobox
  ? `Broadcast: Invalid usage\n\nUsage: ${prefix}broadcast users/groups/all <message>`
        : await box.error(`Invalid usage\n\nUsage: ${prefix}broadcast users/groups/all <message>`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: nobox
  ? `Broadcasting to ${target}...\n\nBy: ${senderName}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *BROADCAST*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${target}\n║ By: ${senderName}\n║\n║ Sending...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    let sentCount = 0, failCount = 0
    const allUsers = await db.getAllUsers()
    const allGroups = await db.getAllGroups()

    const targets = []
    if (target === 'users' || target === 'all') targets.push(...Object.keys(allUsers).filter(j => j.endsWith('@s.whatsapp.net')))
    if (target === 'groups' || target === 'all') targets.push(...Object.keys(allGroups).filter(j => j.endsWith('@g.us')))

    for (const jid of targets) {
      try {
        await sock.sendMessage(jid, {
          text: `📢 *BROADCAST*\n\n${message}\n\n~ ${senderName}`
        })
        sentCount++
        await new Promise(r => setTimeout(r, 1000)) // 1s delay
      } catch {
        failCount++
      }
    }

    await sock.sendMessage(from, {
      edit: sent.key,
      text: nobox
  ? `Broadcast complete ✅\n\nSent: ${sentCount}\nFailed: ${failCount}\nTotal: ${targets.length}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *BROADCAST DONE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Sent: ${sentCount} ✅\n║ Failed: ${failCount} ❌\n║ Total: ${targets.length}\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}