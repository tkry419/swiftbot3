/**
 * SwiftBot - plugins/commands/automation/antitag.js
 * Anti Tag Manager - Full Control
 * Block tagall, hidetag, mention spam - Owner only
 */

export default {
  name: 'antitag',
  alias: ['notag', 'antimention', 'notagall', 'at'],
  desc: 'Control anti tag-all and mention spam protection',
  usage: '[on/off/status] [global/group] [limit]',
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
        antitag, action_type, limit, groups, groupsEnabled, whitelist
      ] = await Promise.all([
        db.get('antitag'),
        db.get('antitagAction'),
        db.get('antitagLimit'),
        db.get('antitagGroups'),
        db.get('antitagGroupsEnabled'),
        db.get('antitagWhitelist')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🏷️ ANTI TAG STATUS
╠═══════════════════
║ Status: ${antitag? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║ Limit: ${limit || 5} mentions
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Whitelisted Users: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 BLOCKS:
║ • Tag All / HideTag
║ • ${limit || 5}+ mentions in one msg
║
║ 📝 USAGE:
║ ${prefix}at on global
║ ${prefix}at on group
║ ${prefix}at off global
║ ${prefix}at action delete
║ ${prefix}at action warn
║ ${prefix}at action kick
║ ${prefix}at limit 5
║ ${prefix}at add whitelist 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antitag', true)
        await db.set('antitagGroupsEnabled', true)
        await db.set('antitagAction', 'delete')
        await db.set('antitagLimit', 5)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Tag Enabled\n║ Mode: GLOBAL\n║ Limit: 5 mentions\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antitagGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antitagGroups', groups)
        }
        await db.set('antitag', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Tag Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antitag', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Tag Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antitagGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antitagGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Tag Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antitagAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // LIMIT
    if (action === 'limit') {
      const newLimit = parseInt(target)
      if (isNaN(newLimit) || newLimit < 2 || newLimit > 50) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid limit\n║ Range: 2-50 mentions\n║ Example: ${prefix}at limit 5\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('antitagLimit', newLimit)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Limit Set\n║ Mentions: ${newLimit}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ADD WHITELIST
    if (action === 'add') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antitagWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antitagWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${value}\n║ Can use tag-all\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antitagWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antitagWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antitagWhitelist', [])
      await db.set('antitagGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Whitelist + Groups reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}at status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}