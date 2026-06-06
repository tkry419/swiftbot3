/**
 * SwiftBot - plugins/commands/automation/antibots.js
 * Anti Bots Manager - Full Control
 * Delete bot messages, warn, kick - Owner only
 */

export default {
  name: 'antibots',
  alias: ['nobots', 'antibot', 'nobots', 'abt'],
  desc: 'Control anti bot protection in groups',
  usage: '[on/off/status] [global/group] [action]',
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
    const value = args[2]

    // STATUS
    if (!action || action === 'status' || action === 'info') {
      const [
        antibots, action_type, groups, groupsEnabled,
        botList, whitelist
      ] = await Promise.all([
        db.get('antibots'),
        db.get('antibotsAction'),
        db.get('antibotsGroups'),
        db.get('antibotsGroupsEnabled'),
        db.get('antibotsList'),
        db.get('antibotsWhitelist')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const botJids = botList?.length? botList.map(u => u.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🤖 ANTI BOTS STATUS
╠═══════════════════
║ Status: ${antibots? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║ Auto Detect: ON
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Blacklisted Bots: ${botList?.length || 0}
║ ${botList?.length? '𖠁 ' + botJids : ''}
║ Whitelisted Bots: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}abt on global
║ ${prefix}abt on group
║ ${prefix}abt off global
║ ${prefix}abt action delete
║ ${prefix}abt action kick
║ ${prefix}abt add bot 255xxx
║ ${prefix}abt del bot 255xxx
║ ${prefix}abt add whitelist 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antibots', true)
        await db.set('antibotsGroupsEnabled', true)
        await db.set('antibotsAction', 'delete')
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Bots Enabled\n║ Mode: GLOBAL\n║ Auto Detect: ON\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antibotsGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antibotsGroups', groups)
        }
        await db.set('antibots', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Bots Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antibots', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Bots Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antibotsGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antibotsGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Bots Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antibotsAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD BOT TO BLACKLIST
    if (action === 'add') {
      if (target === 'bot' || target === 'blacklist') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const botList = await db.get('antibotsList') || []
        if (!botList.includes(userJid)) {
          botList.push(userJid)
          await db.set('antibotsList', botList)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🤖 Bot Blacklisted\n║ ${value}\n║ Will be auto-deleted\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antibotsWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antibotsWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Bot Whitelisted\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'bot' || target === 'blacklist') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let botList = await db.get('antibotsList') || []
        botList = botList.filter(u => u!== userJid)
        await db.set('antibotsList', botList)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Bot Unblacklisted\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antibotsWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antibotsWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Bot Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antibotsWhitelist', [])
      await db.set('antibotsList', [])
      await db.set('antibotsGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Blacklist + Whitelist + Groups\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}abt status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}