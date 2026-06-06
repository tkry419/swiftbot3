/**
 * SwiftBot - plugins/commands/automation/smartguard.js
 * Smart Guard AI - Ultimate Protection System
 * Detects: spam, bots, raids, flood, toxic, links, virus, crash
 * AI decides: delete/warn/kick/ban using GROQ_API_KEY
 * Owner only, full autonomous control
 */

import axios from 'axios'

export default {
  name: 'smartguard',
  alias: ['sg', 'aiguard', 'autoprotect', 'ultraguard'],
  desc: 'AI Super Guard - Full autonomous protection',
  usage: '[on/off/status/mode] [global/group]',
  category: 'Automation',
  permission: 'owner',

  execute: async (sock, m, args, { db, prefix, isOwner, isGroup }) => {
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
        enabled, mode, groups, groupsEnabled, groqKey,
        spamLevel, botLevel, toxicLevel, raidLevel, linkLevel,
        stats
      ] = await Promise.all([
        db.get('sg_enabled'),
        db.get('sg_mode'),
        db.get('sg_groups'),
        db.get('sg_groups_enabled'),
        db.get('GROQ_API_KEY'),
        db.get('sg_spam_level'),
        db.get('sg_bot_level'),
        db.get('sg_toxic_level'),
        db.get('sg_raid_level'),
        db.get('sg_link_level'),
        db.get('sg_stats')
      ])

      const hasGroq = groqKey || process.env.GROQ_API_KEY
      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🛡️ SMART GUARD AI STATUS
╠═══════════════════
║ Status: ${enabled? '🟢 ACTIVE' : '🔴 OFF'}
║ AI Mode: ${mode || 'adaptive'}
║ AI Engine: ${hasGroq? '✅ Groq Online' : '⚠️ Heuristic Mode'}
║
║ 📍 PROTECTION SCOPE:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║
║ 🎯 DETECTION LEVELS:
║ Spam: ${spamLevel || 'medium'}
║ Bots: ${botLevel || 'high'}
║ Toxic: ${toxicLevel || 'medium'}
║ Raid: ${raidLevel || 'high'}
║ Links: ${linkLevel || 'smart'}
║ Flood: ✅ Auto
║ Crash: ✅ Auto
║ Virus: ✅ Auto
║
║ 📊 STATS:
║ Messages Scanned: ${stats?.scanned || 0}
║ Threats Blocked: ${stats?.blocked || 0}
║ Users Kicked: ${stats?.kicked || 0}
║ Users Warned: ${stats?.warned || 0}
║ Links Deleted: ${stats?.links || 0}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}sg on global
║ ${prefix}sg on group
║ ${prefix}sg off global
║ ${prefix}sg mode adaptive
║ ${prefix}sg mode strict
║ ${prefix}sg mode paranoid
║ ${prefix}sg level spam high
║ ${prefix}sg whitelist add 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await Promise.all([
          db.set('sg_enabled', true),
          db.set('sg_groups_enabled', true),
          db.set('sg_mode', 'adaptive'),
          db.set('sg_spam_level', 'medium'),
          db.set('sg_bot_level', 'high'),
          db.set('sg_toxic_level', 'medium'),
          db.set('sg_raid_level', 'high'),
          db.set('sg_link_level', 'smart')
        ])
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Smart Guard Activated\n║ Mode: ADAPTIVE AI\n║ Protecting ALL groups\n║ Zero tolerance: bots, raids\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('sg_groups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('sg_groups', groups)
        }
        await db.set('sg_enabled', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Smart Guard Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global') {
        await db.set('sg_enabled', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Smart Guard Disabled\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('sg_groups') || []
        groups = groups.filter(g => g!== from)
        await db.set('sg_groups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Smart Guard Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // MODE
    if (action === 'mode') {
      const modes = ['adaptive', 'strict', 'paranoid', 'lenient']
      if (modes.includes(target)) {
        await db.set('sg_mode', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ AI Mode Set\n║ Mode: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // LEVEL
    if (action === 'level') {
      const type = target
      const level = args[2]?.toLowerCase()
      const levels = ['low', 'medium', 'high', 'smart']
      const keyMap = {
        'spam': 'sg_spam_level',
        'bot': 'sg_bot_level',
        'toxic': 'sg_toxic_level',
        'raid': 'sg_raid_level',
        'link': 'sg_link_level'
      }

      if (keyMap[type] && levels.includes(level)) {
        await db.set(keyMap[type], level)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ ${type.toUpperCase()} Level Set\n║ Level: ${level.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // WHITELIST
    if (action === 'whitelist') {
      if (target === 'add') {
        const value = args[2]
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('sg_whitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('sg_whitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${value}\n║ Immune to Smart Guard\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'del') {
        const value = args[2]
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('sg_whitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('sg_whitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}sg status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}