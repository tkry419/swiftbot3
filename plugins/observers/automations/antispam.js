/**
 * SwiftBot - plugins/observers/antispam.js
 * Anti Spam Observer - Auto Delete/Kick Flooders
 * Matches antispam.js command settings
 * Category: Automation
 */

// In-memory spam tracker
const spamTracker = new Map()

export default {
  name: 'antispam',
  event: 'messages.upsert',
  desc: 'Detects spam/flood and punishes senders based on DB settings',
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
      const now = Date.now()

      // Load settings
      const [
        antispamEnabled,
        actionType,
        msgLimit,
        timeWindow,
        groupsWhitelist,
        groupsEnabled,
        userWhitelist,
        owner
      ] = await Promise.all([
        db.get('antispam'),
        db.get('antispamAction'),
        db.get('antispamLimit'),
        db.get('antispamWindow'),
        db.get('antispamGroups'),
        db.get('antispamGroupsEnabled'),
        db.get('antispamWhitelist'),
        db.get('owner')
      ])

      if (!antispamEnabled) return

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

      const limit = msgLimit || 5
      const window = (timeWindow || 10) * 1000

      // Track user messages
      const key = `${from}:${sender}`
      if (!spamTracker.has(key)) {
        spamTracker.set(key, [])
      }

      const timestamps = spamTracker.get(key)
      timestamps.push(now)

      // Remove old timestamps outside window
      const validTimestamps = timestamps.filter(t => now - t < window)
      spamTracker.set(key, validTimestamps)

      // Check if spam limit exceeded
      if (validTimestamps.length < limit) return

      // SPAM DETECTED - Take action
      const punishment = actionType || 'delete'

      // Clear tracker for this user
      spamTracker.set(key, [])

      // 1. Delete all recent messages from user
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTISPAM', 'Failed to delete message', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} SPAM DETECTED\n║ ${validTimestamps.length} msgs in ${timeWindow}s\n║ Stop flooding\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🚫 @${senderClean} FLOODING\n║ ${validTimestamps.length} msgs in ${timeWindow}s\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTISPAM', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTISPAM_OBSERVER', 'Failed to process', e.message)
    }
  }
}