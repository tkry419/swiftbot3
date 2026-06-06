/**
 * SwiftBot - plugins/observers/antireact.js
 * Anti React Bots Observer - Block Message Reaction Bots
 * Matches antireact.js command settings
 * Category: Automation
 */

export default {
  name: 'antireact',
  event: 'messages.reaction',
  desc: 'Blocks bots that auto-react to group messages',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message?.reactionMessage) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      if (!isGroup) return

      const reactor = m.key.participant || m.key.remoteJid
      const reaction = m.message.reactionMessage.text
      const targetMsgKey = m.message.reactionMessage.key

      // Load settings
      const [
        antireactEnabled,
        actionType,
        threshold,
        groupsWhitelist,
        groupsEnabled,
        blockedBots,
        whitelist,
        owner
      ] = await Promise.all([
        db.get('antireact'),
        db.get('antireactAction'),
        db.get('antireactThreshold'),
        db.get('antireactGroups'),
        db.get('antireactGroupsEnabled'),
        db.get('antireactBlocked'),
        db.get('antireactWhitelist'),
        db.get('owner')
      ])

      if (!antireactEnabled) return

      // Check if group is enabled
      if (groupsEnabled === false) return
      if (groupsWhitelist?.length > 0 &&!groupsWhitelist.includes(from)) return

      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const reactorClean = cleanJid(reactor)

      // Always allow owner
      if (reactorClean === owner) return
      // Always allow whitelisted
      if (whitelist?.includes(reactor)) return

      // Check if sender is admin - admins bypass
      try {
        const metadata = await sock.groupMetadata(from)
        const participant = metadata.participants.find(p => cleanJid(p.id) === reactorClean)
        if (participant?.admin) return
      } catch {}

      // Check if already blacklisted
      if (blockedBots?.includes(reactor)) {
        // Update stats and delete reaction if possible
        const stats = await db.get('antireactStats') || { blocked: 0 }
        stats.blocked = (stats.blocked || 0) + 1
        await db.set('antireactStats', stats)

        // Try to remove reaction - send empty reaction
        try {
          await sock.sendMessage(from, {
            react: { text: '', key: targetMsgKey }
          })
        } catch {}
        return
      }

      // Auto-detect bot behavior: rate limiting
      const rateKey = `antireact_rate_${reactor}`
      const now = Date.now()
      const rateData = await db.get(rateKey) || { count: 0, startTime: now }

      // Reset if more than 1 minute passed
      if (now - rateData.startTime > 60000) {
        rateData.count = 1
        rateData.startTime = now
      } else {
        rateData.count++
      }

      await db.set(rateKey, rateData)

      const limit = threshold || 8
      if (rateData.count < limit) return

      // BOT DETECTED - Auto-react behavior
      logger.warn('ANTIREACT', `Auto-react bot detected: ${reactorClean} - ${rateData.count} reacts/min`)

      // Auto add to blacklist
      const updatedBlocked = [...(blockedBots || []), reactor]
      await db.set('antireactBlocked', updatedBlocked)

      // Update stats
      const stats = await db.get('antireactStats') || { blocked: 0 }
      stats.blocked = (stats.blocked || 0) + 1
      await db.set('antireactStats', stats)

      // Take action
      const punishment = actionType || 'delete'

      // Try to remove reaction
      try {
        await sock.sendMessage(from, {
          react: { text: '', key: targetMsgKey }
        })
      } catch {}

      if (punishment === 'warn') {
        try {
          await sock.sendMessage(from, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ @${reactorClean} AUTO-REACT\n║ ${rateData.count} reactions/min\n║ Threshold: ${limit}/min\n╚━━━━━━━━━━━━━━━━━═❒`,
            mentions: [reactor]
          })
        } catch {}
      }

      if (punishment === 'kick') {
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 👆 @${reactorClean} REACT BOT\n║ ${rateData.count} reactions/min\n║ User will be removed\n╚━━━━━━━━━━━━━━━━━═❒`,
          mentions: [reactor]
        })

        // Kick user
        setTimeout(async () => {
          try {
            await sock.groupParticipantsUpdate(from, [reactor], 'remove')
          } catch (e) {
            logger.error('ANTIREACT', 'Failed to kick user', e.message)
          }
        }, 2000)
      }

    } catch (e) {
      logger.error('ANTIREACT_OBSERVER', 'Failed to process', e.message)
    }
  }
}