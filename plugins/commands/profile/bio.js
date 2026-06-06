/**
 * SwiftBot - plugins/commands/profile/bio.js
 * Get User Bio/About - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'bio',
  alias: ['about', 'status'],
  desc: 'Get user bio/about',
  usage: '@tag|reply|number|me',
  category: 'Profile',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const action = args[0]?.toLowerCase()
    const prefix = await db.get('prefix')

    let targetJid = sender

    // 1. HELP
    if (!action &&!m.message?.extendedTextMessage?.contextInfo?.quotedMessage &&!m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *USER BIO*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}bio - Your bio
║ ${prefix}bio @tag - User bio
║ ${prefix}bio reply - Replied bio
║ ${prefix}bio 255712345678 - Number bio
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Player: ${senderName}
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. DETERMINE TARGET
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
    if (quoted) targetJid = quoted
    else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    }
    else if (action && /^\d+$/.test(action.replace(/[^0-9]/g, ''))) {
      const number = action.replace(/[^0-9]/g, '')
      if (number.length < 10) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid number\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      targetJid = number + '@s.whatsapp.net'
    }

    const targetName = getName(m, targetJid)

    // 3. FETCHING ANIMATION
    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *USER BIO*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Fetching...\n╚━━━━━━━━━━━━━━━━━═❒`,
      mentions: [targetJid]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 800))

    // 4. GET BIO
    try {
      const status = await sock.fetchStatus(targetJid)
      const bioText = status?.status || 'No bio set'
      const setAt = status?.setAt? new Date(status.setAt).toLocaleDateString() : 'Unknown'

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *USER BIO*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Bio: ${bioText}\n║ Updated: ${setAt}\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: resultText, mentions: [targetJid] })
      } catch {}

    } catch {
      const errorText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *USER BIO*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Status: Private\n║ Bio: Hidden\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: errorText, mentions: [targetJid] })
      } catch {}
    }
  }
}