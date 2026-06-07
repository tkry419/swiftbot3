/**
 * SwiftBot - plugins/commands/owner/shutdown.js
 * Shutdown Bot - Kill process without restart
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'shutdown',
  alias: ['die', 'kill', 'off'],
  desc: 'Shutdown bot completely',
  usage: '<confirm>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const confirm = args[0]?.toLowerCase()

    if (confirm!== 'confirm') {
      const msg = nobox
   ? `⚠️ SHUTDOWN BOT\n\nThis will KILL the process.\nNo auto-restart.\n\nTo proceed: #shutdown confirm`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *⚠️ SHUTDOWN BOT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ This will KILL process\n║ No auto-restart\n║\n║ To proceed:\n║ #shutdown confirm\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await sock.sendMessage(from, {
      text: nobox
  ? `Bot shutting down...\n\nBy: ${senderName}\n\nGoodbye 👋`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *SHUTDOWN*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Shutting down ✅\n║ By: ${senderName}\n║\n║ Goodbye 👋\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 2000))
    process.exit(0) // Exit code 0 = no restart on PM2
  }
}