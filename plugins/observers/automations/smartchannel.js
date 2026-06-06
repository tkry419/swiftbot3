/**
 * SwiftBot - plugins/observers/smartchannel.js
 * Smart Channel AI Observer - Autonomous Posting & Interaction
 * Posts every 5 min, replies to questions, reacts, changes name/pic
 * Uses GROQ_API_KEY with full fallback logic
 */

import axios from 'axios'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const DEFAULT_CHANNEL_JID = '120363426850850275@newsletter'
const DEFAULT_CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G'
const DEFAULT_FOOTER = '> Smart Swiftbot'
const DEFAULT_PAIR_LINK = 'pair.swiftbot.gt.tc'

// Knowledge base for AI
const KNOWLEDGE_BASE = `
You are Smart Swiftbot AI managing the official Swiftbot WhatsApp Channel.

KEY POINTS:
1. Swiftbot is a powerful WhatsApp bot that can be deployed anywhere
2. Pair link: ${DEFAULT_PAIR_LINK} - users get QR code and session ID there
3. Steps to use:
   - Visit pair.swiftbot.gt.tc
   - Scan QR or enter pairing code
   - Get session ID
   - Deploy to Railway, Render, Heroku, Panels, VPS, or Pterodactyl
4. Deployment guides:
   Railway: Create new project > Deploy from GitHub > Add env vars > Deploy
   Render: New Web Service > Connect repo > Build command: npm install > Start: node index.js
   Heroku: Create app > Connect GitHub > Deploy branch > Add config vars
   Panels: Upload files > npm install > node index.js > Keep alive
   VPS: git clone > npm install > pm2 start index.js
   Pterodactyl: Create server > Upload > npm install > Start
5. Features: Auto moderation, AI chat, group management, downloaders, games, tools
6. Channel is for updates, tutorials, support

PERSONALITY: Human-like, helpful, friendly, knowledgeable. Never robotic.
`

// Helper: Call Groq with fallback
async function askGroq(prompt, fallback = '', logger) {
  const key = GROQ_API_KEY || await db.get('GROQ_API_KEY')
  if (!key) return fallback

  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: KNOWLEDGE_BASE },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 300
    }, {
      headers: { 'Authorization': `Bearer ${key}` },
      timeout: 8000
    })
    return res.data.choices[0]?.message?.content?.trim() || fallback
  } catch (e) {
    logger?.error('SC_GROQ', 'API failed, using fallback', e.message)
    return fallback
  }
}

// Fallback content generator
function generateFallbackContent(type) {
  const templates = {
    tutorial: [
      `🚀 How to deploy Swiftbot on Railway:\n1. Go to railway.app\n2. New Project > Deploy from GitHub\n3. Add SESSION_ID env var\n4. Deploy!\n\nGet your session: ${DEFAULT_PAIR_LINK}\n\n${DEFAULT_FOOTER}`,
      `📱 Get Swiftbot running in 3 steps:\n1. Visit ${DEFAULT_PAIR_LINK}\n2. Scan QR or pair code\n3. Deploy to your platform\n\nSupports: Railway, Render, Heroku, VPS, Pterodactyl\n\n${DEFAULT_FOOTER}`,
      `⚡ Swiftbot Deployment Guide:\nRender: New Web Service > node index.js\nHeroku: Create app > Deploy branch\nVPS: pm2 start index.js\n\nPair first: ${DEFAULT_PAIR_LINK}\n\n${DEFAULT_FOOTER}`
    ],
    update: [
      `✨ Swiftbot Update: New AI features added!\nBetter spam detection, smarter replies, faster responses.\n\nJoin us: ${DEFAULT_CHANNEL_LINK}\n\n${DEFAULT_FOOTER}`,
      `🔥 Pro Tip: Use Swiftbot's.menu to see all commands\nFrom downloaders to group management, we've got you covered.\n\nNeed help? Ask here!\n\n${DEFAULT_FOOTER}`
    ],
    question: [
      `Great question! For deployment, I recommend Railway or Render for beginners. They're free and easy.\n\nSteps: ${DEFAULT_PAIR_LINK} > Get session > Deploy\n\n${DEFAULT_FOOTER}`,
      `You can deploy Swiftbot anywhere! VPS gives most control, Railway is easiest.\n\nCheck ${DEFAULT_PAIR_LINK} for your session ID first.\n\n${DEFAULT_FOOTER}`
    ]
  }
  const list = templates[type] || templates.update
  return list[Math.floor(Math.random() * list.length)]
}

