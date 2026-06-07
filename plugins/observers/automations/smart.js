/**
 * SwiftBot - plugins/observers/automations/smartgroup.js
 * Smart Group AI Observer - Autonomous Posting, Polls, Reactions
 * Auto posts in group every 5 min, replies, reacts, promotes channel
 * Uses GROQ_API_KEY with full fallback logic
 */

import axios from 'axios'

const GROQ_API_KEY = process.env.GROQ_API_KEY
const SMART_GROUP_JID = '120363406358472734@g.us'
const SMART_GROUP_LINK = 'https://chat.whatsapp.com/Iy8vxlb2F1iJjeQaXjMLXN?s=cl&p=a&ilr=0'
const CHANNEL_JID = '120363426850850275@newsletter'
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G'
const DEFAULT_FOOTER = '«🚀 SwiftBot — Join Our Community 💖»'
const DEFAULT_PAIR_LINK = 'pair.swiftbot.gt.tc'
const TUTORIAL_VIDEO = 'https://youtu.be/PjIZ_dCPJVU'

// Knowledge base for AI - GROUP STYLE
const KNOWLEDGE_BASE = `
You are Smart Swiftbot AI managing the official SwiftBot Community Group.

PERSONALITY: Human-like, hype, friendly, community builder. Use lots of emojis.

STYLE RULES:
1. Always start with emoji title: 🚀💖 SWIFTBOT COMMUNITY ✨
2. Use catchy intro with emojis 😍🔥🎀
3. Features list with ✅ emojis
4. Steps with 1️⃣2️⃣3️⃣4️⃣
5. Always include pair link: ${DEFAULT_PAIR_LINK}
6. Always include video tutorial: ${TUTORIAL_VIDEO}
7. Always promote channel: ${CHANNEL_LINK}
8. Always include group link: ${SMART_GROUP_LINK}
9. End with footer: ${DEFAULT_FOOTER}
10. Messages must be 8-12 lines minimum, exciting and long
11. Create polls: "What's your favorite SwiftBot feature?" etc

KEY POINTS:
1. This is the OFFICIAL SwiftBot Community Group for help, updates, friends
2. Swiftbot is a powerful WhatsApp bot that can be deployed anywhere in ONE CLICK
3. Pair link: ${DEFAULT_PAIR_LINK} - users get QR code and session ID there
4. Video Tutorial: ${TUTORIAL_VIDEO} - Shows how to use Swift App to deploy any custom bots easy, one click, stays online 24/7
5. Features: Auto moderation, AI chat, group management, downloaders, games, tools, status seen, anti call, deleted message recovery
6. Also promote official channel: ${CHANNEL_LINK} for more updates
7. Help members, answer questions, create polls, share tips

EXAMPLE STYLE:
🚀💖 WELCOME TO SWIFTBOT COMMUNITY ✨

Looking for help with SwiftBot? You're in the right place! 😍🔥

This is the official community where we share tips, help each other, and get exclusive updates! 🎀

📎 Get SwiftBot: ${DEFAULT_PAIR_LINK}
📢 Join Channel: ${CHANNEL_LINK}
👥 Invite Friends: ${SMART_GROUP_LINK}

⚡ WHAT WE DO HERE ⚡

✅ Help with deployment issues
💖 Share bot tips & tricks
👀 Latest SwiftBot updates
📵 Community support 24/7
🤖 AI chat & bot discussions
🎵 Share cool features
⚙️ Customization help
✨ Make new friends!

📌 Quick Start:

1️⃣ Get your bot: ${DEFAULT_PAIR_LINK}
2️⃣ Watch tutorial: ${TUTORIAL_VIDEO}
3️⃣ Join channel: ${CHANNEL_LINK}
4️⃣ Ask questions here! 🚀💗

${DEFAULT_FOOTER}
`

// Helper: Call Groq with fallback
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
    logger?.error('SSG_GROQ', 'API failed, using fallback', e.message)
    return fallback
  }
}

