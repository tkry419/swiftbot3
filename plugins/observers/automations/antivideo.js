/**
 * SwiftBot - plugins/observers/antivideo.js
 * Anti Video Observer - Auto Delete/Kick
 * Matches antivideo.js command settings
 * Category: Automation
 */

export default {
  name: 'antivideo',
  event: 'messages.upsert',
  desc: 'Deletes videos and punishes senders based on DB settings',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      if (!isGroup) return

      // Check if message is video
      if (!m.message.videoMessage &&!m.message.viewOnceMessageV2?.message?.videoMessage) return

      const sender = m.key.participant || from

      // Load settings
      const [
        antivideoEnabled,
        actionType,
        groupsWhitelist,
        groupsEnabled,
        userWhitelist,
        owner
      ] = await Promise.all([
        db.get('antivideo'),
        db.get('antivideoAction'),
        db.get('antivideoGroups'),
        db.get('antivideoGroupsEnabled'),
        db.get('antivideoWhitelist'),
        db.get('owner')
      ])

      if (!antivideoEnabled) return

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

      // VIDEO DETECTED - Take action
      const punishment = actionType || 'delete'

      // 1. Delete video
      try {
        await sock.sendMessage(from, { delete: m.key })
      } catch (e) {
        logger.error('ANTIVIDEO', 'Failed to delete video', e.message)
      }

      // 2. Take punishment action
      if (punishment === 'warn') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${senderClean} VIDEO DETECTED\n║ Videos not allowed here\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🎥 @${senderClean} SENT VIDEO\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [sender]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
          } catch (e) {
            logger.error('ANTIVIDEO', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTIVIDEO_OBSERVER', 'Failed to process', e.message)
    }
  }
}