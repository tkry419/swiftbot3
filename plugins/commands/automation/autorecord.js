/**
 * SwiftBot - plugins/commands/automation/autorecord.js
 * Auto Recording Manager - Full Control
 * Set time, targets, mode - Owner only
 */

export default {
  name: 'autorecord',
  alias: ['arecord', 'autorec', 'recording', 'ar'],
  desc: 'Control auto recording presence globally or per target',
  usage: '[on/off/status] [global/dm/groups/user] [time]',
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
        record, delay,
        groups, users, dmEnabled, groupsEnabled
      ] = await Promise.all([
        db.get('autrecord'),
        db.get('autrecordDelay'),
        db.get('autrecordGroups'),
        db.get('autrecordUsers'),
        db.get('autrecordDM'),
        db.get('autrecordGroupsEnabled')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'All'
      const userList = users?.length? users.map(u => u.split('@')[0]).join(', ') : 'All'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🎙️ AUTO RECORD STATUS
╠═══════════════════
║ Recording: ${record? '🟢 ON' : '🔴 OFF'}
║ Delay: ${delay || 2000}ms
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
║ ${prefix}ar on global
║ ${prefix}ar on dm
║ ${prefix}ar on groups
║ ${prefix}ar on user 255712345678
║ ${prefix}ar on group (this group)
║ ${prefix}ar off global
║ ${prefix}ar time 4000
║ ${prefix}ar add user 255xxx
║ ${prefix}ar del group
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global') {
        await db.set('autrecord', true)
        await db.set('auttyping', false)
        await db.set('autrecordDM', true)
        await db.set('autrecordGroupsEnabled', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Recording Enabled\n║ Mode: GLOBAL\n║ Target: All DMs + All Groups\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'dm' || target === 'dms' || target === 'private') {
        await db.set('autrecord', true)
        await db.set('autrecordDM', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Recording Enabled\n║ Mode: DMs ONLY\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'groups' || target === 'group' || target === 'gc') {
        await db.set('autrecord', true)
        await db.set('autrecordGroupsEnabled', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Recording Enabled\n║ Mode: GROUPS ONLY\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autrecordUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autrecordUsers', users)
        }
        await db.set('autrecord', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Recording Enabled\n║ Target: ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('autrecordGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('autrecordGroups', groups)
        }
        await db.set('autrecord', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Recording Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global') {
        await db.set('autrecord', false)
        await sock.sendPresenceUpdate('paused', from)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Recording Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'dm' || target === 'dms') {
        await db.set('autrecordDM', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Recording Disabled\n║ Mode: DMs OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'groups' || target === 'group') {
        await db.set('autrecordGroupsEnabled', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Recording Disabled\n║ Mode: GROUPS OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // TIME / DELAY
    if (action === 'time' || action === 'delay') {
      const newDelay = parseInt(target)
      if (isNaN(newDelay) || newDelay < 500 || newDelay > 10000) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid delay\n║ Range: 500-10000ms\n║ Example: ${prefix}ar time 4000\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('autrecordDelay', newDelay)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⏱️ Recording Delay Set\n║ Duration: ${newDelay}ms\n║ ${(newDelay/1000).toFixed(1)} seconds\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ADD
    if (action === 'add') {
      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autrecordUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autrecordUsers', users)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Added\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('autrecordGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('autrecordGroups', groups)
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
        let users = await db.get('autrecordUsers') || []
        users = users.filter(u => u!== userJid)
        await db.set('autrecordUsers', users)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('autrecordGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('autrecordGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Group Removed\n║ This group removed\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('autrecordUsers', [])
      await db.set('autrecordGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Targets Cleared\n║ Whitelist reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}ar status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}