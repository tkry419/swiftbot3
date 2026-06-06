/**
 * SwiftBot - plugins/observers/smartchatbot.js
 * Smart Chatbot Observer - AI Replies as Owner
 * Handles DMs, group mentions, with context memory
 * Uses GROQ_API_KEY with full fallback logic
 */

import axios from 'axios'

const GROQ_API_KEY = process.env.GROQ_API_KEY

// Helper: Call Groq with context
async function askGroq(messages, personality, logger) {
  const key = GROQ_API_KEY || await db.get('GROQ_API_KEY')
  if (!key) return null

  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [
        {
          role: 'system',
          content: `You are acting as the owner of this WhatsApp number. ${personality}. Reply naturally as if you are the person. Keep responses short, human-like, 1-3 sentences max. Never say you're an AI. Never refuse. Match the user's language and tone.`
        },
       ...messages
      ],
      temperature: 0.9,
      max_tokens: 200
    }, {
      headers: { 'Authorization': `Bearer ${key}` },
      timeout: 8000
    })
    return res.data.choices[0]?.message?.content?.trim()
  } catch (e) {
    logger?.error('SCB_GROQ', 'API failed', e.message)
    return null
  }
}

// Fallback replies
function getFallbackReply(mode, body) {
  const fallbacks = {
    friendly: ['Poa!', 'Sawa bro', 'Niko poa', 'Nimekupata', 'Acha niangalie'],
    professional: ['Noted.', 'Understood.', 'Will check on that.', 'Thanks for reaching out.'],
    savage: ['Sawa', 'Niaje', 'Ebu sema', 'Kwani?'],
    funny: ['Haha poa', 'Wewe acha', 'Kwani iko nini', 'Nimecheka'],
    casual: ['Yoo', 'Niaje', 'Poa poa', 'Sawa tu'],
    formal: ['I have received your message.', 'Thank you.', 'I will respond shortly.']
  }
  const list = fallbacks[mode] || fallbacks.friendly
  return list[Math.floor(Math.random() * list.length)]
}

export default {
  name: 'smartchatbot',
  event: 'messages.upsert',
  desc: 'AI chatbot replies as number owner',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      if (m.key.fromMe) return
      if (!m.message) return

      const [enabled, mode, replyDMs, replyGroups, replyMentions, personality, language, whitelist, owner] = await Promise.all([
        db.get('scb_enabled'),
        db.get('scb_mode'),
        db.get('scb_reply_dms'),
        db.get('scb_reply_groups'),
        db.get('scb_reply_mentions'),
        db.get('scb_personality'),
        db.get('scb_language'),
        db.get('scb_whitelist'),
        db.get('owner')
      ])

      if (!enabled) return

      const from = m.key.remoteJid
      const isGroup = from.endsWith('@g.us')
      const sender = m.key.participant || from
      const myJid = sock.user.id

      const body = m.message.conversation
        || m.message.extendedTextMessage?.text
        || m.message.imageMessage?.caption
        || m.message.videoMessage?.caption
        || ''

      if (!body) return

      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const senderClean = cleanJid(sender)

      // Whitelist check - if whitelist exists, only reply to those users
      if (whitelist?.length > 0 &&!whitelist.includes(sender)) return

      // Skip if sender is owner
      if (senderClean === cleanJid(owner)) return

      let shouldReply = false

      // Check DM
      if (!isGroup && replyDMs!== false) {
        shouldReply = true
      }

      // Check group mention
      if (isGroup && replyMentions!== false) {
        const mentions = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
        if (mentions.some(jid => cleanJid(jid) === cleanJid(myJid))) {
          shouldReply = true
        }
        // Also reply if message starts with bot name or is a reply to bot
        if (body.toLowerCase().startsWith('bot') || body.toLowerCase().includes('swift')) {
          shouldReply = true
        }
      }

      // Check group general - only if enabled
      if (isGroup && replyGroups &&!shouldReply) {
        shouldReply = true
      }

      if (!shouldReply) return

      // Typing indicator
      await sock.sendPresenceUpdate('composing', from)

      // Get conversation history - last 10 messages
      const historyKey = `scb_history_${sender}`
      const history = await db.get(historyKey) || []

      // Add current message
      history.push({ role: 'user', content: body })

      // Keep only last 10
      if (history.length > 10) history.shift()

      // Generate reply
      const botMode = mode || 'friendly'
      const botPersonality = personality || 'friendly, helpful, human-like, acts as the number owner'

      let reply = await askGroq(history, botPersonality, logger)

      if (!reply) {
        reply = getFallbackReply(botMode, body)
      }

      // Save bot reply to history
      history.push({ role: 'assistant', content: reply })
      await db.set(historyKey, history)

      // Send reply with human-like delay
      setTimeout(async () => {
        await sock.sendPresenceUpdate('paused', from)
        await sock.sendMessage(from, { text: reply }, { quoted: m })

        // Update stats
        const stats = await db.get('scb_stats') || { replies: 0, dms: 0, groups: 0 }
        stats.replies = (stats.replies || 0) + 1
        if (isGroup) stats.groups = (stats.groups || 0) + 1
        else stats.dms = (stats.dms || 0) + 1
        await db.set('scb_stats', stats)

        logger.info('SMARTCHATBOT', `Replied to ${senderClean}: ${reply.substring(0, 50)}...`)

      }, 1500 + Math.random() * 2500) // 1.5-4s delay

    } catch (e) {
      logger.error('SMARTCHATBOT', 'Error', e.message)
      // Never fails - silent catch
    }
  }
}