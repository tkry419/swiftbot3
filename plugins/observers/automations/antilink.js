/**
 * SwiftBot - plugins/observers/antilink.js
 * Anti Link Observer - Auto Delete/Kick
 * Matches antilink.js command settings
 * Category: Automation
 */

export default {
  name: 'antilink',
  event: 'messages.upsert',
  desc: 'Deletes links and punishes senders based on DB settings',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger, box }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      if (!isGroup) return // Only works in groups

      const sender = m.key.participant || from
      const body = m.message.conversation
        || m.message.extendedTextMessage?.text
        || m.message.imageMessage?.caption
        || m.message.videoMessage?.caption
        || ''

      if (!body) return

      // Load settings
      const [
        antilinkEnabled,
        actionType,
        groupsWhitelist,
        groupsEnabled,
        userWhitelist,
        owner
      ] = await Promise.all([
        db.get('antilink'),
        db.get('antilinkAction'),
        db.get('antilinkGroups'),
        db.get('antilinkGroupsEnabled'),
        db.get('antilinkWhitelist'),
        db.get('owner')
      ])

      if (!antilinkEnabled) return

      // Check if group is enabled
      if (groupsEnabled === false) return
      if (groupsWhitelist?.length > 0 &&!groupsWhitelist.includes(from)) return

      // Check user whitelist + owner + admin
      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const senderClean = cleanJid(sender)

      if (userWhitelist?.includes(sender)) return
      if (senderClean === owner) return

      // Check if sender is admin
      try {
        const metadata = await sock.groupMetadata(from)
        const participant = metadata.participants.find(p => cleanJid(p.id) === senderClean)
        if (participant?.admin) return
      } catch {}

      // Link regex - detects URLs
      const linkRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(t\.me\/[^\s]+)|(chat\.whatsapp\.com\/[^\s]+)|(wa\.me\/[^\s]+)/gi

      if (!linkRegex.test(body)) return

      // Link detected - take action
      const punishment = actionType || 'delete'

      // 1. Delete message
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTILINK', 'Failed to delete message', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} LINK DETECTED\n║ Links not allowed here\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🔗 @${senderClean} SENT LINK\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTILINK', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTILINK_OBSERVER', 'Failed to process', e.message)
    }
  }
}