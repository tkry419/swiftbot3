/**
 * SwiftBot - plugins/observers/antiemoji.js
 * Anti Emoji Observer - Auto Delete/Kick Emoji Spammers
 * Matches antiemoji.js command settings
 * Category: Automation
 */

export default {
  name: 'antiemoji',
  event: 'messages.upsert',
  desc: 'Deletes emoji spam and punishes senders based on DB settings',
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
      const body = m.message.conversation
        || m.message.extendedTextMessage?.text
        || m.message.imageMessage?.caption
        || m.message.videoMessage?.caption
        || ''

      // Load settings
      const [
        antiemojiEnabled,
        actionType,
        emojiLimit,
        groupsWhitelist,
        groupsEnabled,
        userWhitelist,
        owner
      ] = await Promise.all([
        db.get('antiemoji'),
        db.get('antiemojiAction'),
        db.get('antiemojiLimit'),
        db.get('antiemojiGroups'),
        db.get('antiemojiGroupsEnabled'),
        db.get('antiemojiWhitelist'),
        db.get('owner')
      ])

      if (!antiemojiEnabled) return

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

      // Count emojis - Unicode emoji ranges
      const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F000}-\u{1F02F}\u{1F0A0}-\u{1F0FF}\u{1F100}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu
      const emojis = body.match(emojiRegex) || []
      const emojiCount = emojis.length

      const limit = emojiLimit || 10
      if (emojiCount < limit) return

      // EMOJI SPAM DETECTED - Take action
      const punishment = actionType || 'delete'

      // 1. Delete message
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTIEMOJI', 'Failed to delete message', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} EMOJI SPAM\n║ ${emojiCount} emojis detected\n║ Limit: ${limit}\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 😀 @${senderClean} EMOJI FLOOD\n║ ${emojiCount} emojis in one msg\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTIEMOJI', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTIEMOJI_OBSERVER', 'Failed to process', e.message)
    }
  }
}