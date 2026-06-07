/**
 * SwiftBot - plugins/commands/group/setgcpp.js
 * Set Group Profile Picture - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

import { downloadContentFromMessage, getContentType } from "@whiskeysockets/baileys"

export default {
  name: 'setgcpp',
  alias: ['setgcdp', 'setgroupdp', 'setgrouppp'],
  desc: 'Set group profile picture',
  usage: 'reply image',
  category: 'Group',
  permission: 'admin',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Group command only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted || getContentType(quoted)!== 'imageMessage') {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET GROUP PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reply to an image\n║ Only group admin\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET GROUP PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Admin: ${senderName}\n║\n║ Updating...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      const stream = await downloadContentFromMessage(quoted.imageMessage, 'image')
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }

      await sock.updateProfilePicture(from, buffer)

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET GROUP PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Updated ✅\n║ Changed by: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('406')) errorMsg = 'Group creator only'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET GROUP PIC FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}