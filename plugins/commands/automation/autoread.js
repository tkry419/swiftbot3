/**
 * SwiftBot - plugins/commands/automation/autoread.js
 * Auto Read Manager - Full Control
 * Set targets, mode - Owner only
 */

export default {
  name: 'autoread',
  alias: ['aread', 'autoview', 'read', 'ar2'],
  desc: 'Control auto read/blue tick presence globally or per target',
  usage: '[on/off/status] [global/dm/groups/user]',
  category: 'Automation',
  permission: 'owner',

  execute: async (sock, m, args, { db, prefix, isOwner }) => {
    const from = m.key.remoteJid
    const isGroup = from.endsWith('@g.us')

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
        read, groups, users, dmEnabled, groupsEnabled
      ] = await Promise.all([
        db.get('autoread'),
        db.get('autoreadGroups'),
        db.get('autoreadUsers'),
        db.get('autoreadDM'),
        db.get('autoreadGroupsEnabled')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'All'
      const userList = users?.length? users.map(u => u.split('@')[0]).join(', ') : 'All'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 👁️ AUTO READ STATUS
╠═══════════════════
║ Read: ${read? '🟢 ON' : '🔴 OFF'}
║
║ 📍 TARGETS:
║ DM Global: ${dmEnabled!== false? '✅ ON' : '❌ OFF'}
║ Groups Global: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Specific Users: ${users?.length || 0}
║ ${users?.length? '𖠁 ' + userList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}read on global
║ ${prefix}read on dm
║ ${prefix}read on groups
║ ${prefix}read on user 255712345678
║ ${prefix}read on group (this group)
║ ${prefix}read off global
║ ${prefix}read add user 255xxx
║ ${prefix}read del group
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global') {
        await db.set('autoread', true)
        await db.set('autoreadDM', true)
        await db.set('autoreadGroupsEnabled', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Read Enabled\n║ Mode: GLOBAL\n║ Target: All DMs + All Groups\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'dm' || target === 'dms' || target === 'private') {
        await db.set('autoread', true)
        await db.set('autoreadDM', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Read Enabled\n║ Mode: DMs ONLY\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'groups' || target === 'group' || target === 'gc') {
        await db.set('autoread', true)
        await db.set('autoreadGroupsEnabled', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Read Enabled\n║ Mode: GROUPS ONLY\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autoreadUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autoreadUsers', users)
        }
        await db.set('autoread', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Read Enabled\n║ Target: ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('autoreadGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('autoreadGroups', groups)
        }
        await db.set('autoread', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Read Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global') {
        await db.set('autoread', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Read Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'dm' || target === 'dms') {
        await db.set('autoreadDM', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Read Disabled\n║ Mode: DMs OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'groups' || target === 'group') {
        await db.set('autoreadGroupsEnabled', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Read Disabled\n║ Mode: GROUPS OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD
    if (action === 'add') {
      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autoreadUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autoreadUsers', users)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Added\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('autoreadGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('autoreadGroups', groups)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Group Added\n║ This group whitelisted\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let users = await db.get('autoreadUsers') || []
        users = users.filter(u => u!== userJid)
        await db.set('autoreadUsers', users)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('autoreadGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('autoreadGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Group Removed\n║ This group removed\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('autoreadUsers', [])
      await db.set('autoreadGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Targets Cleared\n║ Whitelist reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}read status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}