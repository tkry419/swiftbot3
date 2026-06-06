/**
 * SwiftBot - plugins/commands/group/tagall.js
 * Tag All Group Members - vs Bot
 * No permission check
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'tagall',
  alias: ['all', 'everyone', 'mentionall'],
  desc: 'Tag all group members',
  usage: 'optional text',
  category: 'Group',
  permission: 'all', // Imebadilika kutoka 'admin'

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Group command only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TAG ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${senderName}\n║\n║ Loading members...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 800))

    try {
      const groupMeta = await sock.groupMetadata(from)
      const participants = groupMeta.participants
      const text = args.join(' ') || 'Attention everyone!'

      let mentionText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *TAG ALL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Message: ${text}\n║ Members: ${participants.length}\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒\n\n`

      const mentions = []
      participants.forEach((p, i) => {
        mentionText += `${i + 1}. @${p.id.split('@')[0]}\n`
        mentions.push(p.id)
      })

      try {
        await sock.sendMessage(from, { edit: sent.key, text: mentionText, mentions })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to fetch members\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}