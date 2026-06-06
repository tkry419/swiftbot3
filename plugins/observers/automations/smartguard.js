/**
 * SwiftBot - plugins/observers/smartguard.js
 * Smart Guard AI Observer - Ultimate Protection
 * AI decides everything: delete/warn/kick/ban
 * Detects: spam, bots, raids, flood, toxic, links, virus, crash
 * Uses GROQ_API_KEY with full fallback logic
 */

import axios from 'axios'

const GROQ_API_KEY = process.env.GROQ_API_KEY

// Helper: AI Decision Maker
async function aiDecide(message, context, logger) {
  const key = GROQ_API_KEY || await db.get('GROQ_API_KEY')
  if (!key) return null

  try {
    const prompt = `You are SmartGuard AI protecting a WhatsApp group. Analyze this message and context, then decide action.

Message: "${message}"
Context: ${JSON.stringify(context)}

Respond ONLY in JSON format:
{
  "threat": "spam|bot|toxic|raid|flood|link|virus|crash|clean",
  "severity": "low|medium|high|critical",
  "action": "ignore|delete|warn|kick|ban",
  "reason": "short reason"
}

Rules:
- spam: repeated messages, flood, copy-paste
- bot: commands, box chars, [BOT],.menu, other bots
- toxic: hate, harassment, threats, NSFW
- raid: mass joins, similar names, new accounts spam
- flood: many messages fast, mentions all
- link: dangerous URLs, phishing, malware
- virus: suspicious files, apk, exe
- crash: unicode spam, invisible chars, RTL override
- clean: safe message

Be smart. Low false positives.`

    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${key}` },
      timeout: 5000
    })

    const content = res.data.choices[0]?.message?.content?.trim()
    return JSON.parse(content)
  } catch (e) {
    logger?.error('SG_AI', 'Decision failed, using heuristics', e.message)
    return null
  }
}

// Heuristic fallback
function heuristicCheck(body, sender, context) {
  // Bot patterns
  if (/^[.!\/][a-z]+|╭─|╰─|│|\[BOT\]|Bot$|MD$/i.test(body)) {
    return { threat: 'bot', severity: 'high', action: 'kick', reason: 'Bot detected' }
  }

  // Link patterns
  if (/https?:\/\/|www\.|t\.me\/|wa\.me\//i.test(body)) {
    if (/bit\.ly|tinyurl|adf\.ly|shorte\.st/i.test(body)) {
      return { threat: 'link', severity: 'medium', action: 'delete', reason: 'Shortened link' }
    }
  }

  // Flood patterns
  if (context.messageCount >= 5 && context.timeWindow < 10000) {
    return { threat: 'flood', severity: 'high', action: 'warn', reason: 'Message flood' }
  }

  // Crash patterns
  if (/[\u202E\u202D\u200E\u200F\u061C]{3,}|[\uFEFF\u200B\u200C\u200D]{10,}/.test(body)) {
    return { threat: 'crash', severity: 'critical', action: 'kick', reason: 'Crash characters' }
  }

  return { threat: 'clean', severity: 'low', action: 'ignore', reason: '' }
}

// Check if should protect
async function shouldProtect(db, groupJid) {
  const [enabled, groupsEnabled, groups] = await Promise.all([
    db.get('sg_enabled'),
    db.get('sg_groups_enabled'),
    db.get('sg_groups')
  ])

  if (!enabled) return false
  if (groupsEnabled === false) return false
  if (groups?.length > 0 &&!groups.includes(groupJid)) return false
  return true
}

export default {
  name: 'smartguard',
  event: 'messages.upsert',
  desc: 'AI Super Guard - Full autonomous protection',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      if (!isGroup) return

      if (!(await shouldProtect(db, from))) return

      const sender = m.key.participant || from
      const body = m.message.conversation
        || m.message.extendedTextMessage?.text
        || m.message.imageMessage?.caption
        || m.message.videoMessage?.caption
        || m.message.documentMessage?.fileName
        || ''

      const [
        mode, owner, whitelist, botLevel, spamLevel, toxicLevel, raidLevel, linkLevel
      ] = await Promise.all([
        db.get('sg_mode'),
        db.get('owner'),
        db.get('sg_whitelist'),
        db.get('sg_bot_level'),
        db.get('sg_spam_level'),
        db.get('sg_toxic_level'),
        db.get('sg_raid_level'),
        db.get('sg_link_level')
      ])

      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const senderClean = cleanJid(sender)

      // Skip owner and whitelist
      if (senderClean === cleanJid(owner)) return
      if (whitelist?.includes(sender)) return

      // Skip admins
      try {
        const metadata = await sock.groupMetadata(from)
        const participant = metadata.participants.find(p => cleanJid(p.id) === senderClean)
        if (participant?.admin) return
      } catch {}

      // Update stats
      const stats = await db.get('sg_stats') || { scanned: 0 }
      stats.scanned = (stats.scanned || 0) + 1
      await db.set('sg_stats', stats)

      // Get message history for context
      const historyKey = `sg_history_${sender}`
      const now = Date.now()
      const history = await db.get(historyKey) || { count: 0, startTime: now, messages: [] }

      if (now - history.startTime > 30000) {
        history.count = 1
        history.startTime = now
        history.messages = [body]
      } else {
        history.count++
        history.messages.push(body)
      }
      await db.set(historyKey, history)

      const context = {
        messageCount: history.count,
        timeWindow: now - history.startTime,
        mode: mode || 'adaptive',
        groupSize: 0
      }

      try {
        const metadata = await sock.groupMetadata(from)
        context.groupSize = metadata.participants.length
      } catch {}

      // AI Decision or Heuristic
      let decision = await aiDecide(body, context, logger)

      if (!decision) {
        decision = heuristicCheck(body, sender, context)
      }

      // Apply mode modifiers
      if (mode === 'paranoid' && decision.severity === 'medium') {
        decision.severity = 'high'
        if (decision.action === 'warn') decision.action = 'kick'
      }
      if (mode === 'lenient' && decision.severity === 'high') {
        decision.severity = 'medium'
        if (decision.action === 'kick') decision.action = 'warn'
      }

      // Execute action
      if (decision.action === 'ignore' || decision.threat === 'clean') return

      // Update stats
      stats.blocked = (stats.blocked || 0) + 1

      if (decision.action === 'delete') {
        await sock.sendMessage(from, { delete: m.key })
        if (decision.threat === 'link') stats.links = (stats.links || 0) + 1
      }

      if (decision.action === 'warn') {
        await sock.sendMessage(from, { delete: m.key })
        await sock.sendMessage(from, {
          text: `⚠️ @${senderClean} Warning\nReason: ${decision.reason}\nSeverity: ${decision.severity}`,
          mentions: [sender]
        })
        stats.warned = (stats.warned || 0) + 1
      }

      if (decision.action === 'kick') {
        await sock.sendMessage(from, { delete: m.key })
        await sock.sendMessage(from, {
          text: `🚫 @${senderClean} Removed\nReason: ${decision.reason}\nThreat: ${decision.threat}`,
          mentions: [sender]
        })
        setTimeout(() => sock.groupParticipantsUpdate(from, [sender], 'remove'), 2000)
        stats.kicked = (stats.kicked || 0) + 1
      }

      if (decision.action === 'ban') {
        await sock.sendMessage(from, { delete: m.key })
        await sock.sendMessage(from, {
          text: `🔨 @${senderClean} BANNED\nReason: ${decision.reason}\nThreat: ${decision.threat}`,
          mentions: [sender]
        })
        setTimeout(() => sock.groupParticipantsUpdate(from, [sender], 'remove'), 2000)
        stats.kicked = (stats.kicked || 0) + 1

        // Add to ban list
        const banList = await db.get('sg_banlist') || []
        if (!banList.includes(sender)) {
          banList.push(sender)
          await db.set('sg_banlist', banList)
        }
      }

      await db.set('sg_stats', stats)
      logger.warn('SMARTGUARD', `${decision.action.toUpperCase()} - ${decision.threat} from ${senderClean}: ${decision.reason}`)

    } catch (e) {
      logger.error('SMARTGUARD', 'Error', e.message)
      // Never fails - silent catch
    }
  }
}