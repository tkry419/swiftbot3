/**
 * SwiftBot - plugins/observers/antitag.js
 * Anti Tag Observer - Auto Delete Tag Spam
 * Matches antitag.js command settings
 * Category: Automation
 */

export default {
  name: 'antitag',
  event: 'messages.upsert',
  desc: 'Deletes tag-all, hidetag, and mention spam',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      if (!isGroup) return

      const sender = m.key.participant || from
      const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

      // Load settings
      const [
        antitagEnabled,
        actionType,
        mentionLimit,
        groupsWhitelist,
        groupsEnabled,
        userWhitelist,
        owner
      ] = await Promise.all([
        db.get('antitag'),
        db.get('antitagAction'),
        db.get('antitagLimit'),
        db.get('antitagGroups'),
        db.get('antitagGroupsEnabled'),
        db.get('antitagWhitelist'),
        db.get('owner')
      ])

      if (!antitagEnabled) return

      // Check if group is enabled
      if (groupsEnabled === false) return
      if (groupsWhitelist?.length > 0 &&!groupsWhitelist.includes(from)) return

      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const senderClean = cleanJid(sender)

      // Always allow owner
      if (senderClean === owner) return
      // Always allow whitelisted users
      if (userWhitelist?.includes(sender)) return

      // Check if sender is admin
      let isAdmin = false
      try {
        const metadata = await sock.groupMetadata(from)
        const participant = metadata.participants.find(p => cleanJid(p.id) === senderClean)
        isAdmin = participant?.admin || false
        if (isAdmin) return // Admins bypass
      } catch {}

      // Tag spam detection
      let isTagSpam = false
      let reason = ''

      const limit = mentionLimit || 5
      const groupSize = metadata?.participants?.length || 0

      // 1. Tag All / HideTag detection - mentions >= 70% of group
      if (mentions.length > 0 && groupSize > 0) {
        const mentionRatio = mentions.length / groupSize
        if (mentionRatio >= 0.7 || mentions.length >= groupSize - 2) {
          isTagSpam = true
          reason = 'Tag All'
        }
      }

      // 2. Mention spam - exceeds limit
      if (!isTagSpam && mentions.length >= limit) {
        isTagSpam = true
        reason = `${mentions.length} mentions`
      }

      if (!isTagSpam) return

      // TAG SPAM DETECTED - Take action
      const punishment = actionType || 'delete'

      // 1. Delete message
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTITAG', 'Failed to delete message', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} TAG SPAM\n║ Reason: ${reason}\n║ Limit: ${limit} mentions\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🏷️ @${senderClean} TAGGED ALL\n║ Reason: ${reason}\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTITAG', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTITAG_OBSERVER', 'Failed to process', e.message)
    }
  }
}