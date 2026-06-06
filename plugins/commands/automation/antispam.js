/**
 * SwiftBot - plugins/commands/automation/antispam.js
 * Anti Spam Manager - Full Control
 * Delete spam, warn, kick - Owner only
 */

export default {
  name: 'antispam',
  alias: ['nospam', 'antiflood', 'spam', 'as'],
  desc: 'Control anti spam protection in groups',
  usage: '[on/off/status] [global/group] [limit] [time]',
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
        antispam, action_type, limit, window,
        groups, groupsEnabled, whitelist
      ] = await Promise.all([
        db.get('antispam'),
        db.get('antispamAction'),
        db.get('antispamLimit'),
        db.get('antispamWindow'),
        db.get('antispamGroups'),
        db.get('antispamGroupsEnabled'),
        db.get('antispamWhitelist')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🚫 ANTI SPAM STATUS
╠═══════════════════
║ Status: ${antispam? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║ Limit: ${limit || 5} msgs
║ Window: ${window || 10}s
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Whitelisted Users: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}as on global
║ ${prefix}as on group
║ ${prefix}as off global
║ ${prefix}as action delete
║ ${prefix}as action warn
║ ${prefix}as action kick
║ ${prefix}as limit 5
║ ${prefix}as time 10
║ ${prefix}as add whitelist 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antispam', true)
        await db.set('antispamGroupsEnabled', true)
        await db.set('antispamAction', 'delete')
        await db.set('antispamLimit', 5)
        await db.set('antispamWindow', 10)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Spam Enabled\n║ Mode: GLOBAL\n║ Limit: 5 msgs/10s\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antispamGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antispamGroups', groups)
        }
        await db.set('antispam', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Spam Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antispam', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Spam Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antispamGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antispamGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Spam Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antispamAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // LIMIT
    if (action === 'limit') {
      const newLimit = parseInt(target)
      if (isNaN(newLimit) || newLimit < 2 || newLimit > 20) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid limit\n║ Range: 2-20 msgs\n║ Example: ${prefix}as limit 5\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('antispamLimit', newLimit)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Limit Set\n║ Messages: ${newLimit}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // TIME WINDOW
    if (action === 'time' || action === 'window') {
      const newWindow = parseInt(target)
      if (isNaN(newWindow) || newWindow < 3 || newWindow > 60) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid window\n║ Range: 3-60 seconds\n║ Example: ${prefix}as time 10\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('antispamWindow', newWindow)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⏱️ Time Window Set\n║ Duration: ${newWindow}s\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ADD WHITELIST
    if (action === 'add') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antispamWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antispamWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antispamWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antispamWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antispamWhitelist', [])
      await db.set('antispamGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Whitelist + Groups reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}as status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}