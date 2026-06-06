/**
 * SwiftBot - plugins/observers/antistatusmention.js
 * Anti Status Mention Observer - Auto Delete Status Tags
 * Matches antistatusmention.js command settings
 * Category: Automation
 */

export default {
  name: 'antistatusmention',
  event: 'messages.upsert',
  desc: 'Deletes status messages that mention/tag users',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      // Only handle status broadcasts
      if (m.key.remoteJid!== 'status@broadcast') return

      const sender = m.key.participant || m.key.remoteJid
      const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

      // Check if status has mentions/tags
      if (mentions.length === 0) return

      // Load settings
      const [
        antistatusEnabled,
        actionType,
        userWhitelist,
        blockedUsers,
        owner
      ] = await Promise.all([
        db.get('antistatusmention'),
        db.get('antistatusmentionAction'),
        db.get('antistatusmentionWhitelist'),
        db.get('antistatusmentionBlocked'),
        db.get('owner')
      ])

      if (!antistatusEnabled) return

      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const senderClean = cleanJid(sender)

      // Always allow owner
      if (senderClean === owner) return
      // Always allow whitelisted users
      if (userWhitelist?.includes(sender)) return
      // If sender is in blocked list, delete
      if (blockedUsers?.includes(sender)) {
        try {
          await sock.sendMessage('status@broadcast', { delete: m.key })
        } catch {}
        return
      }

      // If not in blocked list and no whitelist, check if mentions include you
      const myJid = sock.user.id
      const taggedMe = mentions.some(jid => cleanJid(jid) === cleanJid(myJid))

      if (!taggedMe) return // Only delete if I'm tagged

      // STATUS MENTION DETECTED - Take action
      const punishment = actionType || 'delete'

      // 1. Delete status
      try {
        await sock.sendMessage('status@broadcast', { delete: m.key })
        logger.info('ANTISTATUSMENTION', `Deleted status from ${senderClean} - tagged me`)
      } catch (e) {
        logger.error('ANTISTATUSMENTION', 'Failed to delete status', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        // Can't send to status, so warn in DM
        try {
          await sock.sendMessage(sender, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ STATUS TAG DETECTED\n║ Don't tag me in status\n║ Your status was deleted\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      }

      if (punishment === 'kick') {
        // Can't kick from status, so just block user
        const blocked = await db.get('antistatusmentionBlocked') || []
        if (!blocked.includes(sender)) {
          blocked.push(sender)
          await db.set('antistatusmentionBlocked', blocked)
        }

        try {
          await sock.sendMessage(sender, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🚫 STATUS TAG BLOCKED\n║ You tagged me in status\n║ You're now blocked from tagging\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      }

    } catch (e) {
      logger.error('ANTISTATUSMENTION_OBSERVER', 'Failed to process', e.message)
    }
  }
}