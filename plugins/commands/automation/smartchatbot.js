/**
 * SwiftBot - plugins/commands/automation/smartchatbot.js
 * Smart Chatbot - AI Acts as Number Owner
 * Replies to DMs, mentions, with full context memory
 * Uses GROQ_API_KEY for human-like responses
 * Owner only
 */

import axios from 'axios'

export default {
  name: 'smartchatbot',
  alias: ['scb', 'aichat', 'autoreply', 'smartbot'],
  desc: 'AI chatbot that acts as you - replies to DMs and mentions',
  usage: '[on/off/status/config] [mode]',
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
    const target = args[1]?.toLowerCase()

    // STATUS
    if (!action || action === 'status' || action === 'info') {
      const [
        enabled, mode, replyDMs, replyGroups, replyMentions,
        personality, language, groqKey, stats, whitelist
      ] = await Promise.all([
        db.get('scb_enabled'),
        db.get('scb_mode'),
        db.get('scb_reply_dms'),
        db.get('scb_reply_groups'),
        db.get('scb_reply_mentions'),
        db.get('scb_personality'),
        db.get('scb_language'),
        db.get('GROQ_API_KEY'),
        db.get('scb_stats'),
        db.get('scb_whitelist')
      ])

      const hasGroq = groqKey || process.env.GROQ_API_KEY
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🤖 SMART CHATBOT STATUS
╠═══════════════════
║ Status: ${enabled? '🟢 ON' : '🔴 OFF'}
║ Mode: ${mode || 'friendly'}
║ AI Engine: ${hasGroq? '✅ Groq Connected' : '⚠️ Fallback Mode'}
║ Language: ${language || 'auto'}
║ Personality: ${personality || 'default'}
║
║ ⚙️ REPLY SETTINGS:
║ DMs: ${replyDMs!== false? '✅ ON' : '❌ OFF'}
║ Groups: ${replyGroups? '✅ ON' : '❌ OFF'}
║ Mentions: ${replyMentions!== false? '✅ ON' : '❌ OFF'}
║
║ 📍 WHITELIST ONLY: ${whitelist?.length || 0} users
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
║
║ 📊 STATS:
║ Messages Replied: ${stats?.replies || 0}
║ DMs Handled: ${stats?.dms || 0}
║ Groups Handled: ${stats?.groups || 0}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}scb on
║ ${prefix}scb off
║ ${prefix}scb mode friendly
║ ${prefix}scb mode professional
║ ${prefix}scb mode savage
║ ${prefix}scb toggle dms
║ ${prefix}scb toggle groups
║ ${prefix}scb add whitelist 255xxx
║ ${prefix}scb set personality "funny and helpful"
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      await Promise.all([
        db.set('scb_enabled', true),
        db.set('scb_mode', 'friendly'),
        db.set('scb_reply_dms', true),
        db.set('scb_reply_groups', false),
        db.set('scb_reply_mentions', true),
        db.set('scb_language', 'auto'),
        db.set('scb_personality', 'friendly, helpful, human-like, acts as the number owner')
      ])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Smart Chatbot Enabled\n║ Mode: FRIENDLY\n║ Replying to DMs & Mentions\n║ AI acts as YOU\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (action === 'off' || action === 'disable') {
      await db.set('scb_enabled', false)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Smart Chatbot Disabled\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // MODE
    if (action === 'mode') {
      const modes = ['friendly', 'professional', 'savage', 'funny', 'formal', 'casual']
      if (modes.includes(target)) {
        await db.set('scb_mode', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Chatbot Mode Set\n║ Mode: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // TOGGLE
    if (action === 'toggle') {
      const feature = target
      const toggleMap = {
        'dms': 'scb_reply_dms',
        'groups': 'scb_reply_groups',
        'mentions': 'scb_reply_mentions'
      }

      if (toggleMap[feature]) {
        const current = await db.get(toggleMap[feature])
        await db.set(toggleMap[feature],!current)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ ${feature.toUpperCase()} ${!current? 'ON' : 'OFF'}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // WHITELIST
    if (action === 'add' && target === 'whitelist') {
      const value = args[2]
      const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
      const whitelist = await db.get('scb_whitelist') || []
      if (!whitelist.includes(userJid)) {
        whitelist.push(userJid)
        await db.set('scb_whitelist', whitelist)
      }
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${value}\n║ Bot will reply to them\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (action === 'del' && target === 'whitelist') {
      const value = args[2]
      const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
      let whitelist = await db.get('scb_whitelist') || []
      whitelist = whitelist.filter(u => u!== userJid)
      await db.set('scb_whitelist', whitelist)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SET PERSONALITY
    if (action === 'set' && target === 'personality') {
      const personality = args.slice(2).join(' ')
      await db.set('scb_personality', personality)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Personality Set\n║ ${personality}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SET LANGUAGE
    if (action === 'set' && target === 'language') {
      const lang = args[2] || 'auto'
      await db.set('scb_language', lang)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Language Set\n║ ${lang}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}scb status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}