// Autonomous posting interval
let postInterval = null

function startAutoPosting(sock, db, logger) {
  if (postInterval) clearInterval(postInterval)

  postInterval = setInterval(async () => {
    try {
      const [enabled, interval, channelJid, lastPost] = await Promise.all([
        db.get('sc_enabled'),
        db.get('sc_interval'),
        db.get('sc_channel_jid'),
        db.get('sc_last_post')
      ])

      if (!enabled) return

      const now = Date.now()
      const waitTime = interval || 300000 // 5 min default

      if (lastPost && (now - lastPost) < waitTime) return

      const jid = channelJid || DEFAULT_CHANNEL_JID

      // Generate content with AI
      const contentType = Math.random() > 0.5? 'tutorial' : 'update'
      const prompt = contentType === 'tutorial'
       ? 'Generate a helpful Swiftbot deployment tip or tutorial. Mention pair.swiftbot.gt.tc and one platform: Railway, Render, Heroku, VPS, or Pterodactyl. Keep it 2-3 lines, human-like.'
        : 'Generate a Swiftbot update, tip, or feature highlight. Keep it 2-3 lines, engaging, human-like.'

      const fallback = generateFallbackContent(contentType)
      let message = await askGroq(prompt, fallback, logger)

      // Ensure footer
      if (!message.includes('Smart Swiftbot')) {
        message += `\n\n${DEFAULT_FOOTER}`
      }

      await sock.sendMessage(jid, { text: message })
      await db.set('sc_last_post', now)

      const stats = await db.get('sc_stats') || { posts: 0 }
      stats.posts = (stats.posts || 0) + 1
      await db.set('sc_stats', stats)

      logger.info('SMARTCHANNEL', `Posted to channel: ${message.substring(0, 50)}...`)

    } catch (e) {
      logger.error('SMARTCHANNEL_POST', 'Auto post failed', e.message)
    }
  }, 60000) // Check every minute
}

export default [
  {
    name: 'smartchannel_messages',
    event: 'messages.upsert',
    desc: 'Auto reply to channel messages and react',
    category: 'Automation',
    enabled: true,

    execute: async (sock, m, { db, logger }) => {
      try {
        const from = m.key.remoteJid

        // Handle channel messages
        if (from.endsWith('@newsletter')) {
          const [enabled, autoReply, autoReact, channelJid] = await Promise.all([
            db.get('sc_enabled'),
            db.get('sc_autoreply'),
            db.get('sc_autoreact'),
            db.get('sc_channel_jid')
          ])

          if (!enabled) return
          if (from!== (channelJid || DEFAULT_CHANNEL_JID)) return
          if (m.key.fromMe) return

          const body = m.message?.conversation
            || m.message?.extendedTextMessage?.text
            || ''

          // Auto react to messages
          if (autoReact && Math.random() > 0.7) {
            const reactions = ['❤️', '👍', '🔥', '✨', '💯']
            const reaction = reactions[Math.floor(Math.random() * reactions.length)]
            try {
              await sock.sendMessage(from, { react: { text: reaction, key: m.key } })
              const stats = await db.get('sc_stats') || { reactions: 0 }
              stats.reactions = (stats.reactions || 0) + 1
              await db.set('sc_stats', stats)
            } catch {}
          }

          // Auto reply to questions
          if (autoReply && body.match(/\?|how|what|where|when|can|help|deploy|pair|session|railway|render|heroku|vps/i)) {
            const prompt = `User asked in channel: "${body}". Reply helpfully about Swiftbot. Mention pair.swiftbot.gt.tc if relevant. Keep it 2-3 lines, human-like.`
            const fallback = generateFallbackContent('question')

            let reply = await askGroq(prompt, fallback, logger)
            if (!reply.includes('Smart Swiftbot')) {
              reply += `\n\n${DEFAULT_FOOTER}`
            }

            // Reply in channel
            setTimeout(async () => {
              await sock.sendMessage(from, { text: reply }, { quoted: m })
              const stats = await db.get('sc_stats') || { replies: 0 }
              stats.replies = (stats.replies || 0) + 1
              await db.set('sc_stats', stats)
            }, 2000 + Math.random() * 3000) // Human-like delay
          }
        }

      } catch (e) {
        logger.error('SMARTCHANNEL_MSG', 'Error', e.message)
      }
    }
  }
]

// Initialize on load
export const init = (sock, db, logger) => {
  startAutoPosting(sock, db, logger)
  logger.info('SMARTCHANNEL', 'Auto posting scheduler started')
}