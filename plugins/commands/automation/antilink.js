/**
 * SwiftBot - plugins/commands/automation/antilink.js
 * Anti Link Manager - Full Control
 * Delete links, warn, kick - Owner only
 */

export default {
  name: 'antilink',
  alias: ['nolink', 'antilik', 'nolinks', 'al'],
  desc: 'Control anti-link protection in groups',
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
    const punishment = args[2]?.toLowerCase()

    // STATUS
    if (!action || action === 'status' || action === 'info') {
      const [
        antilink, action_type, groups, groupsEnabled, whitelist
      ] = await Promise.all([
        db.get('antilink'),
        db.get('antilinkAction'),
        db.get('antilinkGroups'),
        db.get('antilinkGroupsEnabled'),
        db.get('antilinkWhitelist')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🔗 ANTI LINK STATUS
╠═══════════════════
║ Status: ${antilink? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Whitelisted Users: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}al on global
║ ${prefix}al on group (this group)
║ ${prefix}al off global
║ ${prefix}al action delete
║ ${prefix}al action warn
║ ${prefix}al action kick
║ ${prefix}al add whitelist 255xxx
║ ${prefix}al del whitelist 255xxx
║ ${prefix}al clear
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antilink', true)
        await db.set('antilinkGroupsEnabled', true)
        await db.set('antilinkAction', 'delete')
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Link Enabled\n║ Mode: GLOBAL\n║ Action: Delete\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antilinkGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antilinkGroups', groups)
        }
        await db.set('antilink', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Link Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antilink', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Link Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antilinkGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antilinkGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Link Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antilinkAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD WHITELIST
    if (action === 'add') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = punishment?.includes('@')? punishment : `${punishment}@s.whatsapp.net`
        const whitelist = await db.get('antilinkWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antilinkWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${punishment}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = punishment?.includes('@')? punishment : `${punishment}@s.whatsapp.net`
        let whitelist = await db.get('antilinkWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antilinkWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${punishment}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antilinkWhitelist', [])
      await db.set('antilinkGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Whitelist + Groups reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}al status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}