/**
 * SwiftBot - plugins/observers/automations/autolikestatus.js
 * AutoLikeStatus System - Auto like all WhatsApp status
 * Scope: global/contacts with custom emoji list - vs Bot
 */

export default {
  name: 'autolikestatus',
  event: 'messages.upsert',
  desc: 'Auto like WhatsApp status',
  category: 'automations',
  permission: 'all',

  execute: async (sock, update, { db, logger }) => {
    try {
      const m = update.messages?.[0]
      if (!m?.message || m.key.fromMe) return

      // Only status messages
      if (m.key.remoteJid!== 'status@broadcast') return

      const sender = m.key.participant || m.key.remoteJid

      // Get settings
      const [
        globalEnabled,
        contactsOnly,
        emojiList,
        likeImages,
        likeVideos,
        likeTexts
      ] = await Promise.all([
        db.get('autolikestatusEnabled'),
        db.get('autolikestatusContactsOnly'),
        db.get('autolikestatusEmojis'),
        db.get('autolikestatusImages'),
        db.get('autolikestatusVideos'),
        db.get('autolikestatusTexts')
      ])

      // Check if enabled
      if (!globalEnabled) return

      // Check if contacts only
      if (contactsOnly === true) {
        try {
          const contact = await db.get(`contact_${sender}`)
          if (!contact) return // Skip non-contacts
        } catch {
          return
        }
      }

      // Check message type filters
      const type = Object.keys(m.message)[0]
      const allTypesEnabled = true // default

      if (type === 'imageMessage' && likeImages === false) return
      if (type === 'videoMessage' && likeVideos === false) return
      if ((type === 'conversation' || type === 'extendedTextMessage') && likeTexts === false) return

      // Get emoji list - default status emojis
      const DEFAULT_EMOJIS = ['❤️', '🔥', '👍', '😍', '💯', '🥰', '😂', '🙏', '👏', '💪']
      const emojis = Array.isArray(emojiList) && emojiList.length > 0? emojiList : DEFAULT_EMOJIS
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

      // Send reaction to status
      await sock.sendMessage(m.key.remoteJid, {
        react: { text: randomEmoji, key: m.key }
      })

      logger.info('AUTOLIKESTATUS', `Liked status from ${sender.split('@')[0]} with ${randomEmoji}`)

    } catch (e) {
      logger.error('AUTOLIKESTATUS', 'Observer failed', e.message)
    }
  }
}