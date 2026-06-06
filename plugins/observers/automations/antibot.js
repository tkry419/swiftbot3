/**
 * SwiftBot - plugins/observers/antibots.js
 * Anti Bots Observer - Auto Delete/Kick Other Bots
 * Matches antibots.js command settings
 * Category: Automation
 */

export default {
  name: 'antibots',
  event: 'messages.upsert',
  desc: 'Deletes messages from other bots and punishes them',
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
        antibotsEnabled,
        actionType,
        groupsWhitelist,
        groupsEnabled,
        botBlacklist,
        botWhitelist,
        owner
      ] = await Promise.all([
        db.get('antibots'),
        db.get('antibotsAction'),
        db.get('antibotsGroups'),
        db.get('antibotsGroupsEnabled'),
        db.get('antibotsList'),
        db.get('antibotsWhitelist'),
        db.get('owner')
      ])

      if (!antibotsEnabled) return

      // Check if group is enabled
      if (groupsEnabled === false) return
      if (groupsWhitelist?.length > 0 &&!groupsWhitelist.includes(from)) return

      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const senderClean = cleanJid(sender)

      // Always allow owner
      if (senderClean === owner) return
      // Always allow whitelisted bots
      if (botWhitelist?.includes(sender)) return

      // Check if sender is admin - admins bypass
      try {
        const metadata = await sock.groupMetadata(from)
        const participant = metadata.participants.find(p => cleanJid(p.id) === senderClean)
        if (participant?.admin) return
      } catch {}

      // Bot detection logic
      let isBot = false

      // 1. Check manual blacklist
      if (botBlacklist?.includes(sender)) {
        isBot = true
      }

      // 2. Auto detect - bot patterns
      if (!isBot) {
        const body = m.message.conversation
          || m.message.extendedTextMessage?.text
          || m.message.imageMessage?.caption
          || m.message.videoMessage?.caption
          || ''

        // Common bot prefixes/patterns
        const botPatterns = [
          /^[.!\/][a-z]+/, // Commands like.menu,!help, /start
          /Bot$/i, // Ends with Bot
          /MD$/i, // Ends with MD
          /Official/i,
          /╭─|╰─|│/, // Box menu chars
          /\[OWNER\]/i,
          /\[BOT\]/i,
          /_Type:/i,
          /_Example:/i
        ]

        isBot = botPatterns.some(pattern => pattern.test(body))

        // Check for bot-like message structures
        if (!isBot && body.length > 100) {
          const lines = body.split('\n').length
          if (lines > 10) isBot = true // Long menu = probably bot
        }
      }

      if (!isBot) return

      // BOT DETECTED - Take action
      const punishment = actionType || 'delete'

      // Auto add to blacklist for future
      if (!botBlacklist?.includes(sender)) {
        const updatedList = [...(botBlacklist || []), sender]
        await db.set('antibotsList', updatedList)
      }

      // 1. Delete bot message
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTIBOTS', 'Failed to delete message', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} BOT DETECTED\n║ Other bots not allowed here\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🤖 @${senderClean} BOT REMOVED\n║ Only this bot allowed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick bot
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTIBOTS', 'Failed to kick bot', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTIBOTS_OBSERVER', 'Failed to process', e.message)
    }
  }
}