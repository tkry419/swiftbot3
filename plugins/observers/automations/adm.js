/**
 * SwiftBot - plugins/observers/autosupergroupmanager.js
 * Auto Super Group Manager Observer - Full AI Control
 * Handles: messages, joins, approvals, night mode, link safety, spam/bots
 * Uses GROQ_API_KEY for intelligent decisions
 */

import axios from 'axios'

const GROQ_API_KEY = process.env.GROQ_API_KEY

// Helper: Call Groq AI
async function askGroq(prompt, fallback = '') {
  if (!GROQ_API_KEY) return fallback

  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150
    }, {
      headers: { 'Authorization': `Bearer ${GROQ_API_KEY}` },
      timeout: 5000
    })
    return res.data.choices[0]?.message?.content?.trim() || fallback
  } catch {
    return fallback
  }
}

// Helper: Check if should act in this group
async function shouldAct(db, groupJid) {
  const [enabled, groupsEnabled, groups] = await Promise.all([
    db.get('asgm_enabled'),
    db.get('asgm_groups_enabled'),
    db.get('asgm_groups')
  ])

  if (!enabled) return false
  if (groupsEnabled === false) return false
  if (groups?.length > 0 &&!groups.includes(groupJid)) return false
  return true
}

// Night mode scheduler - runs every minute
let nightModeInterval = null

function startNightModeScheduler(sock, db, logger) {
  if (nightModeInterval) clearInterval(nightModeInterval)

  nightModeInterval = setInterval(async () => {
    try {
      const [enabled, nightMode, nightTime, morningTime] = await Promise.all([
        db.get('asgm_enabled'),
        db.get('asgm_nightmode'),
        db.get('asgm_night_time'),
        db.get('asgm_morning_time')
      ])

      if (!enabled ||!nightMode) return

      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

      const groups = await db.get('asgm_groups_enabled')!== false
       ? (await sock.groupFetchAllParticipating())
        : await db.get('asgm_groups') || []

      for (const groupJid of Object.keys(groups)) {
        if (currentTime === (nightTime || '22:00')) {
          // Close group
          try {
            await sock.groupSettingUpdate(groupJid, 'announcement')
            const msg = await askGroq(
              'Generate a short WhatsApp group night mode message. Group is closing for the night. Keep it friendly, 1-2 lines.',
              '🌙 Good night everyone! Group is now closed. See you tomorrow.'
            )
            await sock.sendMessage(groupJid, { text: msg })
          } catch (e) {
            logger.error('ASGM_NIGHT', 'Failed to close group', e.message)
          }
        }

        if (currentTime === (morningTime || '06:00')) {
          // Open group
          try {
            await sock.groupSettingUpdate(groupJid, 'not_announcement')
            const msg = await askGroq(
              'Generate a short WhatsApp group morning message. Group is now open. Keep it friendly and energetic, 1-2 lines.',
              '☀️ Good morning! Group is now open. Have a great day!'
            )
            await sock.sendMessage(groupJid, { text: msg })
          } catch (e) {
            logger.error('ASGM_MORNING', 'Failed to open group', e.message)
          }
        }
      }
    } catch (e) {
      logger.error('ASGM_SCHEDULER', 'Night mode error', e.message)
    }
  }, 60000) // Check every minute
}

