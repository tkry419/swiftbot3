/**
 * SwiftBot - plugins/commands/owner/wipechat.js
 * Delete All Bot Messages in Chat
 */

export default {
  name: 'wipechat',
  alias: ['clearchat', 'deletemsgs'],
  desc: 'Delete all bot messages in current chat',
  usage: '<confirm>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { box, nobox }) => {
    const from = m.key.remoteJid
    const confirm = args[0]?.toLowerCase()

    if (confirm!== 'confirm') {
      const msg = nobox
  ? `⚠️ WIPE CHAT\n\nDelete ALL bot messages here.\n\nTo proceed: #wipechat confirm`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *⚠️ WIPE CHAT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Delete ALL bot msgs here\n║\n║ To proceed:\n║ #wipechat confirm\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const chat = await sock.chatModify({ clear: 'all' }, from)

    await sock.sendMessage(from, {
      text: nobox? 'Chat wiped ✅' : `╔═━━━━━━━━━━━━━━━━═❒\n║ Chat wiped ✅\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}