// Fallback content generator - GROUP STYLE
function generateFallbackContent(type) {
  const templates = {
    tutorial: [
`🚀💖 SWIFTBOT DEPLOYMENT HELP ✨

New to SwiftBot? No worries fam! 😍🔥

SwiftBot gives you complete control over your bot experience. Deploy in seconds! 🎀

📎 Get Session: ${DEFAULT_PAIR_LINK}
📢 Official Channel: ${CHANNEL_LINK}
👥 Group Link: ${SMART_GROUP_LINK}

⚡ EASY DEPLOYMENT ⚡

✅ Railway - Easiest for beginners
💖 Render - Free & fast
👀 Heroku - Classic choice
📵 VPS - Full control
🤖 Pterodactyl - Game panels

📌 Steps:

1️⃣ Visit ${DEFAULT_PAIR_LINK}
2️⃣ Scan QR or enter pairing code
3️⃣ Choose your platform
4️⃣ Bot connects automatically 🚀💗

🎥 Video Tutorial: ${TUTORIAL_VIDEO}

Need help? Just ask here! 💖

${DEFAULT_FOOTER}`,

`⚡💎 SWIFTBOT COMMUNITY GUIDE ✨

Welcome to the official SwiftBot group! Here we help each other 💗

📱 WHAT YOU CAN DO:

🚂 Deploy on Railway/Render/Heroku/VPS
🔥 Use AI chat, downloaders, group tools
💜 Customize everything your way
🖥️ Get 24/7 support from community

1️⃣ Get Bot: ${DEFAULT_PAIR_LINK}
2️⃣ Watch: ${TUTORIAL_VIDEO}
3️⃣ Join Channel: ${CHANNEL_LINK}
4️⃣ Invite: ${SMART_GROUP_LINK}

Ask any question - we're here to help! 🚀

${DEFAULT_FOOTER}`
    ],
    update: [
`🚀 SwiftBot Community Update! 🎁

New members get FREE access to ALL features! 😍

✅ Advanced AI Chat System
✅ Auto Moderation & Anti Spam
✅ Music & Video Downloaders
✅ Status Recovery & Anti Call
✅ Group Management Tools
✅ Custom Settings Panel

Perfect for your groups and communities!

🔗 Get Started: ${DEFAULT_PAIR_LINK}
📚 Tutorial: ${TUTORIAL_VIDEO}
📢 More Updates: ${CHANNEL_LINK}
👥 Invite Friends: ${SMART_GROUP_LINK}

${DEFAULT_FOOTER}`,

`✨ SwiftBot New Features Alert! 🔥

Better spam detection, smarter AI replies, faster downloaders! 💯

💖 What's New:
✅ Status Auto React with Custom Emojis
✅ One-Click Deployment via Swift App
✅ Advanced Anti Spam with AI
✅ Channel Song Sender
✅ Video Tutorial Support

Join our channel for more: ${CHANNEL_LINK}
Need help? Ask here! ${SMART_GROUP_LINK}

${DEFAULT_FOOTER}`
    ],
    question: [
`Great question bestie! 😍 For deployment, Railway or Render are super easy for beginners! 🚀

📌 Quick Fix:
1️⃣ Get session: ${DEFAULT_PAIR_LINK}
2️⃣ Watch tutorial: ${TUTORIAL_VIDEO}
3️⃣ Deploy in one click
4️⃣ Join channel for tips: ${CHANNEL_LINK}

Still stuck? We're here to help! 💖

${DEFAULT_FOOTER}`,

`You can deploy SwiftBot anywhere fam! 🎀 VPS gives most control, Railway is easiest! ✨

⚡ All platforms:
🚂 Railway | 🔥 Render | 💜 Heroku | 🖥️ VPS | 🎮 Pterodactyl

Check ${DEFAULT_PAIR_LINK} for session ID, then choose!

🎥 Tutorial: ${TUTORIAL_VIDEO}
📢 Channel: ${CHANNEL_LINK}

${DEFAULT_FOOTER}`
    ],
    poll: [
`📊 POLL: Which SwiftBot feature do you use most?

🤖 Smart AI Chat
📵 Anti Call Protection
👀 Deleted Message Recovery
🎵 Music Downloader
⚙️ Group Management

Vote below! 💖

${DEFAULT_FOOTER}`,
`📊 POLL: Where did you deploy SwiftBot?

🚂 Railway
🔥 Render
💜 Heroku
🖥️ VPS
🎮 Pterodactyl

Let us know! 🚀

${DEFAULT_FOOTER}`,
`📊 POLL: What tutorial should we make next?

🎥 Railway deployment
🎥 VPS setup guide
🎥 Custom commands
🎥 Group management

Comment your pick! ✨

${DEFAULT_FOOTER}`
    ],
    promo: [
`🚀💖 INVITE YOUR FRIENDS TO SWIFTBOT! ✨

Know someone who needs a powerful WhatsApp bot? 😍

Share SwiftBot with them! 🎀

📎 Pair Link: ${DEFAULT_PAIR_LINK}
📢 Channel: ${CHANNEL_LINK}
👥 This Group: ${SMART_GROUP_LINK}
🎥 Tutorial: ${TUTORIAL_VIDEO}

Let's grow the community! 💗

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
      const [enabled, interval, lastPost, botimage] = await Promise.all([
        db.get('ssg_enabled'),
        db.get('ssg_interval'),
        db.get('ssg_last_post'),
        db.get('botimage')
      ])

      if (!enabled) return

      const now = Date.now()
      const waitTime = interval || 300000 // 5 min default

      if (lastPost && (now - lastPost) < waitTime) return

      // Randomly choose: tutorial, update, poll, promo
      const types = ['tutorial', 'update', 'poll', 'promo']
      const contentType = types[Math.floor(Math.random() * types.length)]

      const prompt = contentType === 'poll'
    ? 'Generate an engaging poll for SwiftBot community group. Ask about features, platforms, or tutorials. Include emoji options. Keep it exciting and community-focused.'
        : contentType === 'promo'
    ? `Generate a community promotion message encouraging invites. Include group link: ${SMART_GROUP_LINK}, channel: ${CHANNEL_LINK}, pair: ${DEFAULT_PAIR_LINK}. Use hype style.`
        : contentType === 'tutorial'
    ? `Generate a LONG exciting SwiftBot community help message. Use this exact style:
- Start with emoji title like 🚀💖 SWIFTBOT COMMUNITY HELP ✨
- Add catchy intro
- List 8+ features/help topics with ✅
- Steps with 1️⃣2️⃣3️⃣4️⃣
- Include pair link: ${DEFAULT_PAIR_LINK}
- Include video: ${TUTORIAL_VIDEO}
- Include channel: ${CHANNEL_LINK}
- Include group: ${SMART_GROUP_LINK}
- End with footer: ${DEFAULT_FOOTER}
- 10-12 lines minimum`
        : `Generate a SwiftBot community update/promo.
- Start with emoji title
- List exciting features/offers with ✅
- Include pair link: ${DEFAULT_PAIR_LINK}
- Include video: ${TUTORIAL_VIDEO}
- Include channel: ${CHANNEL_LINK}
- Include group: ${SMART_GROUP_LINK}
- End with footer: ${DEFAULT_FOOTER}
- 8-10 lines, engaging`

      const fallback = generateFallbackContent(contentType)
      let message = await askGroq(prompt, db, fallback, logger)

      // Ensure footer
      if (!message.includes('SwiftBot')) {
        message += `\n\n${DEFAULT_FOOTER}`
      }

      // Send with image if available
      if (botimage && contentType!== 'poll') {
        await sock.sendMessage(SMART_GROUP_JID, {
          image: { url: botimage },
          caption: message
        })
      } else if (contentType === 'poll') {
        const pollMatch = message.match(/📊 POLL:(.*?)(🚂|🔥|💜|🖥️|🤖|📵|👀|🎵|🎥)/s)
        if (pollMatch) {
          const pollText = pollMatch[1].trim()
          const options = ['Railway 🚂', 'Render 🔥', 'VPS 🖥️', 'Heroku 💜', 'AI Chat 🤖']
          await sock.sendMessage(SMART_GROUP_JID, {
            poll: {
              name: pollText.substring(0, 255),
              values: options.slice(0, 5),
              selectableCount: 1
            }
          })
        } else {
          await sock.sendMessage(SMART_GROUP_JID, { text: message })
        }
      } else {
        await sock.sendMessage(SMART_GROUP_JID, { text: message })
      }

      await db.set('ssg_last_post', now)

      const stats = await db.get('ssg_stats') || { posts: 0 }
      stats.posts = (stats.posts || 0) + 1
      await db.set('ssg_stats', stats)

      logger.info('SMARTGROUP', `Posted to group: ${message.substring(0, 50)}...`)

    } catch (e) {
      logger.error('SMARTGROUP_POST', 'Auto post failed', e.message)
    }
  }, 60000) // Check every minute
}

export default {
  name: 'smartgroup_messages',
  event: 'messages.upsert',
  desc: 'Auto reply in community group, react, promote',
  category: 'Automation',
  enabled: true,

  execute: async (sock, m, { db, logger }) => {
    try {
      const from = m.key.remoteJid

      // Handle smart group messages
      if (from === SMART_GROUP_JID) {
        const [enabled, autoReply, autoReact, botimage] = await Promise.all([
          db.get('ssg_enabled'),
          db.get('ssg_autoreply'),
          db.get('ssg_autoreact'),
          db.get('botimage')
        ])

        if (!enabled) return
        if (m.key.fromMe) return

        const body = m.message?.conversation
          || m.message?.extendedTextMessage?.text
          || ''

        // Auto react to messages
        if (autoReact && Math.random() > 0.6) {
          const reactions = ['❤️', '👍', '🔥', '✨', '💯', '🚀', '💖', '😍']
          const reaction = reactions[Math.floor(Math.random() * reactions.length)]
          try {
            await sock.sendMessage(from, { react: { text: reaction, key: m.key } })
            const stats = await db.get('ssg_stats') || { reactions: 0 }
            stats.reactions = (stats.reactions || 0) + 1
            await db.set('ssg_stats', stats)
          } catch {}
        }

        // Auto reply to questions
        if (autoReply && body.match(/\?|how|what|where|when|can|help|deploy|pair|session|railway|render|heroku|vps|problem|error|issue/i)) {
          const prompt = `User asked in SwiftBot community group: "${body}". Reply helpfully in LONG exciting community style:
- Start with emoji, friendly tone
- Answer with steps using 1️⃣2️⃣3️⃣
- Mention pair: ${DEFAULT_PAIR_LINK}
- Mention video: ${TUTORIAL_VIDEO}
- Mention channel: ${CHANNEL_LINK}
- End with footer: ${DEFAULT_FOOTER}
- 6-8 lines, human-like, hype, supportive`
          const fallback = generateFallbackContent('question')

          let reply = await askGroq(prompt, db, fallback, logger)
          if (!reply.includes('SwiftBot')) {
            reply += `\n\n${DEFAULT_FOOTER}`
          }

          // Reply with image
          setTimeout(async () => {
            if (botimage) {
              await sock.sendMessage(from, {
                image: { url: botimage },
                caption: reply
              }, { quoted: m })
            } else {
              await sock.sendMessage(from, { text: reply }, { quoted: m })
            }
            const stats = await db.get('ssg_stats') || { replies: 0 }
            stats.replies = (stats.replies || 0) + 1
            await db.set('ssg_stats', stats)
          }, 2000 + Math.random() * 3000)
        }
      }

    } catch (e) {
      logger.error('SMARTGROUP_MSG', 'Error', e.message)
    }
  }
}

// Initialize on load
export const init = (sock, db, logger) => {
  startAutoPosting(sock, db, logger)
  logger.info('SMARTGROUP', 'Auto posting scheduler started')
}