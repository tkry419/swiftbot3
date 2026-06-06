/**
 * SwiftBot - plugins/observers/automations/antibadword.js
 * AntiBadWord System - Auto delete bad words + warn + kick
 * Scope: global/group/dm with custom word list - vs Bot
 */

export default {
  name: 'antibadword',
  event: 'messages.upsert',
  desc: 'Auto delete bad words and warn users',
  category: 'automations',
  permission: 'all',

  execute: async (sock, update, { db, logger }) => {
    try {
      const m = update.messages?.[0]
      if (!m?.message || m.key.fromMe) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      const isDM =!isGroup

      // Get message text
      const body = m.message?.conversation
        || m.message?.extendedTextMessage?.text
        || m.message?.imageMessage?.caption
        || m.message?.videoMessage?.caption
        || ''

      if (!body) return

      // Get settings
      const [
        globalEnabled,
        groupEnabled,
        dmEnabled,
        globalWords,
        groupWords,
        dmWords
      ] = await Promise.all([
        db.get('antibadwordGlobalEnabled'),
        isGroup? db.getGroupKey(from, 'antibadwordEnabled') : null,
        isDM? db.get('antibadwordDmEnabled') : null,
        db.get('antibadwordGlobalList'),
        isGroup? db.getGroupKey(from, 'antibadwordList') : null,
        isDM? db.get('antibadwordDmList') : null
      ])

      // Check if enabled for this scope
      let isEnabled = false
      if (isGroup) {
        isEnabled = groupEnabled === true || (groupEnabled === null && globalEnabled === true)
      } else if (isDM) {
        isEnabled = dmEnabled === true || (dmEnabled === null && globalEnabled === true)
      }

      if (!isEnabled) return

      // Get word list based on scope
      let badWords = []
      if (isGroup) {
        badWords = groupWords || globalWords || []
      } else if (isDM) {
        badWords = dmWords || globalWords || []
      } else {
        badWords = globalWords || []
      }

      if (badWords.length === 0) return

      // Check if message contains bad word
      const lowerBody = body.toLowerCase()
      const foundWord = badWords.find(word => {
        const pattern = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i')
        return pattern.test(lowerBody)
      })

      if (!foundWord) return

      const sender = m.key.participant || from
      const botId = sock.user?.id
      const botClean = botId?.split('@')[0]?.split(':')[0] || ''

      // Don't act on bot or owner
      const owner = await db.get('owner')
      if (sender.includes(botClean) || sender.includes(owner)) return

      // Check if sender is admin - admins bypass
      if (isGroup) {
        try {
          const metadata = await sock.groupMetadata(from)
          const participant = metadata.participants.find(p => p.id === sender)
          const isAdmin = participant?.admin === 'admin' || participant?.admin === 'superadmin'
          if (isAdmin) return
        } catch (e) {
          logger.warn('ANTIBADWORD', 'Failed to check admin', e.message)
        }
      }

      // Delete message
      await sock.sendMessage(from, { delete: m.key })

      // Get warn settings
      const maxWarns = isGroup
       ? await db.getGroupKey(from, 'antibadwordMaxWarns') || await db.get('antibadwordMaxWarns') || 3
        : await db.get('antibadwordDmMaxWarns') || 3

      const warnKey = `antibadword_warns_${from}_${sender}`
      const currentWarns = await db.get(warnKey) || 0
      const newWarns = currentWarns + 1

      await db.set(warnKey, newWarns)

      if (isGroup) {
        const groupMetadata = await sock.groupMetadata(from)
        const groupName = groupMetadata.subject

        if (newWarns >= maxWarns) {
          // Kick user
          try {
            await sock.groupParticipantsUpdate(from, [sender], 'remove')
            await sock.sendMessage(from, {
              text: `🚫 @${sender.split('@')[0]} kicked from ${groupName}\nReason: Bad word "${foundWord}" ${maxWarns}/${maxWarns} times`,
              mentions: [sender]
            })
            await db.set(warnKey, 0) // Reset warns
            logger.warn('ANTIBADWORD', `Kicked ${sender} from ${from} for bad word`)
          } catch (e) {
            await sock.sendMessage(from, {
              text: `⚠️ Cannot kick @${sender.split('@')[0]} - Bot needs admin rights`,
              mentions: [sender]
            })
          }
        } else {
          // Warn user
          await sock.sendMessage(from, {
            text: `⚠️ @${sender.split('@')[0]} Bad word detected!\nWord: "${foundWord}"\nWarning: ${newWarns}/${maxWarns}\n${maxWarns - newWarns} more = kick`,
            mentions: [sender]
          })
          logger.info('ANTIBADWORD', `Warned ${sender} in ${from} - ${newWarns}/${maxWarns}`)
        }
      } else {
        // DM - just warn
        await sock.sendMessage(from, {
          text: `⚠️ Bad word detected!\nWord: "${foundWord}"\nWarning: ${newWarns}/${maxWarns}`
        })
        logger.info('ANTIBADWORD', `Warned ${sender} in DM - ${newWarns}/${maxWarns}`)
      }

    } catch (e) {
      logger.error('ANTIBADWORD', 'Observer failed', e.message)
    }
  }
}