/**
 * SwiftBot - plugins/observers/automations/autoread.js
 * AutoRead System - Mark messages as read automatically
 * Scope: global/group/dm with custom message type filters - vs Bot
 */

export default {
  name: 'autoread',
  event: 'messages.upsert',
  desc: 'Auto mark messages as read',
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
        readAllTypes,
        readTypes,
        readStickers,
        readImages,
        readVideos,
        readAudios,
        readDocuments,
        readTexts
      ] = await Promise.all([
        db.get('autoreadGlobalEnabled'),
        isGroup? db.getGroupKey(from, 'autoreadEnabled') : null,
        isDM? db.get('autoreadDmEnabled') : null,
        db.get('autoreadAllTypes'),
        db.get('autoreadTypes'),
        db.get('autoreadStickers'),
        db.get('autoreadImages'),
        db.get('autoreadVideos'),
        db.get('autoreadAudios'),
        db.get('autoreadDocuments'),
        db.get('autoreadTexts')
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
      const allTypesEnabled = readAllTypes!== false // default true
      if (!allTypesEnabled) {
        if (type === 'stickerMessage' && readStickers === false) return
        if (type === 'imageMessage' && readImages === false) return
        if (type === 'videoMessage' && readVideos === false) return
        if ((type === 'audioMessage' || type === 'documentWithCaptionMessage') && readAudios === false) return
        if (type === 'documentMessage' && readDocuments === false) return
        if ((type === 'conversation' || type === 'extendedTextMessage') && readTexts === false) return

        const allowedTypes = readTypes || []
        if (allowedTypes.length > 0 &&!allowedTypes.includes(type)) return
      }

      // Mark as read
      await sock.readMessages([m.key])
      logger.info('AUTOREAD', `Marked ${type} as read in ${isGroup? 'group' : 'DM'}`)

    } catch (e) {
      logger.error('AUTOREAD', 'Observer failed', e.message)
    }
  }
}