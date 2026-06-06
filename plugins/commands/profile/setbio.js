/**
 * SwiftBot - plugins/commands/profile/setbio.js
 * Set Bot Bio/About - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'setbio',
  alias: ['setabout', 'setstatus'],
  desc: 'Set bot bio/about',
  usage: 'text',
  category: 'Profile',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const prefix = await db.get('prefix')

    const newBio = args.join(' ')
    if (!newBio) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *SET BOT BIO*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Usage: ${prefix}setbio text
║ Example: ${prefix}setbio SwiftBot 🔥
║ Only bot owner
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET BOT BIO*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║\n║ Updating...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 800))

    try {
      await sock.updateProfileStatus(newBio)

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET BOT BIO*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Updated ✅\n║ New Bio: ${newBio}\n║ Changed by: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to update bio\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}