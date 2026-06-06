/**
 * SwiftBot - plugins/commands/profile/listblock.js
 * List Blocked Users - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'listblock',
  alias: ['blocklist', 'blocked'],
  desc: 'List all blocked users',
  usage: '',
  category: 'Profile',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BLOCK LIST*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Requested by: ${senderName}\n║\n║ Fetching...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      const blocked = await sock.fetchBlocklist()

      if (!blocked || blocked.length === 0) {
        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BLOCK LIST*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Clean ✅\n║ Blocked: 0 users\n║\n║ No blocked users\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
        return
      }

      let listText = blocked.slice(0, 20).map((jid, i) => `║ ${i + 1}. @${jid.split('@')[0]}`).join('\n')
      if (blocked.length > 20) listText += `\n║... and ${blocked.length - 20} more`

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *BLOCK LIST*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Total: ${blocked.length} users\n║\n${listText}\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: resultText,
          mentions: blocked.slice(0, 20)
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to fetch blocklist\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}