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

  execute: async (sock, m, args, { box, nobox, prefix }) => {
    const from = m.key.remoteJid
    const confirm = args[0]?.toLowerCase()

    if (confirm!== 'confirm') {
      const msg = nobox
 ? `⚠️ WIPE CHAT\n\nDelete ALL bot messages here.\n\nTo proceed: ${prefix}wipechat confirm`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *⚠️ WIPE CHAT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Delete ALL bot msgs here\n║\n║ To proceed:\n║ ${prefix}wipechat confirm\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    try {
      await sock.chatModify({ clear: 'all' }, from)

      await sock.sendMessage(from, {
        text: nobox? 'Chat wiped ✅' : `╔═━━━━━━━━━━━━━━━━═❒\n║ Chat wiped ✅\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    } catch (error) {
      await sock.sendMessage(from, {
        text: nobox
   ? `Failed to wipe chat\n\nError: ${error.message}`
          : `╔═━━━━━━━━━━━━━━━━═❒\n║ *WIPE FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Error: ${error.message}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}