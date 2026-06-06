/**
 * SwiftBot - plugins/observers/antimessages.js
 * Anti Messages Observer - Auto Delete Messages
 * Matches antimessages.js command settings
 * Category: Automation
 */

export default {
  name: 'antimessages',
  event: 'messages.upsert',
  desc: 'Deletes messages from blocked users or all non-admins',
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

      // Load settings
      const [
        antimessagesEnabled,
        mode,
        groupsWhitelist,
        groupsEnabled,
        blockedUsers,
        userWhitelist,
        owner
      ] = await Promise.all([
        db.get('antimessages'),
        db.get('antimessagesMode'),
        db.get('antimessagesGroups'),
        db.get('antimessagesGroupsEnabled'),
        db.get('antimessagesBlocked'),
        db.get('antimessagesWhitelist'),
        db.get('owner')
      ])

      if (!antimessagesEnabled) return

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
      } catch {}

      // Mode: 'all' = block all non-admins
      if (mode === 'all') {
        if (isAdmin) return // Admins bypass

        // Delete message
        try {
          await sock.sendMessage(from, { delete: m.key })
        } catch (e) {
          logger.error('ANTIMESSAGES', 'Failed to delete message', e.message)
        }
        return
      }

      // Mode: 'blocked' = block specific users only
      if (mode === 'blocked' ||!mode) {
        if (!blockedUsers || blockedUsers.length === 0) return
        if (!blockedUsers.includes(sender)) return

        // Delete message from blocked user
        try {
          await sock.sendMessage(from, { delete: m.key })
        } catch (e) {
          logger.error('ANTIMESSAGES', 'Failed to delete message', e.message)
        }
      }

    } catch (e) {
      logger.error('ANTIMESSAGES_OBSERVER', 'Failed to process', e.message)
    }
  }
}