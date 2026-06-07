/**
 * SwiftBot - plugins/observers/automations/smartchannel.js
 * Smart Channel AI Observer - Autonomous Posting & Interaction
 * Posts every 5 min, replies to questions, reacts, changes name/pic
 * Uses GROQ_API_KEY with full fallback logic
 */

import axios from 'axios'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const DEFAULT_CHANNEL_JID = '120363426850850275@newsletter'
const DEFAULT_CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G'
const DEFAULT_FOOTER = '«🚀 SwiftBot — Create Your Own WhatsApp Bot Experience 💖»'
const DEFAULT_PAIR_LINK = 'pair.swiftbot.gt.tc'
const TUTORIAL_VIDEO = 'https://youtu.be/PjIZ_dCPJVU'

// Knowledge base for AI - NEW STYLE
const KNOWLEDGE_BASE = `
You are Smart Swiftbot AI managing the official Swiftbot WhatsApp Channel.

PERSONALITY: Human-like, hype, friendly, exciting. Never robotic. Use lots of emojis.

STYLE RULES:
1. Always start with emoji title: 🚀💖 DEPLOY SWIFTBOT FREE ✨
2. Use catchy intro with emojis 😍🔥🎀
3. Features list with ✅ emojis
4. Steps with 1️⃣2️⃣3️⃣4️⃣
5. Always include pair link: ${DEFAULT_PAIR_LINK}
6. Always include video tutorial: ${TUTORIAL_VIDEO}
7. Always end with footer: ${DEFAULT_FOOTER}
8. Messages must be 8-12 lines minimum, exciting and long
9. For polls: Create engaging questions like "Which platform next? Railway 🚂 | Render 🔥 | VPS 💻"

KEY POINTS:
1. Swiftbot is a powerful WhatsApp bot that can be deployed anywhere in ONE CLICK
2. Pair link: ${DEFAULT_PAIR_LINK} - users get QR code and session ID there
3. Steps to use:
   1️⃣ Visit pair.swiftbot.gt.tc
   2️⃣ Scan QR or enter pairing code
   3️⃣ Get session ID
   4️⃣ Deploy to Railway, Render, Heroku, Panels, VPS, or Pterodactyl
   5️⃣ Bot connects automatically 🚀💗
4. Video Tutorial: ${TUTORIAL_VIDEO} - Shows how to use Swift App to deploy any custom bots easy, one click, stays online 24/7
5. Features: Auto moderation, AI chat, group management, downloaders, games, tools, status seen, anti call, deleted message recovery
6. Promos: Create exciting offers like "B.AI is Giving Away 500,000 FREE Credits for New Users!" but for SwiftBot
7. Channel is for updates, tutorials, support, polls

EXAMPLE STYLE:
🚀💖 DEPLOY SWIFTBOT MINI BOT FREE ✨

Looking for a powerful, fast, and fully customizable WhatsApp bot? 😍🔥

SwiftBot gives you complete control over your bot experience. Customize it the way you want and enjoy premium features for free! 🎀

📎 ${DEFAULT_PAIR_LINK}

⚡ FEATURES ⚡

✅ Status Seen & Auto Status React
💖 Smart AI Chat System
👀 Deleted Message Recovery
📵 Anti Call Protection
🤖 Advanced Group Management
🎵 Music & Video Downloader
🖼️ Image Search & Download
⚙️ Fully Customizable Settings Panel
🎨 Customize Your Bot Your Own Way
✨ And Many More Features...

📌 Deploy In Seconds

1️⃣ Visit the Website
2️⃣ Generate Your Pair Code
3️⃣ Link Your WhatsApp Account
4️⃣ Your Bot Connects Automatically 🚀💗

🎥 Video Tutorial: ${TUTORIAL_VIDEO}

${DEFAULT_FOOTER}
`

// Helper: Call Groq with fallback - FIXED: pass db as parameter
async function askGroq(prompt, db, fallback = '', logger) {
  const key = GROQ_API_KEY || await db.get('GROQ_API_KEY')
  if (!key) return fallback

  try {
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: KNOWLEDGE_BASE },
        { role: 'user', content: prompt }
      ],
      temperature: 0.9,
      max_tokens: 600
    }, {
      headers: { 'Authorization': `Bearer ${key}` },
      timeout: 10000
    })
    return res.data.choices[0]?.message?.content?.trim() || fallback
  } catch (e) {
    logger?.error('SC_GROQ', 'API failed, using fallback', e.message)
    return fallback
  }
}

