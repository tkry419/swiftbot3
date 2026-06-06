/**
 * SwiftBot - plugins/observers/antibadwords.js
 * Anti Bad Words Observer - Auto Delete/Kick
 * Matches antibadwords.js command settings
 * Category: Automation
 */

export default {
  name: 'antibadwords',
  event: 'messages.upsert',
  desc: 'Deletes bad words and punishes senders based on DB settings',
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

      if (!body) return

      // Load settings
      const [
        antibadEnabled,
        actionType,
        groupsWhitelist,
        groupsEnabled,
        userWhitelist,
        wordlist,
        owner
      ] = await Promise.all([
        db.get('antibadwords'),
        db.get('antibadwordsAction'),
        db.get('antibadwordsGroups'),
        db.get('antibadwordsGroupsEnabled'),
        db.get('antibadwordsWhitelist'),
        db.get('antibadwordsList'),
        db.get('owner')
      ])

      if (!antibadEnabled) return
      if (!wordlist || wordlist.length === 0) return

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

      // Check for bad words - case insensitive, whole word match
      const messageLower = body.toLowerCase()
      const foundWord = wordlist.find(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i')
        return regex.test(messageLower)
      })

      if (!foundWord) return

      // Bad word detected - take action
      const punishment = actionType || 'delete'

      // 1. Delete message
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTIBADWORDS', 'Failed to delete message', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} BAD WORD\n║ Word: ${foundWord}\n║ No insults allowed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🤬 @${senderClean} USED BAD WORD\n║ Word: ${foundWord}\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTIBADWORDS', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTIBADWORDS_OBSERVER', 'Failed to process', e.message)
    }
  }
}