/**
 * SwiftBot - plugins/commands/tools/getjid.js
 * Get JID from anywhere - DM, Group, Channel, Reply, Tag, Link
 * Works everywhere - English responses
 */

export default {
  name: 'getjid',
  alias: ['jid', 'id', 'whois'],
  desc: 'Get JID of chat, user, channel, or group',
  usage: '[reply/tag/link] or empty',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix') || '.'
    const isGroup = from.endsWith('@g.us')
    const isChannel = from.endsWith('@newsletter')
    const sender = m.key.participant || from

    // Helper to format JID display
    const formatJID = (jid, label) => {
      return `╔═━━━━━━━━━━━━━━━━═❒\n║ ${label}\n╠═══════════════════\n║ JID: ${jid}\n║ Type: ${jid.includes('@g.us')? 'Group' : jid.includes('@newsletter')? 'Channel' : jid.includes('@s.whatsapp.net')? 'User' : 'Unknown'}\n╚━━━━━━━━━━━━━━━━━═❒`
    }

    // 1. Check if replying to a message
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedParticipant = m.message?.extendedTextMessage?.contextInfo?.participant
    
    if (quotedParticipant) {
      return await sock.sendMessage(from, {
        text: formatJID(quotedParticipant, 'Replied User')
      }, { quoted: m })
    }

    // 2. Check if tagged someone
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    if (mentioned.length > 0) {
      let result = `╔═━━━━━━━━━━━━━━━━═❒\n║ Tagged Users\n╠═══════════════════\n`
      mentioned.forEach((jid, i) => {
        result += `║ ${i + 1}. ${jid}\n`
      })
      result += `╚━━━━━━━━━━━━━━━━━═❒`
      
      return await sock.sendMessage(from, { text: result }, { quoted: m })
    }

    // 3. Check if arg is a group/channel invite link
    if (args[0]) {
      const arg = args[0]
      
      // WhatsApp group invite
      if (arg.includes('chat.whatsapp.com/')) {
        const code = arg.split('chat.whatsapp.com/')[1].split(/[?#]/)[0]
        try {
          const groupInfo = await sock.groupGetInviteInfo(code)
          return await sock.sendMessage(from, {
            text: formatJID(groupInfo.id, 'Group from Link')
          }, { quoted: m })
        } catch {
          return await sock.sendMessage(from, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid group link\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        }
      }

      // WhatsApp channel invite
      if (arg.includes('whatsapp.com/channel/')) {
        const code = arg.split('whatsapp.com/channel/')[1].split(/[?#]/)[0]
        try {
          const metadata = await sock.newsletterMetadata('invite', code)
          return await sock.sendMessage(from, {
            text: formatJID(metadata.id, 'Channel from Link')
          }, { quoted: m })
        } catch {
          return await sock.sendMessage(from, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid channel link\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        }
      }

      // Manual JID or number
      let targetJid = arg
      if (!arg.includes('@')) {
        // Assume it's a phone number
        targetJid = arg.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
      }
      
      const [onWhatsapp] = await sock.onWhatsApp(targetJid.split('@')[0])
      if (onWhatsapp?.exists) {
        return await sock.sendMessage(from, {
          text: formatJID(onWhatsapp.jid, 'User from Number')
        }, { quoted: m })
      } else {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Number not on WhatsApp\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // 4. Default: Get current chat JID
    let label = 'Current Chat'
    if (isGroup) label = 'Group'
    else if (isChannel) label = 'Channel'
    else label = 'Direct Message'

    let result = formatJID(from, label)
    
    // Add sender JID if in group/channel
    if (isGroup || isChannel) {
      result += `\n\n╔═━━━━━━━━━━━━━━━━═❒\n║ Your JID\n╠═══════════════════\n║ JID: ${sender}\n╚━━━━━━━━━━━━━━━━━═❒`
    }

    await sock.sendMessage(from, { text: result }, { quoted: m })
  }
}