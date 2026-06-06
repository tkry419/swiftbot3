/**
 * SwiftBot - plugins/commands/automation/smartchannel.js
 * Smart Channel AI Manager - Full Autonomous Control
 * Posts, replies, reacts, changes name/pic, Q&A
 * Uses GROQ_API_KEY for intelligent content generation
 * Owner only, defaults to Swiftbot channel
 */

import axios from 'axios'

const DEFAULT_CHANNEL_JID = '120363426850850275@newsletter'
const DEFAULT_CHANNEL_LINK = 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G'
const DEFAULT_FOOTER = '> Smart Swiftbot'
const DEFAULT_PAIR_LINK = 'pair.swiftbot.gt.tc'

export default {
  name: 'smartchannel',
  alias: ['sc', 'channelai', 'automatechannel', 'aichannel'],
  desc: 'AI-powered WhatsApp channel manager with full control',
  usage: '[on/off/status/config] [channel_jid] [link]',
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
        enabled, channelJid, channelLink, pairLink,
        interval, autoReply, autoReact, changeName, changePic,
        groqKey, lastPost, stats
      ] = await Promise.all([
        db.get('sc_enabled'),
        db.get('sc_channel_jid'),
        db.get('sc_channel_link'),
        db.get('sc_pair_link'),
        db.get('sc_interval'),
        db.get('sc_autoreply'),
        db.get('sc_autoreact'),
        db.get('sc_changename'),
        db.get('sc_changepic'),
        db.get('GROQ_API_KEY'),
        db.get('sc_last_post'),
        db.get('sc_stats')
      ])

      const hasGroq = groqKey || process.env.GROQ_API_KEY
      const nextPost = lastPost? new Date(lastPost + (interval || 300000)).toLocaleTimeString() : 'Now'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🤖 SMART CHANNEL AI STATUS
╠═══════════════════
║ Status: ${enabled? '🟢 ON' : '🔴 OFF'}
║ AI Engine: ${hasGroq? '✅ Groq Connected' : '⚠️ Fallback Mode'}
║
║ 📍 CHANNEL CONFIG:
║ JID: ${channelJid || DEFAULT_CHANNEL_JID}
║ Link: ${channelLink || DEFAULT_CHANNEL_LINK}
║ Pair Site: ${pairLink || DEFAULT_PAIR_LINK}
║
║ ⚙️ AUTOMATION:
║ Post Interval: ${(interval || 300000) / 60000} min
║ Next Post: ${nextPost}
║ Auto Reply: ${autoReply? '✅ ON' : '❌ OFF'}
║ Auto React: ${autoReact? '✅ ON' : '❌ OFF'}
║ Change Name: ${changeName? '✅ ON' : '❌ OFF'}
║ Change Pic: ${changePic? '✅ ON' : '❌ OFF'}
║
║ 📊 STATS:
║ Posts Sent: ${stats?.posts || 0}
║ Replies: ${stats?.replies || 0}
║ Reactions: ${stats?.reactions || 0}
║ Name Changes: ${stats?.names || 0}
║ Pic Changes: ${stats?.pics || 0}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}sc on
║ ${prefix}sc off
║ ${prefix}sc set jid 120363...
║ ${prefix}sc set link https://...
║ ${prefix}sc set interval 5
║ ${prefix}sc toggle reply
║ ${prefix}sc toggle react
║ ${prefix}sc post "custom message"
║ ${prefix}sc rename "New Name"
║ ${prefix}sc repic https://...
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      await Promise.all([
        db.set('sc_enabled', true),
        db.set('sc_channel_jid', DEFAULT_CHANNEL_JID),
        db.set('sc_channel_link', DEFAULT_CHANNEL_LINK),
        db.set('sc_pair_link', DEFAULT_PAIR_LINK),
        db.set('sc_interval', 300000), // 5 min
        db.set('sc_autoreply', true),
        db.set('sc_autoreact', true),
        db.set('sc_changename', false),
        db.set('sc_changepic', false)
      ])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Smart Channel AI Enabled\n║ Channel: Swiftbot Official\n║ Interval: 5 min\n║ AI will post autonomously\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (action === 'off' || action === 'disable') {
      await db.set('sc_enabled', false)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Smart Channel AI Disabled\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SET CONFIG
    if (action === 'set') {
      const key = target?.toLowerCase()
      const value = args.slice(2).join(' ')

      const keyMap = {
        'jid': 'sc_channel_jid',
        'link': 'sc_channel_link',
        'pair': 'sc_pair_link',
        'interval': 'sc_interval'
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
        'reply': 'sc_autoreply',
        'react': 'sc_autoreact',
        'rename': 'sc_changename',
        'repic': 'sc_changepic'
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
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Provide message\n║ Example: ${prefix}sc post Hello\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      const channelJid = await db.get('sc_channel_jid') || DEFAULT_CHANNEL_JID
      const footer = DEFAULT_FOOTER
      await sock.sendMessage(channelJid, { text: `${message}\n\n${footer}` })

      const stats = await db.get('sc_stats') || { posts: 0 }
      stats.posts = (stats.posts || 0) + 1
      await db.set('sc_stats', stats)

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Posted to channel\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // RENAME CHANNEL
    if (action === 'rename') {
      const newName = args.slice(1).join(' ')
      if (!newName) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Provide new name\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      const channelJid = await db.get('sc_channel_jid') || DEFAULT_CHANNEL_JID
      try {
        await sock.newsletterUpdateName(channelJid, newName)
        const stats = await db.get('sc_stats') || { names: 0 }
        stats.names = (stats.names || 0) + 1
        await db.set('sc_stats', stats)

        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Channel Renamed\n║ New: ${newName}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Failed to rename\n║ Error: ${e.message}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CHANGE CHANNEL PIC
    if (action === 'repic') {
      const picUrl = args[1]
      if (!picUrl) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Provide image URL\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      const channelJid = await db.get('sc_channel_jid') || DEFAULT_CHANNEL_JID
      try {
        const res = await axios.get(picUrl, { responseType: 'arraybuffer', timeout: 10000 })
        const buffer = Buffer.from(res.data)
        await sock.newsletterUpdatePicture(channelJid, buffer)

        const stats = await db.get('sc_stats') || { pics: 0 }
        stats.pics = (stats.pics || 0) + 1
        await db.set('sc_stats', stats)

        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Channel Picture Updated\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Failed to update pic\n║ Error: ${e.message}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}sc status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}