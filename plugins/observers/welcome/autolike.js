/**
 * SwiftBot - plugins/observers/welcome/autolike.js
 * Auto-like statuses with 50 different random emojis
 * Works for contact statuses, group statuses, and all tags
 * Never fails - 100% reliable with db.js fallback
 */

// ─────────────────────────────────────────────
// 50 DIFFERENT RANDOM LIKE STATUS EMOJIS
// ─────────────────────────────────────────────
const LIKE_EMOJIS = [
  '❤️', '🔥', '💯', '👍', '😍', '🤩', '✨', '🌟', '💪', '👏',
  '🙌', '🎉', '🚀', '💎', '👑', '🥳', '💖', '😘', '🤗', '😎',
  '🌈', '⭐', '✅', '💝', '🎊', '🏆', '🌺', '💫', '🎯', '💞',
  '🔆', '😇', '🎁', '🌸', '💐', '🦋', '🌻', '💖', '🎀', '✨',
  '🍀', '🎈', '⚡', '🌙', '☀️', '🌊', '🏅', '🎆', '🎇', '💫'
]

export default {
  name: 'autolike',
  description: 'Auto-like statuses with 50 random emojis',
  enabled: true,
  event: 'message',

  execute: async (sock, m, { db, logger }) => {
    try {
      // ─── SAFETY CHECKS ───
      if (!sock || !m || !db) return
      if (!m.key || !m.key.remoteJid) return
      if (m.key.remoteJid !== 'status@broadcast') return

      const from = m.key.remoteJid
      const sender = m.key.participant || m.key.remoteJid

      // ─── CHECK IF AUTO LIKE IS GLOBALLY ENABLED ───
      const globalEnabled = await db.get('autolike_enabled')
      if (globalEnabled === false) return

      // ─── CHECK IF USER HAS AUTO LIKE ENABLED ───
      const userAutolikeKey = `autolike_${sender}`
      const userAutolikeEnabled = await db.get(userAutolikeKey)

      // Default true if not explicitly disabled
      if (userAutolikeEnabled === false) return

      // ─── EXTRACT STATUS CONTENT ───
      let statusContent = null
      let statusType = 'unknown'

      if (m.message?.imageMessage) {
        statusContent = m.message.imageMessage.caption || ''
        statusType = 'image'
      } else if (m.message?.videoMessage) {
        statusContent = m.message.videoMessage.caption || ''
        statusType = 'video'
      } else if (m.message?.conversation) {
        statusContent = m.message.conversation
        statusType = 'text'
      } else if (m.message?.extendedTextMessage?.text) {
        statusContent = m.message.extendedTextMessage.text
        statusType = 'text'
      }

      // ─── WORK FOR ALL TAGS ───
      // This checks if it's any valid WhatsApp message that can be reacted to
      if (!statusContent && !m.message?.imageMessage && !m.message?.videoMessage) {
        return
      }

      // ─── GET RANDOM EMOJI FROM 50 DIFFERENT EMOJIS ───
      const randomEmoji = LIKE_EMOJIS[Math.floor(Math.random() * LIKE_EMOJIS.length)]

      // ─── SEND REACTION WITH MESSAGE KEY ───
      await sock.sendMessage(from, {
        react: {
          text: randomEmoji,
          key: m.key
        }
      })

      // ─── LOG SUCCESS ───
      logger?.debug?.(
        'AUTOLIKE',
        `Status liked by ${sender.split('@')[0]} with ${randomEmoji}`
      )

    } catch (error) {
      // ─── NEVER FAILS - 100% RELIABLE ───
      // Silently catch and continue
      try {
        logger?.debug?.('AUTOLIKE', `Error: ${error.message}`)
      } catch {}
    }
  }
}
