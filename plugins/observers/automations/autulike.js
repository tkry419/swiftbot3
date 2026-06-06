/**
 * SwiftBot - plugins/observers/autolikestatus.js
 * Observer: Auto-view and auto-like WhatsApp statuses
 * - Views status silently
 * - Reacts with random emoji from 50-key pool
 * - Contacts-only filter support
 * - Per-type toggle (image / video / text)
 * - All settings from DB — no restart needed
 */

// ─────────────────────────────────────────────
// 50 REACT KEYS — Same pool as router.js
// ─────────────────────────────────────────────
const REACT_KEYS = [
  '❤️','🔥','💯','👍','😂','😍','🤔','👏','💀','⚡',
  '✨','🌟','🎯','🚀','💎','👑','🌈','🎉','💪','🙏',
  '😎','🥳','🤩','😇','🤗','😘','🤫','🤐','🤑','🤠',
  '👻','👽','🤖','😺','🐶','🦁','🐯','🦄','🐸','🍕',
  '🍔','🍟','🌮','🍩','🍪','🍭','🍯','🧃','☕','🥰'
]

export default {
  name: 'autolikestatus',
  desc: 'Auto-view and auto-like WhatsApp statuses',
  event: 'messages.upsert', // Listens to incoming messages (status updates come here)
  enabled: true,

  execute: async (sock, update, { db, logger }) => {
    try {
      // ─── CHECK IF FEATURE IS ON ──────────────
      const enabled = await db.get('autolikestatusEnabled')
      if (!enabled) return

      const messages = update?.messages
      if (!Array.isArray(messages) || messages.length === 0) return

      for (const m of messages) {
        try {
          // ─── ONLY HANDLE STATUS BROADCASTS ──────
          const from = m.key?.remoteJid
          if (from !== 'status@broadcast') continue

          // ─── SKIP OWN STATUSES ───────────────────
          if (m.key?.fromMe) continue

          // ─── GET POSTER JID ──────────────────────
          // Status poster is in key.participant or key.remoteJid
          const posterJid = m.key?.participant || from
          if (!posterJid) continue

          // ─── CONTACTS-ONLY FILTER ────────────────
          const contactsOnly = await db.get('autolikestatusContactsOnly')
          if (contactsOnly) {
            // Check if poster is in contacts via sock
            try {
              const contact = await sock.onWhatsApp(posterJid.split('@')[0])
              if (!contact || contact.length === 0) continue
            } catch {
              // If we can't verify, skip to be safe
              continue
            }
          }

          // ─── DETECT STATUS TYPE ──────────────────
          const msgType = Object.keys(m.message || {})[0]

          const isImage = msgType === 'imageMessage'
          const isVideo = msgType === 'videoMessage'
          const isText  = msgType === 'conversation'
            || msgType === 'extendedTextMessage'

          // ─── PER-TYPE TOGGLE CHECK ───────────────
          const [likeImages, likeVideos, likeTexts] = await Promise.all([
            db.get('autolikestatusImages'),
            db.get('autolikestatusVideos'),
            db.get('autolikestatusTexts')
          ])

          const shouldLike =
            (isImage && likeImages !== false) ||
            (isVideo && likeVideos !== false) ||
            (isText  && likeTexts  !== false)

          if (!shouldLike) continue

          // ─── PICK RANDOM EMOJI ───────────────────
          const customEmojis = await db.get('autolikestatusEmojis')
          const emojiPool = (Array.isArray(customEmojis) && customEmojis.length > 0)
            ? customEmojis
            : REACT_KEYS

          const emoji = emojiPool[Math.floor(Math.random() * emojiPool.length)]

          // ─── STEP 1: VIEW STATUS ─────────────────
          // Send read receipt to status@broadcast with the message key
          try {
            await sock.readMessages([m.key])
            logger.info?.('AUTOLIKE', `Viewed status from ${posterJid.split('@')[0]}`)
          } catch (e) {
            logger.error?.('AUTOLIKE', 'View failed', e.message)
          }

          // ─── SMALL DELAY — Anti-ban (300-800ms) ─
          await new Promise(r => setTimeout(r, 300 + Math.floor(Math.random() * 500)))

          // ─── STEP 2: REACT / LIKE STATUS ─────────
          // WhatsApp status likes = react on the status message
          try {
            await sock.sendMessage('status@broadcast', {
              react: {
                text: emoji,
                key: m.key
              }
            })
            logger.info?.('AUTOLIKE', `Liked status from ${posterJid.split('@')[0]} with ${emoji}`)
          } catch (e) {
            logger.error?.('AUTOLIKE', 'Like failed', e.message)
          }

        } catch (innerErr) {
          logger.error?.('AUTOLIKE', 'Per-message error', innerErr.message)
        }
      }

    } catch (e) {
      logger.error?.('AUTOLIKE', 'Observer crashed', e.message)
    }
  }
}