// Fallback content generator - NEW LONG STYLE
function generateFallbackContent(type) {
  const templates = {
    tutorial: [
`🚀💖 DEPLOY SWIFTBOT MINI BOT FREE ✨

Looking for a powerful, fast, and fully customizable WhatsApp bot? 😍🔥

SwiftBot gives you complete control over your bot experience. Customize it the way you want and enjoy premium features for free! 🎀

📎 ${DEFAULT_PAIR_LINK}

⚡ FEATURES ⚡

✅ Status Seen & Auto Status React
💖 Smart AI Chat System
👀 Deleted Message Recovery
📵 Anti Call Protection
🤖 Advanced Group Management Tools
🎵 Music & Video Downloader
🖼️ Image Search & Download
👥 Group Management Tools
⚙️ Fully Customizable Settings Panel
🎨 Customize Your Bot Your Own Way
✨ And Many More Features...

📌 Deploy In Seconds

1️⃣ Visit the Website
2️⃣ Generate Your Pair Code
3️⃣ Link Your WhatsApp Account
4️⃣ Your Bot Connects Automatically 🚀💗

🎥 Video Tutorial: ${TUTORIAL_VIDEO}

${DEFAULT_FOOTER}`,

`⚡💎 SWIFTBOT DEPLOYMENT GUIDE ✨

Deploy SwiftBot anywhere in just ONE CLICK! Stay online 24/7 💗

📱 PLATFORMS SUPPORTED:

🚂 Railway: Create project > Deploy from GitHub > Add SESSION_ID > Done!
🔥 Render: New Web Service > node index.js > Auto deploy
💜 Heroku: Create app > Deploy branch > Add config vars
🖥️ VPS: git clone > npm install > pm2 start index.js
🎮 Pterodactyl: Create server > Upload > npm install > Start

1️⃣ Get Session: ${DEFAULT_PAIR_LINK}
2️⃣ Scan QR or enter pairing code
3️⃣ Choose your platform
4️⃣ Bot connects automatically 🚀

🎥 Watch Tutorial: ${TUTORIAL_VIDEO}

${DEFAULT_FOOTER}`
    ],
    update: [
`🚀 SwiftBot is Giving Away FREE Premium Features! 🎁

New users get access to ALL features for FREE, including:

✅ Gemini 3.5 Flash AI Chat
✅ DeepSeek V4 Pro Responses
✅ Advanced Auto Moderation
✅ Unlimited Downloaders
✅ Smart Group Management
✅ Status Recovery & Anti Call
✅ 24/7 Online Support

Perfect for groups, businesses, communities, and more.

🔗 Get Started: ${DEFAULT_PAIR_LINK}
📚 Full Feature List: docs.swiftbot.gt.tc

${DEFAULT_FOOTER}`,

`✨ SwiftBot Update: New AI Features Added! 🔥

Better spam detection, smarter replies, faster responses, and NEW downloader engines! 💯

💖 What's New:
✅ Status Auto React with Custom Emojis
✅ One-Click Deployment via Swift App
✅ Advanced Anti Spam with AI
✅ Video Tutorial Support
✅ Channel Song Sender with Custom Captions

Join us: ${DEFAULT_CHANNEL_LINK}

${DEFAULT_FOOTER}`
    ],
    question: [
`Great question! 😍 For deployment, I recommend Railway or Render for beginners - they're free and super easy! 🚀

📌 Quick Steps:
1️⃣ Visit ${DEFAULT_PAIR_LINK}
2️⃣ Scan QR or get pairing code
3️⃣ Deploy to Railway/Render in one click
4️⃣ Your bot stays online 24/7 💗

🎥 Need help? Watch: ${TUTORIAL_VIDEO}

${DEFAULT_FOOTER}`,

`You can deploy SwiftBot anywhere! 🎀 VPS gives most control, Railway is easiest for beginners. ✨

⚡ All platforms supported:
🚂 Railway | 🔥 Render | 💜 Heroku | 🖥️ VPS | 🎮 Pterodactyl

Check ${DEFAULT_PAIR_LINK} for your session ID first, then choose your platform!

🎥 Full Tutorial: ${TUTORIAL_VIDEO}

${DEFAULT_FOOTER}`
    ],
    poll: [
`📊 POLL: Which platform should we cover next?

🚂 Railway
🔥 Render
💜 Heroku
🖥️ VPS

Vote below! 👇

${DEFAULT_FOOTER}`,
`📊 POLL: What's your favorite SwiftBot feature?

🤖 Smart AI Chat
📵 Anti Call Protection
👀 Deleted Message Recovery
🎵 Music Downloader

Let us know! 💖

${DEFAULT_FOOTER}`
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
      const [enabled, interval, channelJid, lastPost, botimage] = await Promise.all([
        db.get('sc_enabled'),
        db.get('sc_interval'),
        db.get('sc_channel_jid'),
        db.get('sc_last_post'),
        db.get('botimage')
      ])

      if (!enabled) return

      const now = Date.now()
      const waitTime = interval || 300000 // 5 min default

      if (lastPost && (now - lastPost) < waitTime) return

      const jid = channelJid || DEFAULT_CHANNEL_JID

      // Randomly choose: tutorial, update, or poll
      const types = ['tutorial', 'update', 'poll']
      const contentType = types[Math.floor(Math.random() * types.length)]

      const prompt = contentType === 'poll'
       ? 'Generate an engaging poll question for SwiftBot channel. Ask about features, platforms, or tutorials. Include emoji options. Keep it exciting.'
        : contentType === 'tutorial'
       ? `Generate a LONG exciting SwiftBot deployment tutorial. Use this exact style:
- Start with emoji title like 🚀💖 DEPLOY SWIFTBOT FREE ✨
- Add catchy intro with emojis
- List 8+ features with ✅ emojis
- Steps with 1️⃣2️⃣3️⃣4️⃣
- Include pair link: ${DEFAULT_PAIR_LINK}
- Include video tutorial: ${TUTORIAL_VIDEO}
- End with footer: ${DEFAULT_FOOTER}
- Human-like, hype, 10-12 lines minimum`
        : `Generate a SwiftBot promo/update like "B.AI is Giving Away 500,000 FREE Credits" style.
- Start with emoji title
- List exciting features/offers with ✅
- Include pair link: ${DEFAULT_PAIR_LINK}
- Include video: ${TUTORIAL_VIDEO}
- End with footer: ${DEFAULT_FOOTER}
- 8-10 lines, engaging, human-like`

      const fallback = generateFallbackContent(contentType)
      let message = await askGroq(prompt, db, fallback, logger)

      // Ensure footer
      if (!message.includes('SwiftBot')) {
        message += `\n\n${DEFAULT_FOOTER}`
      }

      // Send with image if available
      if (botimage && contentType!== 'poll') {
        await sock.sendMessage(jid, {
          image: { url: botimage },
          caption: message
        })
      } else if (contentType === 'poll') {
        // Extract poll from message or use fallback
        const pollMatch = message.match(/📊 POLL:(.*?)(🚂|🔥|💜|🖥️|🤖|📵|👀|🎵)/s)
        if (pollMatch) {
          const pollText = pollMatch[1].trim()
          const options = ['Railway 🚂', 'Render 🔥', 'Heroku 💜', 'VPS 🖥️']
          await sock.sendMessage(jid, {
            poll: {
              name: pollText.substring(0, 255),
              values: options,
              selectableCount: 1
            }
          })
        } else {
          await sock.sendMessage(jid, { text: message })
        }
      } else {
        await sock.sendMessage(jid, { text: message })
      }

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

// FIXED: Export as single object with name property, not array
export default {
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
        const [enabled, autoReply, autoReact, channelJid, botimage] = await Promise.all([
          db.get('sc_enabled'),
          db.get('sc_autoreply'),
          db.get('sc_autoreact'),
          db.get('sc_channel_jid'),
          db.get('botimage')
        ])

        if (!enabled) return
        if (from!== (channelJid || DEFAULT_CHANNEL_JID)) return
        if (m.key.fromMe) return

        const body = m.message?.conversation
          || m.message?.extendedTextMessage?.text
          || ''

        // Auto react to messages
        if (autoReact && Math.random() > 0.7) {
          const reactions = ['❤️', '👍', '🔥', '✨', '💯', '🚀', '💖']
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
          const prompt = `User asked in channel: "${body}". Reply helpfully about SwiftBot in LONG exciting style:
- Start with emoji
- Answer with steps using 1️⃣2️⃣3️⃣
- Mention pair.swiftbot.gt.tc and video: ${TUTORIAL_VIDEO}
- End with footer: ${DEFAULT_FOOTER}
- 6-8 lines, human-like, hype`
          const fallback = generateFallbackContent('question')

          let reply = await askGroq(prompt, db, fallback, logger)
          if (!reply.includes('SwiftBot')) {
            reply += `\n\n${DEFAULT_FOOTER}`
          }

          // Reply in channel with image
          setTimeout(async () => {
            if (botimage) {
              await sock.sendMessage(from, {
                image: { url: botimage },
                caption: reply
              }, { quoted: m })
            } else {
              await sock.sendMessage(from, { text: reply }, { quoted: m })
            }
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

// Initialize on load - call this from index.js after sock is ready
export const init = (sock, db, logger) => {
  startAutoPosting(sock, db, logger)
  logger.info('SMARTCHANNEL', 'Auto posting scheduler started')
}