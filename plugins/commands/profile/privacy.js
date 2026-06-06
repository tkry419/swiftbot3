/**
 * SwiftBot - plugins/commands/profile/privacy.js
 * Check Bot Privacy Settings - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'privacy',
  alias: ['privacysettings', 'ps'],
  desc: 'Check bot privacy settings',
  usage: '',
  category: 'Profile',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PRIVACY SETTINGS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Requested by: ${senderName}\n║\n║ Checking...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1200))

    try {
      const settings = await sock.fetchPrivacySettings(true)

      const lastSeen = settings.last || 'unknown'
      const profilePic = settings.profile || 'unknown'
      const status = settings.status || 'unknown'
      const readReceipts = settings.readreceipts || 'unknown'
      const groups = settings.groupadd || 'unknown'

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *PRIVACY SETTINGS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Last Seen: ${lastSeen}\n║ Profile Photo: ${profilePic}\n║ About: ${status}\n║ Read Receipts: ${readReceipts}\n║ Group Add: ${groups}\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: resultText })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to fetch privacy\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}