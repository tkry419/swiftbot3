/**
 * SwiftBot - plugins/observers/autolikestatus.js
 * Auto Like Status Observer - Full Control
 * Matches autolikestatus.js command settings
 * Category: Automation
 */

export default {
  name: 'autolikestatus',
  event: 'messages.upsert',
  desc: 'Auto likes status updates based on DB settings',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      // Only handle status broadcasts
      if (m.key.remoteJid!== 'status@broadcast') return
      if (m.key.fromMe) return
      if (!m.message) return

      const sender = m.key.participant || m.key.remoteJid

      // Load settings from DB
      const [
        likeEnabled,
        usersWhitelist,
        allEnabled
      ] = await Promise.all([
        db.get('autolikestatus'),
        db.get('autolikestatusUsers'),
        db.get('autolikestatusAll')
      ])

      if (!likeEnabled) return

      // Check if all contacts enabled
      if (allEnabled === false) {
        // If specific users list exists, check if sender is in it
        if (usersWhitelist?.length > 0 &&!usersWhitelist.includes(sender)) return
        // If no whitelist and all is false, skip
        if (!usersWhitelist?.length) return
      }

      // React with heart emoji to status
      await sock.sendMessage('status@broadcast', {
        react: {
          text: '❤️',
          key: m.key
        }
      }, {
        statusJidList: [sender]
      })

    } catch (e) {
      logger.error('AUTOLIKESTATUS_OBSERVER', 'Failed to like status', e.message)
    }
  }
}