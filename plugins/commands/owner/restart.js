/**
 * SwiftBot - plugins/commands/owner/restart.js
 * Restart Bot Host - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'restart',
  alias: ['reboot', 'reset'],
  desc: 'Restart bot host/process',
  usage: '',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const sent = await sock.sendMessage(from, {
      text: nobox
     ? `Restarting bot...\n\nBy: ${senderName}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *RESTART BOT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║\n║ Restarting...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1500))

    try {
      await sock.sendMessage(from, {
        edit: sent.key,
        text: nobox
       ? `Bot restarting ✅\n\nReconnecting in 3 seconds...`
          : `╔═━━━━━━━━━━━━━━━━═❒\n║ *RESTART BOT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Restarting ✅\n║ By: ${senderName}\n║\n║ Reconnecting...\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    } catch {}

    await new Promise(r => setTimeout(r, 1000))

    // Kill process - PM2/Railway/Render will auto-restart
    process.exit(1)
  }
}