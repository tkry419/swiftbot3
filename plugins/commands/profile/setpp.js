/**
 * SwiftBot - plugins/commands/profile/setpp.js
 * Set Bot Profile Picture - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

import { downloadContentFromMessage, getContentType } from "@whiskeysockets/baileys"

export default {
  name: 'setpp',
  alias: ['setdp'],
  desc: 'Set bot profile picture',
  usage: 'reply image',
  category: 'Profile',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    if (!quoted || getContentType(quoted)!== 'imageMessage') {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET PROFILE PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reply to an image\n║ Only bot owner\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET PROFILE PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║\n║ Updating...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      const stream = await downloadContentFromMessage(quoted.imageMessage, 'image')
      let buffer = Buffer.from([])
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk])
      }

      await sock.updateProfilePicture(sock.user.id, buffer)

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SET PROFILE PIC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Updated ✅\n║ Changed by: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to update PP\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}