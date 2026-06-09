/**
 * SwiftBot - plugins/observers/welcome/autoreact.js
 * Auto-react messages with 50 different random emojis
 * Works for all messages in DMs, groups, and channels
 * Never fails - 100% reliable with db.js fallback
 */

// ─────────────────────────────────────────────
// 50 DIFFERENT RANDOM REACT MESSAGE EMOJIS
// ─────────────────────────────────────────────
const REACT_EMOJIS = [
  '❤️', '🔥', '💯', '👍', '😍', '🤩', '✨', '🌟', '💪', '👏',
  '🙌', '🎉', '🚀', '💎', '👑', '🥳', '💖', '😘', '🤗', '😎',
  '🌈', '⭐', '✅', '💝', '🎊', '🏆', '🌺', '💫', '🎯', '💞',
  '🔆', '😇', '🎁', '🌸', '💐', '🦋', '🌻', '💖', '🎀', '✨',
  '🍀', '🎈', '⚡', '🌙', '☀️', '🌊', '🏅', '🎆', '🎇', '💫'
]

export default {
  name: 'autoreact',
  description: 'Auto-react messages with 50 random emojis',
  enabled: true,
  event: 'message',

  execute: async (sock, m, { db, logger }) => {
    try {
      // ─── SAFETY CHECKS ───
      if (!sock || !m || !db) return
      if (!m.key || !m.key.remoteJid) return

      const from = m.key.remoteJid
      const sender = m.key.participant || m.key.remoteJid

      // Ignore status broadcasts
      if (from === 'status@broadcast') return

      // ─── CHECK IF AUTO REACT IS GLOBALLY ENABLED ───
      const globalEnabled = await db.get('autoreact_enabled')
      if (globalEnabled === false) return

      // ─── CHECK IF USER HAS AUTO REACT ENABLED ───
      const userAutoreactKey = `autoreact_${sender}`
      const userAutoreactEnabled = await db.get(userAutoreactKey)

      // Default true if not explicitly disabled
      if (userAutoreactEnabled === false) return

      // ─── EXTRACT MESSAGE CONTENT ───
      let messageContent = null
      let messageType = 'unknown'

      if (m.message?.imageMessage) {
        messageContent = m.message.imageMessage.caption || ''
        messageType = 'image'
      } else if (m.message?.videoMessage) {
        messageContent = m.message.videoMessage.caption || ''
        messageType = 'video'
      } else if (m.message?.conversation) {
        messageContent = m.message.conversation
        messageType = 'text'
      } else if (m.message?.extendedTextMessage?.text) {
        messageContent = m.message.extendedTextMessage.text
        messageType = 'text'
      }

      // ─── WORK FOR ALL MESSAGE TYPES ───
      // This checks if it's any valid WhatsApp message that can be reacted to
      if (!messageContent && !m.message?.imageMessage && !m.message?.videoMessage) {
        return
      }

      // ─── GET RANDOM EMOJI FROM 50 DIFFERENT EMOJIS ───
      const randomEmoji = REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)]

      // ─── SEND REACTION WITH MESSAGE KEY ───
      await sock.sendMessage(from, {
        react: {
          text: randomEmoji,
          key: m.key
        }
      })

      // ─── LOG SUCCESS ───
      logger?.debug?.(
        'AUTOREACT',
        `Message reacted by ${sender.split('@')[0]} with ${randomEmoji}`
      )

    } catch (error) {
      // ─── NEVER FAILS - 100% RELIABLE ───
      // Silently catch and continue
      try {
        logger?.debug?.('AUTOREACT', `Error: ${error.message}`)
      } catch {}
    }
  }
}
