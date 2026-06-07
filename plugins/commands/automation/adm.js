/**
 * SwiftBot - plugins/commands/automation/autosupergroupmanager.js
 * Auto Super Group Manager - Full AI Control
 * AI decides: kick/delete/warn, link safety, night mode, greetings, spam detection
 * Uses GROQ_API_KEY for message generation
 * Owner only
 */

import axios from 'axios'

export default {
  name: 'autosupergroupmanager',
  alias: ['asgm', 'supergroup', 'automanager', 'aimod'],
  desc: 'AI-powered group manager with full automation',
  usage: '[on/off/status/config] [global/group]',
  category: 'Automation',
  permission: 'owner',

  execute: async (sock, m, args, { db, prefix, isOwner, isGroup }) => {
    const from = m.key.remoteJid

    if (!isOwner) {
      return await sock.sendMessage(from, {
        text: `╭━━━━❮ ᴇʀʀᴏʀ ❯━⊷\n┃➠ Owner only command\n╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    const action = args[0]?.toLowerCase()
    const target = args[1]?.toLowerCase()

    // STATUS
    if (!action || action === 'status' || action === 'info') {
      const [
        enabled, mode, groups, groupsEnabled,
        nightMode, morningTime, nightTime,
        autoApprove, autoGreet, linkFilter,
        spamDetect, botDetect, groqKey
      ] = await Promise.all([
        db.get('asgm_enabled'),
        db.get('asgm_mode'),
        db.get('asgm_groups'),
        db.get('asgm_groups_enabled'),
        db.get('asgm_nightmode'),
        db.get('asgm_morning_time'),
        db.get('asgm_night_time'),
        db.get('asgm_autoapprove'),
        db.get('asgm_autogreet'),
        db.get('asgm_linkfilter'),
        db.get('asgm_spamdetect'),
        db.get('asgm_botdetect'),
        db.get('GROQ_API_KEY')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const hasGroq = groqKey || process.env.GROQ_API_KEY

      return await sock.sendMessage(from, {
        text: `╭━━━━❮ ᴀᴜᴛᴏ sᴜᴘᴇʀ ɢʀᴏᴜᴘ ᴍᴀɴᴀɢᴇʀ ❯━⊷
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ sᴛᴀᴛᴜs ❯━⊷
┃➠ Status: ${enabled? '🟢 ON' : '🔴 OFF'}
┃➠ AI Mode: ${mode || 'smart'}
┃➠ Groq API: ${hasGroq? '✅ Connected' : '❌ Using Defaults'}
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ ᴛᴀʀɢᴇᴛs ❯━⊷
┃➠ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
┃➠ Specific Groups: ${groups?.length || 0}
┃ ${groups?.length? '➠ ' + groupList : ''}
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ ғᴇᴀᴛᴜʀᴇs ❯━⊷
┃➠ Night Mode: ${nightMode? `✅ ${nightTime || '22:00'}-${morningTime || '06:00'}` : '❌ OFF'}
┃➠ Auto Approve: ${autoApprove? '✅ ON' : '❌ OFF'}
┃➠ Auto Greet: ${autoGreet? '✅ ON' : '❌ OFF'}
┃➠ Link Filter: ${linkFilter? '✅ AI Scan' : '❌ OFF'}
┃➠ Spam Detect: ${spamDetect? '✅ ON' : '❌ OFF'}
┃➠ Bot Detect: ${botDetect? '✅ ON' : '❌ OFF'}
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ ᴀɪ ᴀᴄᴛɪᴏɴs ❯━⊷
┃➠ Auto kick/warn/delete
┃➠ Link safety check
┃➠ Spam/bot detection
┃➠ Group description updates
┃➠ Smart greetings
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ ᴜsᴀɢᴇ ❯━⊷
┃➠ ${prefix}asgm on global
┃➠ ${prefix}asgm on group
┃➠ ${prefix}asgm off global
┃➠ ${prefix}asgm mode smart
┃➠ ${prefix}asgm mode strict
┃➠ ${prefix}asgm nightmode 22:00 06:00
┃➠ ${prefix}asgm toggle approve
┃➠ ${prefix}asgm toggle greet
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await Promise.all([
          db.set('asgm_enabled', true),
          db.set('asgm_groups_enabled', true),
          db.set('asgm_mode', 'smart'),
          db.set('asgm_nightmode', false),
          db.set('asgm_autoapprove', true),
          db.set('asgm_autogreet', true),
          db.set('asgm_linkfilter', true),
          db.set('asgm_spamdetect', true),
          db.set('asgm_botdetect', true)
        ])
        return await sock.sendMessage(from, {
          text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ Auto Super Group Manager ON\n┃➠ Mode: SMART AI\n┃➠ All features enabled\n╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('asgm_groups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('asgm_groups', groups)
        }
        await db.set('asgm_enabled', true)
        return await sock.sendMessage(from, {
          text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ ASGM Enabled\n┃➠ Target: THIS GROUP\n╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }
    }

    // OFF
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global') {
        await db.set('asgm_enabled', false)
        return await sock.sendMessage(from, {
          text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ Auto Super Group Manager OFF\n╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('asgm_groups') || []
        groups = groups.filter(g => g!== from)
        await db.set('asgm_groups', groups)
        return await sock.sendMessage(from, {
          text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ ASGM Disabled\n┃➠ Target: THIS GROUP\n╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }
    }

    // MODE
    if (action === 'mode') {
      if (['smart', 'strict', 'lenient'].includes(target)) {
        await db.set('asgm_mode', target)
        return await sock.sendMessage(from, {
          text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ AI Mode Set\n┃➠ Mode: ${target.toUpperCase()}\n╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }
    }

    // NIGHT MODE
    if (action === 'nightmode' || action === 'night') {
      if (target === 'off') {
        await db.set('asgm_nightmode', false)
        return await sock.sendMessage(from, {
          text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ Night Mode OFF\n╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }

      const nightTime = target || '22:00'
      const morningTime = args[2] || '06:00'
      await db.set('asgm_nightmode', true)
      await db.set('asgm_night_time', nightTime)
      await db.set('asgm_morning_time', morningTime)
      return await sock.sendMessage(from, {
        text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ Night Mode ON\n┃➠ Close: ${nightTime}\n┃➠ Open: ${morningTime}\n╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    // TOGGLE FEATURES
    if (action === 'toggle') {
      const feature = target
      const keyMap = {
        'approve': 'asgm_autoapprove',
        'greet': 'asgm_autogreet',
        'link': 'asgm_linkfilter',
        'spam': 'asgm_spamdetect',
        'bot': 'asgm_botdetect'
      }

      if (keyMap[feature]) {
        const current = await db.get(keyMap[feature])
        await db.set(keyMap[feature],!current)
        return await sock.sendMessage(from, {
          text: `╭━━━━❮ sᴜᴄᴄᴇss ❯━⊷\n┃➠ ${feature.toUpperCase()} ${!current? 'ON' : 'OFF'}\n╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╭━━━━❮ ᴇʀʀᴏʀ ❯━⊷\n┃➠ Invalid command\n┃➠ Use: ${prefix}asgm status\n╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}