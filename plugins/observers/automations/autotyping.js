/**
 * SwiftBot - plugins/observers/autotyping.js
 * Auto Typing/Recording Observer - Full Control
 * Matches autotyping.js command settings
 * Category: Automation
 */

export default {
  name: 'autotyping',
  event: 'messages.upsert',
  desc: 'Shows typing/recording presence based on DB settings',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      // Skip bot's own messages
      if (m.key.fromMe) return
      if (!m.message) return

      const from = m.key.remoteJid
      const sender = m.key.participant || from
      const isGroup = from.endsWith('@g.us')

      // Load all settings from DB
      const [
        typingEnabled,
        recordEnabled,
        delay,
        groupsWhitelist,
        usersWhitelist,
        dmEnabled,
        groupsEnabled
      ] = await Promise.all([
        db.get('autotyping'),
        db.get('autrecord'),
        db.get('autotypingDelay'),
        db.get('autotypingGroups'),
        db.get('autotypingUsers'),
        db.get('autotypingDM'),
        db.get('autotypingGroupsEnabled')
      ])

      // Check if any mode is active
      if (!typingEnabled && !recordEnabled) return

      // 1. DM MODE CHECK
      if (!isGroup) {
        // If DM global is disabled, stop
        if (dmEnabled === false) return
        
        // If users whitelist exists, check if sender is in it
        if (usersWhitelist?.length > 0 && !usersWhitelist.includes(sender)) return
      }

      // 2. GROUP MODE CHECK
      if (isGroup) {
        // If Groups global is disabled, stop
        if (groupsEnabled === false) return
        
        // If groups whitelist exists, check if current group is in it
        if (groupsWhitelist?.length > 0 && !groupsWhitelist.includes(from)) return
        
        // If users whitelist exists, check if sender is in it
        if (usersWhitelist?.length > 0 && !usersWhitelist.includes(sender)) return
      }

      // Determine presence type: recording beats typing
      const presenceType = recordEnabled ? 'recording' : 'composing'
      const presenceDuration = delay || 2000

      // Send presence
      await sock.sendPresenceUpdate(presenceType, from)

      // Stop after delay
      setTimeout(async () => {
        try {
          await sock.sendPresenceUpdate('paused', from)
        } catch (e) {
          // Silent fail - chat might be closed
        }
      }, presenceDuration)

    } catch (e) {
      logger.error('AUTOTYPING_OBSERVER', 'Failed to send presence', e.message)
    }
  }
}