export default [
  {
    name: 'autosupergroupmanager_messages',
    event: 'messages.upsert',
    desc: 'AI message moderation, spam/bot detection, link safety',
    category: 'Automation',
    enabled: true,

    execute: async (sock, m, { db, logger }) => {
      try {
        if (m.key.fromMe) return
        if (!m.message) return

        const from = m.key.remoteJid
        const isGroup = from.endsWith('@g.us')
        if (!isGroup) return

        if (!(await shouldAct(db, from))) return

        const sender = m.key.participant || from
        const body = m.message.conversation
          || m.message.extendedTextMessage?.text
          || m.message.imageMessage?.caption
          || m.message.videoMessage?.caption
          || ''

        const [
          mode, linkFilter, spamDetect, botDetect, owner
        ] = await Promise.all([
          db.get('asgm_mode'),
          db.get('asgm_linkfilter'),
          db.get('asgm_spamdetect'),
          db.get('asgm_botdetect'),
          db.get('owner')
        ])

        const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
        const senderClean = cleanJid(sender)

        // Skip owner and admins
        if (senderClean === owner) return
        try {
          const metadata = await sock.groupMetadata(from)
          const participant = metadata.participants.find(p => cleanJid(p.id) === senderClean)
          if (participant?.admin) return
        } catch {}

        // 1. LINK SAFETY CHECK
        if (linkFilter && body.match(/https?:\/\/|www\.|t\.me\/|wa\.me\//i)) {
          const urlMatch = body.match(/https?:\/\/[^\s]+|www\.[^\s]+|t\.me\/[^\s]+|wa\.me\/[^\s]+/i)
          if (urlMatch) {
            const url = urlMatch[0]
            const decision = await askGroq(
              `Is this URL safe for a WhatsApp group? URL: ${url}. Respond ONLY with: SAFE or DANGEROUS. Consider: phishing, malware, spam, adult content = DANGEROUS.`,
              'SAFE'
            )

            if (decision.includes('DANGEROUS')) {
              await sock.sendMessage(from, { delete: m.key })
              await sock.sendMessage(from, {
                text: `⚠️ @${senderClean} Link removed - flagged as unsafe by AI`,
                mentions: [sender]
              })
              return
            }
          }
        }

        // 2. SPAM DETECTION
        if (spamDetect) {
          const spamKey = `asgm_spam_${sender}`
          const now = Date.now()
          const spamData = await db.get(spamKey) || { count: 0, startTime: now, messages: [] }

          if (now - spamData.startTime > 30000) {
            spamData.count = 1
            spamData.startTime = now
            spamData.messages = [body]
          } else {
            spamData.count++
            spamData.messages.push(body)
          }

          await db.set(spamKey, spamData)

          // Check for spam: 5+ msgs in 30s or repeated text
          if (spamData.count >= 5) {
            const uniqueMsgs = new Set(spamData.messages)
            if (uniqueMsgs.size <= 2) {
              // Spam detected
              await sock.sendMessage(from, { delete: m.key })

              const action = mode === 'strict'? 'kick' : 'warn'
              if (action === 'kick') {
                await sock.sendMessage(from, {
                  text: `🚫 @${senderClean} removed for spam`,
                  mentions: [sender]
                })
                setTimeout(() => sock.groupParticipantsUpdate(from, [sender], 'remove'), 2000)
              } else {
                await sock.sendMessage(from, {
                  text: `⚠️ @${senderClean} Warning: Stop spamming`,
                  mentions: [sender]
                })
              }
              return
            }
          }
        }

        // 3. BOT DETECTION
        if (botDetect) {
          const botPatterns = [
            /^[.!\/][a-z]+/, /Bot$/i, /MD$/i, /╭─|╰─|│/, /\[BOT\]/i
          ]
          const isBot = botPatterns.some(p => p.test(body))

          if (isBot) {
            await sock.sendMessage(from, { delete: m.key })

            if (mode === 'strict') {
              await sock.sendMessage(from, {
                text: `🤖 @${senderClean} Other bots not allowed`,
                mentions: [sender]
              })
              setTimeout(() => sock.groupParticipantsUpdate(from, [sender], 'remove'), 2000)
            }
            return
          }
        }

        // 4. AI TOXICITY CHECK - Smart mode only
        if (mode === 'smart' && body.length > 20) {
          const toxicity = await askGroq(
            `Analyze this message for toxicity/hate/harassment: "${body}". Respond ONLY: CLEAN, WARN, or DELETE.`,
            'CLEAN'
          )

          if (toxicity === 'DELETE') {
            await sock.sendMessage(from, { delete: m.key })
            await sock.sendMessage(from, {
              text: `⚠️ @${senderClean} Message removed by AI moderation`,
              mentions: [sender]
            })
          } else if (toxicity === 'WARN') {
            await sock.sendMessage(from, {
              text: `⚠️ @${senderClean} Please keep it respectful`,
              mentions: [sender]
            })
          }
        }

      } catch (e) {
        logger.error('ASGM_MESSAGES', 'Error', e.message)
      }
    }
  },

  {
    name: 'autosupergroupmanager_participants',
    event: 'group-participants.update',
    desc: 'Auto greet members and auto approve',
    category: 'Automation',
    enabled: true,

    execute: async (sock, update, { db, logger }) => {
      try {
        const { id: groupJid, participants, action } = update
        if (!(await shouldAct(db, groupJid))) return

        const [autoGreet, autoApprove] = await Promise.all([
          db.get('asgm_autogreet'),
          db.get('asgm_autoapprove')
        ])

        // Auto approve join requests
        if (action === 'request' && autoApprove) {
          for (const participant of participants) {
            try {
              await sock.groupRequestParticipantsUpdate(groupJid, [participant], 'approve')
            } catch {}
          }
        }

        // Auto greet new members
        if (action === 'add' && autoGreet) {
          for (const participant of participants) {
            const mention = '@' + participant.split('@')[0]
            const greetMsg = await askGroq(
              `Generate a short, warm WhatsApp group welcome message for new member. Mention them as ${mention}. 1-2 lines, friendly, no emojis unless natural.`,
              `Welcome ${mention}! Glad to have you here.`
            )

            await sock.sendMessage(groupJid, {
              text: greetMsg,
              mentions: [participant]
            })
          }
        }

      } catch (e) {
        logger.error('ASGM_PARTICIPANTS', 'Error', e.message)
      }
    }
  }
]

// Start night mode scheduler on load
export const init = (sock, db, logger) => {
  startNightModeScheduler(sock, db, logger)
  logger.info('ASGM', 'Night mode scheduler started')
}