/**
 * SwiftBot - plugins/commands/automation/smartgroup.js
 * Smart Group AI Manager - Full Autonomous Control
 * Posts, replies, reacts, polls, promotes channel
 * Uses GROQ_API_KEY for intelligent content generation
 * Owner only, defaults to SwiftBot community group
 */

import axios from 'axios'

const SMART_GROUP_JID = '120363406358472734@g.us'
const SMART_GROUP_LINK = 'https://chat.whatsapp.com/Iy8vxlb2F1iJjeQaXjMLXN?s=cl&p=a&ilr=0'
const CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G'
const DEFAULT_FOOTER = '«🚀 SwiftBot — Join Our Community 💖»'
const DEFAULT_PAIR_LINK = 'pair.swiftbot.gt.tc'

export default {
  name: 'smartgroup',
  alias: ['sg', 'groupai', 'automategroup', 'aigroup'],
  desc: 'AI-powered WhatsApp group manager with full control',
  usage: '[on/off/status/config] [group_jid] [link]',
  category: 'Automation',
  permission: 'owner',

  execute: async (sock, m, args, { db, prefix, isOwner }) => {
    const from = m.key.remoteJid

    if (!isOwner) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Owner only command\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const action = args[0]?.toLowerCase()
    const target = args[1]

    // STATUS
    if (!action || action === 'status' || action === 'info') {
      const [
        enabled, groupJid, groupLink, pairLink,
        interval, autoReply, autoReact,
        groqKey, lastPost, stats
      ] = await Promise.all([
        db.get('sg_enabled'),
        db.get('sg_group_jid'),
        db.get('sg_group_link'),
        db.get('sg_pair_link'),
        db.get('sg_interval'),
        db.get('sg_autoreply'),
        db.get('sg_autoreact'),
        db.get('GROQ_API_KEY'),
        db.get('sg_last_post'),
        db.get('sg_stats')
      ])

      const hasGroq = groqKey || process.env.GROQ_API_KEY
      const nextPost = lastPost? new Date(lastPost + (interval || 300000)).toLocaleTimeString() : 'Now'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🤖 SMART GROUP AI STATUS
╠═══════════════════
║ Status: ${enabled? '🟢 ON' : '🔴 OFF'}
║ AI Engine: ${hasGroq? '✅ Groq Connected' : '⚠️ Fallback Mode'}
║
║ 📍 GROUP CONFIG:
║ JID: ${groupJid || SMART_GROUP_JID}
║ Link: ${groupLink || SMART_GROUP_LINK}
║ Pair Site: ${pairLink || DEFAULT_PAIR_LINK}
║ Channel: ${CHANNEL_LINK}
║
║ ⚙️ AUTOMATION:
║ Post Interval: ${(interval || 300000) / 60000} min
║ Next Post: ${nextPost}
║ Auto Reply: ${autoReply? '✅ ON' : '❌ OFF'}
║ Auto React: ${autoReact? '✅ ON' : '❌ OFF'}
║
║ 📊 STATS:
║ Posts Sent: ${stats?.posts || 0}
║ Replies: ${stats?.replies || 0}
║ Reactions: ${stats?.reactions || 0}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}sg on
║ ${prefix}sg off
║ ${prefix}sg set jid 120363...
║ ${prefix}sg set link https://...
║ ${prefix}sg set interval 5
║ ${prefix}sg toggle reply
║ ${prefix}sg toggle react
║ ${prefix}sg post "custom message"
║ ${prefix}sg poll "Question"
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      await Promise.all([
        db.set('sg_enabled', true),
        db.set('sg_group_jid', SMART_GROUP_JID),
        db.set('sg_group_link', SMART_GROUP_LINK),
        db.set('sg_pair_link', DEFAULT_PAIR_LINK),
        db.set('sg_interval', 300000), // 5 min
        db.set('sg_autoreply', true),
        db.set('sg_autoreact', true)
      ])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Smart Group AI Enabled\n║ Group: SwiftBot Community\n║ Interval: 5 min\n║ AI will post autonomously\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (action === 'off' || action === 'disable') {
      await db.set('sg_enabled', false)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Smart Group AI Disabled\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SET CONFIG
    if (action === 'set') {
      const key = target?.toLowerCase()
      const value = args.slice(2).join(' ')

      const keyMap = {
        'jid': 'sg_group_jid',
        'link': 'sg_group_link',
        'pair': 'sg_pair_link',
        'interval': 'sg_interval'
      }

      if (keyMap[key]) {
        let finalValue = value
        if (key === 'interval') {
          const mins = parseInt(value)
          if (isNaN(mins) || mins < 1 || mins > 1440) {
            return await sock.sendMessage(from, {
              text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid interval\n║ Range: 1-1440 minutes\n╚━━━━━━━━━━━━━━━━━═❒`
            }, { quoted: m })
          }
          finalValue = mins * 60000
        }
        await db.set(keyMap[key], finalValue)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ ${key.toUpperCase()} Updated\n║ Value: ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // TOGGLE
    if (action === 'toggle') {
      const feature = target?.toLowerCase()
      const toggleMap = {
        'reply': 'sg_autoreply',
        'react': 'sg_autoreact'
      }

      if (toggleMap[feature]) {
        const current = await db.get(toggleMap[feature])
        await db.set(toggleMap[feature],!current)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ ${feature.toUpperCase()} ${!current? 'ON' : 'OFF'}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // MANUAL POST
    if (action === 'post') {
      const message = args.slice(1).join(' ')
      if (!message) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Provide message\n║ Example: ${prefix}sg post Hello\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      const groupJid = await db.get('sg_group_jid') || SMART_GROUP_JID
      const botimage = await db.get('botimage')
      const footer = DEFAULT_FOOTER
      const fullMsg = `${message}\n\n${footer}`

      if (botimage) {
        await sock.sendMessage(groupJid, {
          image: { url: botimage },
          caption: fullMsg
        })
      } else {
        await sock.sendMessage(groupJid, { text: fullMsg })
      }

      const stats = await db.get('sg_stats') || { posts: 0 }
      stats.posts = (stats.posts || 0) + 1
      await db.set('sg_stats', stats)

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Posted to group\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // MANUAL POLL
    if (action === 'poll') {
      const question = args.slice(1).join(' ')
      if (!question) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Provide question\n║ Example: ${prefix}sg poll Best platform?\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      const groupJid = await db.get('sg_group_jid') || SMART_GROUP_JID
      const options = ['Railway 🚂', 'Render 🔥', 'VPS 🖥️', 'Heroku 💜']

      await sock.sendMessage(groupJid, {
        poll: {
          name: question.substring(0, 255),
          values: options,
          selectableCount: 1
        }
      })

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Poll posted to group\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}sg status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}