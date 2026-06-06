/**
 * SwiftBot - plugins/observers/antiaudio.js
 * Anti Audio Observer - Auto Delete/Kick
 * Matches antiaudio.js command settings
 * Category: Automation
 */

export default {
  name: 'antiaudio',
  event: 'messages.upsert',
  desc: 'Deletes audios and punishes senders based on DB settings',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      if (!isGroup) return

      // Check if message is audio - voice note, music, etc
      if (!m.message.audioMessage &&!m.message.viewOnceMessageV2?.message?.audioMessage) return

      const sender = m.key.participant || from

      // Load settings
      const [
        antiaudioEnabled,
        actionType,
        groupsWhitelist,
        groupsEnabled,
        userWhitelist,
        owner
      ] = await Promise.all([
        db.get('antiaudio'),
        db.get('antiaudioAction'),
        db.get('antiaudioGroups'),
        db.get('antiaudioGroupsEnabled'),
        db.get('antiaudioWhitelist'),
        db.get('owner')
      ])

      if (!antiaudioEnabled) return

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

      // AUDIO DETECTED - Take action
      const punishment = actionType || 'delete'
      const audioMsg = m.message.audioMessage || m.message.viewOnceMessageV2?.message?.audioMessage
      const isVoiceNote = audioMsg?.ptt || false

      // 1. Delete audio
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTIAUDIO', 'Failed to delete audio', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} AUDIO DETECTED\n║ ${isVoiceNote? 'Voice notes' : 'Audios'} not allowed here\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🎵 @${senderClean} SENT AUDIO\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTIAUDIO', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTIAUDIO_OBSERVER', 'Failed to process', e.message)
    }
  }
}