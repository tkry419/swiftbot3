/**
 * SwiftBot - plugins/observers/antidelete/antidelete.js
 * Anti-delete — Forward deleted messages anywhere
 * Supports: self DM, number, group, channel, in-place
 * Captures: text, sticker, audio, video, image, viewonce, docs, apk, status
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const messageCache = new Map() // Store messages temporarily

export default {
  name: 'antidelete',
  event: 'messages.upsert',

  execute: async (sock, m, { db, box, fonts, logger }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith('@g.us')
    const isStatus = from === 'status@broadcast'

    // STEP 1: Check if antidelete enabled globally or per-group
    const enabled = isGroup?
      await db.getGroupKey(from, 'antiDelete') :
      await db.get('antiDelete')

    // STEP 2: Cache ALL incoming messages for recovery
    if (m.message &&!m.message.protocolMessage) {
      messageCache.set(m.key.id, {
        m,
        timestamp: Date.now(),
        from,
        isGroup,
        isStatus
      })

      // Clean old cache — keep only 2 hours
      const twoHoursAgo = Date.now() - 7200000
      for (const [id, data] of messageCache) {
        if (data.timestamp < twoHoursAgo) messageCache.delete(id)
      }

      if (!enabled) return
      return
    }

    // STEP 3: Check if this is a manual delete, not 24hr expiry
    if (m.message?.protocolMessage?.type!== 0) return

    // Ignore ephemeral auto-delete — check if message is older than 23hrs
    const msgAge = Date.now() - (m.messageTimestamp * 1000)
    if (msgAge > 82800000) return // 23hrs = auto expire, skip

    const deletedId = m.message.protocolMessage.key.id
    const cached = messageCache.get(deletedId)

    if (!cached) return

    const deletedMsg = cached.m
    const deleter = m.key.participant || m.key.remoteJid
    const originalFrom = cached.from

    // STEP 4: Get destination from settings
    const [destType, destTarget, owner] = await Promise.all([
      db.get('antiDeleteDest'), // self | number | group | channel | inplace
      db.get('antiDeleteTarget'), // jid or number
      db.get('owner')
    ])

    const dest = destType || 'self' // default self DM
    const ownerJid = `${owner}@s.whatsapp.net`

    let targetJid = ownerJid
    if (dest === 'number' && destTarget) {
      targetJid = `${destTarget}@s.whatsapp.net`
    } else if (dest === 'group' && destTarget) {
      targetJid = destTarget
    } else if (dest === 'channel' && destTarget) {
      targetJid = destTarget
    } else if (dest === 'inplace') {
      targetJid = originalFrom
    }

    // STEP 5: Extract content + media
    const type = Object.keys(deletedMsg.message)[0]
    let content = ''
    let mediaBuffer = null
    let mimetype = null
    let fileName = null

    try {
      if (type === 'conversation') {
        content = deletedMsg.message.conversation
      } else if (type === 'extendedTextMessage') {
        content = deletedMsg.message.extendedTextMessage.text
      } else if (type === 'imageMessage') {
        const msg = deletedMsg.message.imageMessage
        content = msg.caption || '[Image]'
        mimetype = msg.mimetype
        const stream = await downloadContentFromMessage(msg, 'image')
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        mediaBuffer = buffer
      } else if (type === 'videoMessage') {
        const msg = deletedMsg.message.videoMessage
        content = msg.caption || '[Video]'
        mimetype = msg.mimetype
        const stream = await downloadContentFromMessage(msg, 'video')
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        mediaBuffer = buffer
      } else if (type === 'audioMessage') {
        const msg = deletedMsg.message.audioMessage
        content = '[Audio]'
        mimetype = msg.mimetype
        const stream = await downloadContentFromMessage(msg, 'audio')
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        mediaBuffer = buffer
      } else if (type === 'stickerMessage') {
        const msg = deletedMsg.message.stickerMessage
        content = '[Sticker]'
        mimetype = msg.mimetype
        const stream = await downloadContentFromMessage(msg, 'sticker')
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        mediaBuffer = buffer
      } else if (type === 'documentMessage') {
        const msg = deletedMsg.message.documentMessage
        content = msg.fileName || '[Document]'
        mimetype = msg.mimetype
        fileName = msg.fileName
        const stream = await downloadContentFromMessage(msg, 'document')
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        mediaBuffer = buffer
      } else if (type === 'viewOnceMessageV2' || type === 'viewOnceMessage') {
        // Handle viewonce
        const voMsg = deletedMsg.message[type].message
        const voType = Object.keys(voMsg)[0]
        const msg = voMsg[voType]
        content = `[ViewOnce ${voType.replace('Message', '')}] ${msg.caption || ''}`
        mimetype = msg.mimetype
        const stream = await downloadContentFromMessage(msg, voType.replace('Message', ''))
        let buffer = Buffer.from([])
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])
        mediaBuffer = buffer
      } else {
        content = `[${type}]`
      }
    } catch (e) {
      logger.error('ANTIDELETE', 'Media download failed', e.message)
      content += '\n[Media download failed]'
    }

    // STEP 6: Build alert message
    const groupName = cached.isGroup? (await sock.groupMetadata(originalFrom).catch(() => null))?.subject || 'Group' : 'DM'
    const location = cached.isStatus? 'Status' : groupName

    const alertHeader = await box.alert(
      'ANTI-DELETE TRIGGERED',
      `Deleted by: @${deleter.split('@')[0]}\n` +
      `Location: ${location}\n` +
      `Original sender: @${sender.split('@')[0]}\n` +
      `Type: ${fonts.bold(type.replace('Message', ''))}\n\n` +
      `${fonts.bold('Content:')}\n${content}`
    )

    // STEP 7: Send to target destination
    try {
      // Send header first
      await sock.sendMessage(targetJid, {
        text: alertHeader,
        mentions: [deleter, sender]
      })

      // Send media if exists
      if (mediaBuffer) {
        if (type === 'imageMessage' || (type === 'viewOnceMessageV2' && deletedMsg.message[type].message.imageMessage)) {
          await sock.sendMessage(targetJid, { image: mediaBuffer, caption: fonts.smallCaps('Recovered Image') })
        } else if (type === 'videoMessage' || (type === 'viewOnceMessageV2' && deletedMsg.message[type].message.videoMessage)) {
          await sock.sendMessage(targetJid, { video: mediaBuffer, caption: fonts.smallCaps('Recovered Video') })
        } else if (type === 'audioMessage') {
          await sock.sendMessage(targetJid, { audio: mediaBuffer, mimetype: mimetype || 'audio/mpeg' })
        } else if (type === 'stickerMessage') {
          await sock.sendMessage(targetJid, { sticker: mediaBuffer })
        } else if (type === 'documentMessage') {
          await sock.sendMessage(targetJid, {
            document: mediaBuffer,
            mimetype: mimetype || 'application/octet-stream',
            fileName: fileName || 'document'
          })
        }
      }

      logger.warn('ANTIDELETE', 'Deleted message recovered', { deleter, from: originalFrom, dest: targetJid })
    } catch (e) {
      logger.error('ANTIDELETE', 'Failed to send recovery', e.message)
    }
  }
}