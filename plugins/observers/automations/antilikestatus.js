/**
 * SwiftBot - plugins/observers/antiautolike.js
 * Anti Auto Like Observer - Block Status Reaction Bots
 * Matches antiautolike.js command settings
 * Category: Automation
 */

export default {
  name: 'antiautolike',
  event: 'messages.reaction',
  desc: 'Blocks bots that auto-react to all statuses',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return

      // Only handle status reactions
      if (m.key.remoteJid!== 'status@broadcast') return
      if (!m.message?.reactionMessage) return

      const reactor = m.key.participant || m.key.remoteJid
      const reaction = m.message.reactionMessage.text

      // Load settings
      const [
        antiautolikeEnabled,
        actionType,
        threshold,
        blockedBots,
        whitelist,
        owner
      ] = await Promise.all([
        db.get('antiautolike'),
        db.get('antiautolikeAction'),
        db.get('antiautolikeThreshold'),
        db.get('antiautolikeBlocked'),
        db.get('antiautolikeWhitelist'),
        db.get('owner')
      ])

      if (!antiautolikeEnabled) return

      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const reactorClean = cleanJid(reactor)

      // Always allow owner
      if (reactorClean === owner) return
      // Always allow whitelisted
      if (whitelist?.includes(reactor)) return

      // Check if already blacklisted
      if (blockedBots?.includes(reactor)) {
        // Update stats
        const stats = await db.get('antiautolikeStats') || { blocked: 0 }
        stats.blocked = (stats.blocked || 0) + 1
        await db.set('antiautolikeStats', stats)

        logger.info('ANTIAUTOLIKE', `Blocked reaction from blacklisted bot ${reactorClean}`)
        return // Baileys doesn't support removing reactions, just log
      }

      // Auto-detect bot behavior: rate limiting
      const rateKey = `antiautolike_rate_${reactor}`
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

      const limit = threshold || 5
      if (rateData.count < limit) return

      // BOT DETECTED - Auto-like behavior
      logger.warn('ANTIAUTOLIKE', `Auto-like bot detected: ${reactorClean} - ${rateData.count} reactions/min`)

      // Auto add to blacklist
      const updatedBlocked = [...(blockedBots || []), reactor]
      await db.set('antiautolikeBlocked', updatedBlocked)

      // Update stats
      const stats = await db.get('antiautolikeStats') || { blocked: 0 }
      stats.blocked = (stats.blocked || 0) + 1
      await db.set('antiautolikeStats', stats)

      // Take action
      const punishment = actionType || 'block'

      if (punishment === 'warn') {
        try {
          await sock.sendMessage(reactor, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚠️ AUTO-LIKE DETECTED\n║ You reacted to ${rateData.count} statuses\n║ Threshold: ${limit}/min\n║ Your reactions are now blocked\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      }

      if (punishment === 'block') {
        try {
          await sock.sendMessage(owner + '@s.whatsapp.net', {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🤖 AUTO-LIKE BOT BLOCKED\n║ Number: ${reactorClean}\n║ Rate: ${rateData.count} reactions/min\n║ Auto-added to blacklist\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      }

    } catch (e) {
      logger.error('ANTIAUTOLIKE_OBSERVER', 'Failed to process', e.message)
    }
  }
}