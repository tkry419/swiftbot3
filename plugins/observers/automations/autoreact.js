/**
 * SwiftBot - plugins/observers/automations/autoreact.js
 * AutoReact System - React to all message types
 * Scope: global/group/dm with custom emoji list - vs Bot
 */

export default {
  name: 'autoreact',
  event: 'messages.upsert',
  desc: 'Auto react to messages with custom emojis',
  category: 'automations',
  permission: 'all',

  execute: async (sock, update, { db, logger }) => {
    try {
      const m = update.messages?.[0]
      if (!m?.message || m.key.fromMe) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      const isDM =!isGroup
      const type = Object.keys(m.message)[0]

      // Get settings
      const [
        globalEnabled,
        groupEnabled,
        dmEnabled,
        reactAllTypes,
        reactTypes,
        emojiList,
        reactStickers,
        reactImages,
        reactVideos,
        reactAudios,
        reactDocuments
      ] = await Promise.all([
        db.get('autoreactGlobalEnabled'),
        isGroup? db.getGroupKey(from, 'autoreactEnabled') : null,
        isDM? db.get('autoreactDmEnabled') : null,
        db.get('autoreactAllTypes'),
        db.get('autoreactTypes'),
        db.get('autoreactEmojis'),
        db.get('autoreactStickers'),
        db.get('autoreactImages'),
        db.get('autoreactVideos'),
        db.get('autoreactAudios'),
        db.get('autoreactDocuments')
      ])

      // Check if enabled for this scope
      let isEnabled = false
      if (isGroup) {
        isEnabled = groupEnabled === true || (groupEnabled === null && globalEnabled === true)
      } else if (isDM) {
        isEnabled = dmEnabled === true || (dmEnabled === null && globalEnabled === true)
      }

      if (!isEnabled) return

      // Check message type filters
      const allTypesEnabled = reactAllTypes!== false // default true
      if (!allTypesEnabled) {
        if (type === 'stickerMessage' && reactStickers === false) return
        if (type === 'imageMessage' && reactImages === false) return
        if (type === 'videoMessage' && reactVideos === false) return
        if ((type === 'audioMessage' || type === 'documentWithCaptionMessage') && reactAudios === false) return
        if (type === 'documentMessage' && reactDocuments === false) return

        const allowedTypes = reactTypes || []
        if (allowedTypes.length > 0 &&!allowedTypes.includes(type)) return
      }

      // Get emoji list - default 50 emojis
      const DEFAULT_EMOJIS = [
        '✅','❤️','🔥','💯','👍','😂','😍','🤔','👏','💀',
        '⚡','✨','🌟','🎯','🚀','💎','👑','🌈','🎉','💪',
        '🙏','😎','🥳','🤩','😇','🤗','😘','🤫','🤐','🤑',
        '🤠','👻','👽','🤖','😺','🐶','🦁','🐯','🦄','🐸',
        '🍕','🍔','🍟','🌮','🍩','🍪','🍭','🍯','🧃','☕'
      ]

      const emojis = Array.isArray(emojiList) && emojiList.length > 0? emojiList : DEFAULT_EMOJIS
      const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)]

      // Send reaction
      await sock.sendMessage(from, {
        react: { text: randomEmoji, key: m.key }
      })

      logger.info('AUTOREACT', `Reacted ${randomEmoji} to ${type} in ${isGroup? 'group' : 'DM'}`)

    } catch (e) {
      logger.error('AUTOREACT', 'Observer failed', e.message)
    }
  }
}