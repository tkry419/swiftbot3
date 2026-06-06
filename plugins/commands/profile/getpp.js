/**
 * SwiftBot - plugins/commands/profile/getpp.js
 * Get Profile Picture - vs Bot
 * Uses pushName, edit animation, same format as coinflip
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'getpp',
  alias: ['pp', 'profilepic', 'dp'],
  desc: 'Get profile picture of user',
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
║ *PROFILE PICTURE*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}getpp - Your PP
║ ${prefix}getpp @tag - User PP
║ ${prefix}getpp reply - Replied PP
║ ${prefix}getpp 255712345678 - Number PP
║ ${prefix}getpp hd - Force HD
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Player: ${senderName}
║ Fetching profile pics
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. DETERMINE TARGET
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
    if (quoted) {
      targetJid = quoted
    }
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
    else if (action === 'me') {
      targetJid = sender
    }

    const targetName = getName(m, targetJid)
    const hdMode = args.includes('hd')

    // 3. FETCHING ANIMATION
    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROFILE PICTURE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Fetching...\n╚━━━━━━━━━━━━━━━━━═❒`,
      mentions: [targetJid]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    // 4. GET PP
    try {
      let ppUrl
      try {
        ppUrl = await sock.profilePictureUrl(targetJid, hdMode? 'image' : 'preview')
      } catch {
        const noPPText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROFILE PICTURE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ NO PROFILE PIC\n║ Status: Not set\n╚━━━━━━━━━━━━━━━━━═❒`

        try {
          await sock.sendMessage(from, { edit: sent.key, text: noPPText, mentions: [targetJid] })
        } catch {}
        return
      }

      // Success - edit message then send image
      const successText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROFILE PICTURE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ @${targetJid.split('@')[0]}\n║\n║ Status: Found ✅\n║ Quality: ${hdMode? 'HD' : 'Normal'}\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: successText, mentions: [targetJid] })
      } catch {}

      // Send actual image
      const caption = `╔═━━━━━━━━━━━━━━━━═❒\n║ *PROFILE PICTURE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ User: ${targetName}\n║ Requested by: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`

      await sock.sendMessage(from, {
        image: { url: ppUrl },
        caption: caption,
        mentions: [targetJid, sender]
      }, { quoted: m })

    } catch (error) {
      const errorText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *ERROR*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to fetch PP\n║ User might be private\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, { edit: sent.key, text: errorText })
      } catch {}
    }
  }
}