/**
 * SwiftBot - plugins/commands/profile/whois.js
 * Get User Info - vs Bot
 * Uses pushName, edit animation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'whois',
  alias: ['userinfo', 'info'],
  desc: 'Get detailed user info',
  usage: '@tag|reply|number|me',
  category: 'Profile',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const action = args[0]?.toLowerCase()

    let targetJid = sender

    // DETERMINE TARGET
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
    if (quoted) targetJid = quoted
    else if (m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length) {
      targetJid = m.message.extendedTextMessage.contextInfo.mentionedJid[0]
    }
    else if (action && /^\d+$/.test(action.replace(/[^0-9]/g, ''))) {
      const number = action.replace(/[^0-9]/g, '')
      targetJid = number + '@s.whatsapp.net'
    }

    const targetName = getName(m, targetJid)
    const isGroup = from.endsWith('@g.us')

    // FETCHING ANIMATION
    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *USER INFO*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Scanning...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1200))

    try {
      let ppUrl = 'https://i.ibb.co/4Y8JdJ3/default.jpg'
      let bio = 'Hidden'
      let isAdmin = false
      let isBusiness = targetJid.includes('@c.us')? false : true

      try { ppUrl = await sock.profilePictureUrl(targetJid, 'preview') } catch {}
      try { bio = (await sock.fetchStatus(targetJid))?.status || 'No bio' } catch {}

      if (isGroup) {
        const groupMeta = await sock.groupMetadata(from)
        isAdmin = groupMeta.participants.find(p => p.id === targetJid)?.admin? true : false
      }

      const resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *USER INFO*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Name: ${targetName}\n║ Number: @${targetJid.split('@')[0]}\n║ JID: ${targetJid}\n║\n║ Bio: ${bio}\n║ Admin: ${isAdmin? 'Yes 👑' : 'No'}\n║ Business: ${isBusiness? 'Yes 💼' : 'No'}\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: resultText, mentions: [targetJid] })
      } catch {}

    } catch {
      try {
        await sock.sendMessage(from, { edit: sent.key, text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to fetch info\n╚━━━━━━━━━━━━━━━━━═❒` })
      } catch {}
    }
  }
}