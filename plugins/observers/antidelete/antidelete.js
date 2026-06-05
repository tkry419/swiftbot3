/**
 * SwiftBot - plugins/observers/antidelete/antidelete.js
 * Anti-delete — Forward deleted messages to owner
 * Auto-save messages to memory
 */

const messageCache = new Map() // Store messages temporarily

export default {
  name: 'antidelete',
  event: 'messages.upsert',

  execute: async (sock, m, { db, box, fonts, logger }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith('@g.us')

    // Check if antidelete enabled
    const enabled = isGroup?
      await db.getGroupKey(from, 'antiDelete') :
      await db.get('antiDelete')

    if (!enabled) {
      // Still cache message for future use
      if (m.message) messageCache.set(m.key.id, { m, timestamp: Date.now() })
      return
    }

    // Cache incoming messages
    if (m.message &&!m.message.protocolMessage) {
      messageCache.set(m.key.id, { m, timestamp: Date.now() })

      // Clean old cache — keep only 1 hour
      const hourAgo = Date.now() - 3600000
      for (const [id, data] of messageCache) {
        if (data.timestamp < hourAgo) messageCache.delete(id)
      }
      return
    }

    // Check if this is a delete
    if (m.message?.protocolMessage?.type === 0) {
      const deletedId = m.message.protocolMessage.key.id
      const cached = messageCache.get(deletedId)

      if (!cached) return

      const deletedMsg = cached.m
      const deleter = m.key.participant || m.key.remoteJid
      const owner = await db.get('owner')
      const ownerJid = `${owner}@s.whatsapp.net`

      // Get deleted content
      const type = Object.keys(deletedMsg.message)[0]
      let content = ''

      if (type === 'conversation') {
        content = deletedMsg.message.conversation
      } else if (type === 'extendedTextMessage') {
        content = deletedMsg.message.extendedTextMessage.text
      } else if (type === 'imageMessage') {
        content = deletedMsg.message.imageMessage.caption || '[Image]'
      } else if (type === 'videoMessage') {
        content = deletedMsg.message.videoMessage.caption || '[Video]'
      } else {
        content = `[${type}]`
      }

      // Forward to owner
      const alert = await box.alert(
        'ANTI-DELETE TRIGGERED',
        `Deleted by: @${deleter.split('@')[0]}\n` +
        `Group: ${isGroup? (await sock.groupMetadata(from)).subject : 'DM'}\n` +
        `From: @${sender.split('@')[0]}\n\n` +
        `${fonts.bold('Content:')}\n${content}`
      )

      await sock.sendMessage(ownerJid, {
        text: alert,
        mentions: [deleter, sender]
      })

      logger.warn('ANTIDELETE', 'Deleted message recovered', { deleter, from })
    }
  }
}