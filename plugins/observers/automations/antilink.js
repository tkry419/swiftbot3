/**
 * SwiftBot - plugins/observers/automations/antilink.js
 * AntiLink System - Auto delete links + warn + kick
 * Scope: global or per-group - vs Bot
 */

export default {
  name: 'antilink',
  event: 'messages.upsert',
  desc: 'Auto delete links and warn users',
  category: 'automations',
  permission: 'all',

  execute: async (sock, update, { db, logger }) => {
    try {
      const m = update.messages?.[0]
      if (!m?.message || m.key.fromMe) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      if (!isGroup) return

      // Check if antilink enabled globally or for this group
      const globalEnabled = await db.get('antilinkEnabled') || false
      const groupEnabled = await db.getGroupKey(from, 'antilinkEnabled')

      // Priority: group setting > global setting
      const isEnabled = groupEnabled!== null? groupEnabled : globalEnabled
      if (!isEnabled) return

      // Get message text
      const body = m.message?.conversation
        || m.message?.extendedTextMessage?.text
        || m.message?.imageMessage?.caption
        || m.message?.videoMessage?.caption
        || ''

      // Link regex - detects all types
      const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|chat\.whatsapp\.com\/[^\s]+|wa\.me\/[^\s]+|discord\.gg\/[^\s]+)/gi
      if (!linkRegex.test(body)) return

      const sender = m.key.participant || from
      const botId = sock.user?.id
      const botClean = botId?.split('@')[0]?.split(':')[0] || ''

      // Don't act on bot or owner
      const owner = await db.get('owner')
      if (sender.includes(botClean) || sender.includes(owner)) return

      // Check if sender is admin - admins bypass
      try {
        const metadata = await sock.groupMetadata(from)
        const participant = metadata.participants.find(p => p.id === sender)
        const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin'
        if (isAdmin) return
      } catch (e) {
        logger.warn('ANTILINK', 'Failed to check admin', e.message)
      }

      // Check whitelist
      const globalWhitelist = await db.get('antilinkWhitelist') || []
      const groupWhitelist = await db.getGroupKey(from, 'antilinkWhitelist') || []
      const whitelist = [...globalWhitelist,...groupWhitelist]

      const hasWhitelistedLink = whitelist.some(domain => body.toLowerCase().includes(domain.toLowerCase()))
      if (hasWhitelistedLink) return

      // Delete message
      await sock.sendMessage(from, { delete: m.key })

      // Get warn settings
      const maxWarns = await db.getGroupKey(from, 'antilinkMaxWarns') || await db.get('antilinkMaxWarns') || 3
      const warnKey = `antilink_warns_${from}_${sender}`
      const currentWarns = await db.get(warnKey) || 0
      const newWarns = currentWarns + 1

      await db.set(warnKey, newWarns)

      // Get group metadata for name
      const groupMetadata = await sock.groupMetadata(from)
      const groupName = groupMetadata.subject

      if (newWarns >= maxWarns) {
        // Kick user
        try {
          await sock.groupParticipantsUpdate(from, [sender], 'remove')
          await sock.sendMessage(from, {
            text: `🚫 @${sender.split('@')[0]} kicked from ${groupName}\nReason: Sent links ${maxWarns}/${maxWarns} times`,
            mentions: [sender]
          })
          await db.set(warnKey, 0) // Reset warns
          logger.warn('ANTILINK', `Kicked ${sender} from ${from} for links`)
        } catch (e) {
          await sock.sendMessage(from, {
            text: `⚠️ Cannot kick @${sender.split('@')[0]} - Bot needs admin rights`,
            mentions: [sender]
          })
        }
      } else {
        // Warn user
        await sock.sendMessage(from, {
          text: `⚠️ @${sender.split('@')[0]} Links not allowed!\nWarning: ${newWarns}/${maxWarns}\n${maxWarns - newWarns} more = kick`,
          mentions: [sender]
        }, { quoted: m })
        logger.info('ANTILINK', `Warned ${sender} in ${from} - ${newWarns}/${maxWarns}`)
      }

    } catch (e) {
      logger.error('ANTILINK', 'Observer failed', e.message)
    }
  }
}