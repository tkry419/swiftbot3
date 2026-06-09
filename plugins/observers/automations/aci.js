/**
 * SwiftBot - plugins/observers/automations/autochannelai.js
 * Auto Channel AI - User Customizable AI Channel Manager
 * All features depend on aci_ db keys. Learning mode, pics, polls, auto-post
 * Uses GROQ_API_KEY - llama-3.1-8b-instant
 */

import axios from 'axios'

const GROQ_MODEL = 'llama-3.1-8b-instant'
const DEFAULT_INTERVAL = 300000 // 5 min
const DEFAULT_FOOTER = '«🚀 SwiftBot — Create Your Own WhatsApp Bot Experience 💖»'

// Helper: Call Groq with ACI key + fallback
async function askGroqACI(prompt, db, logger) {
  const [groqKey, fallbackPrompt] = await Promise.all([
    db.get('aci_groq_key') || process.env.GROQ_API_KEY,
    db.get('aci_fallback_prompt')
  ])

  if (!groqKey) return fallbackPrompt || 'ACI AI offline - set aci_groq_key'

  try {
    const systemPrompt = await db.get('aci_final_prompt') || await db.get('aci_system_prompt') || 'You are AutoChannel AI. Be helpful, hype, human-like.'

    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 600
    }, {
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'User-Agent': 'Mozilla/5.0 SwiftBot/1.0'
      },
      timeout: 12000
    })
    return res.data.choices[0]?.message?.content?.trim() || fallbackPrompt
  } catch (e) {
    logger?.error('ACI_GROQ', `API ${e.response?.status || 'failed'}`, e.message)
    // 403 Auto Retry with different UA
    if (e.response?.status === 403) {
      try {
        const retry = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
          model: GROQ_MODEL,
          messages: [{ role: 'user', content: prompt }]
        }, {
          headers: { 'Authorization': `Bearer ${groqKey}`, 'User-Agent': 'Chrome/120' },
          timeout: 10000
        })
        return retry.data.choices[0]?.message?.content?.trim() || fallbackPrompt
      } catch {}
    }
    return fallbackPrompt || 'ACI fallback active'
  }
}

// Pick random picture from aci_picture_links
async function getAciPicture(db) {
  const pics = await db.get('aci_picture_links')
  if (!pics ||!Array.isArray(pics) || pics.length === 0) return null
  return pics[Math.floor(Math.random() * pics.length)]
}

// Autonomous posting interval
let aciPostInterval = null

function startACIPosting(sock, db, logger) {
  if (aciPostInterval) clearInterval(aciPostInterval)

  aciPostInterval = setInterval(async () => {
    try {
      const [enabled, interval, channelJid, lastPost, postType, footer] = await Promise.all([
        db.get('aci_enabled'),
        db.get('aci_interval'),
        db.get('aci_channel_jid'),
        db.get('aci_last_post'),
        db.get('aci_post_type'),
        db.get('aci_footer')
      ])

      if (!enabled || enabled === 'false') return
      if (!channelJid) return

      const now = Date.now()
      const waitTime = parseInt(interval) || DEFAULT_INTERVAL
      if (lastPost && (now - lastPost) < waitTime) return

      // Decide content type: poll, tutorial, update, or custom
      const types = ['tutorial', 'update', 'poll', 'custom']
      const type = postType || types[Math.floor(Math.random() * types.length)]

      const customPrompt = await db.get('aci_custom_prompt')
      const prompt = type === 'custom' && customPrompt
       ? customPrompt
        : type === 'poll'
       ? 'Generate an engaging poll for my channel. Include 3-4 emoji options. Topic: tech/bots/features'
        : type === 'tutorial'
       ? 'Generate a long exciting tutorial post about my bot/service. Use emojis, steps with 1️⃣2️⃣3️⃣, 8-12 lines'
        : 'Generate an exciting update/promo post for my channel. Hype tone, emojis, 8-10 lines'

      let message = await askGroqACI(prompt, db, logger)

      // Ensure footer
      const finalFooter = footer || DEFAULT_FOOTER
      if (!message.includes(finalFooter.substring(0, 10))) {
        message += `\n\n${finalFooter}`
      }

      // Send with image or poll
      if (type === 'poll') {
        const pollMatch = message.match(/(.*?)(Option|1️⃣|🚂|🔥|💜|🖥️)/s)
        const pollName = pollMatch? pollMatch[1].replace(/📊 POLL:/i, '').trim().substring(0, 255) : 'Which do you prefer?'
        const options = ['Option A 🚀', 'Option B 🔥', 'Option C 💎', 'Option D ✨']
        await sock.sendMessage(channelJid, {
          poll: { name: pollName, values: options, selectableCount: 1 }
        })
      } else {
        const pic = await getAciPicture(db)
        if (pic) {
          await sock.sendMessage(channelJid, {
            image: { url: pic },
            caption: message
          })
        } else {
          await sock.sendMessage(channelJid, { text: message })
        }
      }

      await db.set('aci_last_post', now)

      const stats = await db.get('aci_stats') || { posts: 0 }
      stats.posts = (stats.posts || 0) + 1
      stats.lastType = type
      await db.set('aci_stats', stats)

      logger.info('ACIAUTO', `Posted ${type} to ${channelJid}`)

    } catch (e) {
      logger.error('ACI_POST', 'Auto post failed', e.message)
    }
  }, 60000) // Check every minute
}

