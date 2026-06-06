/**
 * SwiftBot - plugins/observers/autoread.js
 * Auto Read Observer - Full Control
 * Matches autoread.js command settings
 * Category: Automation
 */

export default {
  name: 'autoread',
  event: 'messages.upsert',
  desc: 'Marks messages as read based on DB settings',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      const from = m.key.remoteJid
      const sender = m.key.participant || from
      const isGroup = from.endsWith('@g.us')

      // Load all settings from DB
      const [
        readEnabled,
        groupsWhitelist,
        usersWhitelist,
        dmEnabled,
        groupsEnabled
      ] = await Promise.all([
        db.get('autoread'),
        db.get('autoreadGroups'),
        db.get('autoreadUsers'),
        db.get('autoreadDM'),
        db.get('autoreadGroupsEnabled')
      ])

      if (!readEnabled) return

      // 1. DM MODE CHECK
      if (!isGroup) {
        if (dmEnabled === false) return
        if (usersWhitelist?.length > 0 &&!usersWhitelist.includes(sender)) return
      }

      // 2. GROUP MODE CHECK
      if (isGroup) {
        if (groupsEnabled === false) return
        if (groupsWhitelist?.length > 0 &&!groupsWhitelist.includes(from)) return
        if (usersWhitelist?.length > 0 &&!usersWhitelist.includes(sender)) return
      }

      // Mark message as read
      await sock.readMessages([m.key])

    } catch (e) {
      logger.error('AUTOREAD_OBSERVER', 'Failed to read message', e.message)
    }
  }
}