// Learning mode handler - saves user messages to build prompt
async function handleLearningMode(m, body, db, sock, logger) {
  const learningOn = await db.get('aci_learning_mode')
  if (!learningOn || learningOn === 'false') return false

  const owner = await db.get('owner_number')
  const sender = m.key.remoteJid

  // Only learn from owner in DM
  if (sender!== owner || m.key.remoteJid.endsWith('@g.us') || m.key.remoteJid.endsWith('@newsletter')) return false

  const learningData = await db.get('aci_learning_data') || []
  learningData.push({ text: body, timestamp: Date.now() })

  // Keep last 20 messages for context
  if (learningData.length > 20) learningData.shift()
  await db.set('aci_learning_data', learningData)

  // If user says "done" or "compile", build final prompt
  if (body.toLowerCase().match(/done|compile|finish|save prompt/)) {
    const context = learningData.map(d => d.text).join('\n')
    const compilePrompt = `Based on these user messages, create a master system prompt for my channel AI:\n${context}\n\nExtract tone, style, topics, emojis, length. Return ONLY the final system prompt.`

    const finalPrompt = await askGroqACI(compilePrompt, db, logger)
    await db.set('aci_final_prompt', finalPrompt)
    await db.set('aci_learning_mode', false)

    await sock.sendMessage(sender, {
      text: `✅ Learning complete! Here's your custom AI prompt:\n\n${finalPrompt}\n\nSaved to aci_final_prompt. Use.ac preview to test.`
    })
    return true
  }

  await sock.sendMessage(sender, { text: `🧠 Learned: "${body.substring(0, 50)}..." | Messages: ${learningData.length}/20\nSend "done" when ready to compile.` })
  return true
}

// Main observer export
export default {
  name: 'autochannelai_observer',
  event: 'messages.upsert',
  desc: 'ACI Channel: Auto post, reply, react, learn',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      const from = m.key.remoteJid
      const [enabled, channelJid, autoReply, autoReact] = await Promise.all([
        db.get('aci_enabled'),
        db.get('aci_channel_jid'),
        db.get('aci_autoreply'),
        db.get('aci_autoreact')
      ])

      if (!enabled || enabled === 'false') return

      const body = m.message?.conversation || m.message?.extendedTextMessage?.text || ''
      const isChannel = from.endsWith('@newsletter')
      const isOwner = from === await db.get('owner_number')
      const isOurChannel = from === channelJid

      // 1. Learning Mode - Owner DM only
      if (isOwner &&!isChannel && body) {
        const handled = await handleLearningMode(m, body, db, sock, logger)
        if (handled) return
      }

      // 2. Channel message handling
      if (isChannel && isOurChannel &&!m.key.fromMe) {
        // Auto react
        if (autoReact === 'true' && Math.random() > 0.7) {
          const reactions = await db.get('aci_reactions') || ['❤️', '👍', '🔥', '✨', '💯', '🚀']
          const reaction = reactions[Math.floor(Math.random() * reactions.length)]
          try {
            await sock.sendMessage(from, { react: { text: reaction, key: m.key } })
            const stats = await db.get('aci_stats') || { reactions: 0 }
            stats.reactions = (stats.reactions || 0) + 1
            await db.set('aci_stats', stats)
          } catch {}
        }

        // Auto reply to questions
        if (autoReply === 'true' && body.match(/\?|how|what|where|when|can|help/)) {
          const replyPrompt = `User asked in channel: "${body}". Reply helpfully using my custom style. 4-6 lines, human-like.`
          let reply = await askGroqACI(replyPrompt, db, logger)

          const footer = await db.get('aci_footer') || DEFAULT_FOOTER
          if (!reply.includes(footer.substring(0, 10))) reply += `\n\n${footer}`

          setTimeout(async () => {
            const pic = await getAciPicture(db)
            if (pic && Math.random() > 0.5) {
              await sock.sendMessage(from, { image: { url: pic }, caption: reply }, { quoted: m })
            } else {
              await sock.sendMessage(from, { text: reply }, { quoted: m })
            }
            const stats = await db.get('aci_stats') || { replies: 0 }
            stats.replies = (stats.replies || 0) + 1
            await db.set('aci_stats', stats)
          }, 2000 + Math.random() * 3000)
        }

        // Reply Learning - store user replies to learn style
        const replyLearn = await db.get('aci_reply_learning')
        if (replyLearn === 'true' && body.length > 20) {
          const samples = await db.get('aci_style_samples') || []
          samples.push(body)
          if (samples.length > 10) samples.shift()
          await db.set('aci_style_samples', samples)
        }
      }

    } catch (e) {
      logger.error('ACI_OBSERVER', 'Error', e.message)
    }
  }
}

// Init function - call from index.js after sock ready
export const init = (sock, db, logger) => {
  startACIPosting(sock, db, logger)
  logger.info('ACIAUTO', 'ACI Auto posting scheduler started')
}