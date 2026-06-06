/**
 * SwiftBot - plugins/commands/automation/autotyping.js
 * Auto Typing & Recording Manager - Full Control
 * Set time, targets, mode - Owner only
 */

export default {
  name: 'autotyping',
  alias: ['atyping', 'autotype', 'typing', 'at'],
  desc: 'Control auto typing/recording presence globally or per target',
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
        typing, record, delay,
        groups, users, dmEnabled, groupsEnabled
      ] = await Promise.all([
        db.get('autotyping'),
        db.get('autrecord'),
        db.get('autotypingDelay'),
        db.get('autotypingGroups'),
        db.get('autotypingUsers'),
        db.get('autotypingDM'),
        db.get('autotypingGroupsEnabled')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'All'
      const userList = users?.length? users.map(u => u.split('@')[0]).join(', ') : 'All'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🤖 AUTO TYPING STATUS
╠═══════════════════
║ Typing: ${typing? '🟢 ON' : '🔴 OFF'}
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
║ ${prefix}at on global
║ ${prefix}at on dm
║ ${prefix}at on groups
║ ${prefix}at on user 255712345678
║ ${prefix}at on group (this group)
║ ${prefix}at off global
║ ${prefix}at time 3000
║ ${prefix}at record on
║ ${prefix}at add user 255xxx
║ ${prefix}at del group
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global') {
        await db.set('autotyping', true)
        await db.set('autrecord', false)
        await db.set('autotypingDM', true)
        await db.set('autotypingGroupsEnabled', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Typing Enabled\n║ Mode: GLOBAL\n║ Target: All DMs + All Groups\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'dm' || target === 'dms' || target === 'private') {
        await db.set('autotyping', true)
        await db.set('autrecord', false)
        await db.set('autotypingDM', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Typing Enabled\n║ Mode: DMs ONLY\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'groups' || target === 'group' || target === 'gc') {
        await db.set('autotyping', true)
        await db.set('autrecord', false)
        await db.set('autotypingGroupsEnabled', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Typing Enabled\n║ Mode: GROUPS ONLY\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autotypingUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autotypingUsers', users)
        }
        await db.set('autotyping', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Typing Enabled\n║ Target: ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('autotypingGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('autotypingGroups', groups)
        }
        await db.set('autotyping', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Typing Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global') {
        await db.set('autotyping', false)
        await db.set('autrecord', false)
        await sock.sendPresenceUpdate('paused', from)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Typing Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'dm' || target === 'dms') {
        await db.set('autotypingDM', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Typing Disabled\n║ Mode: DMs OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'groups' || target === 'group') {
        await db.set('autotypingGroupsEnabled', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Typing Disabled\n║ Mode: GROUPS OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // RECORD MODE
    if (action === 'record' || action === 'recording') {
      if (target === 'on' ||!target) {
        await db.set('autrecord', true)
        await db.set('autotyping', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🎙️ Auto Recording Enabled\n║ Bot will show recording...\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // TIME / DELAY
    if (action === 'time' || action === 'delay') {
      const newDelay = parseInt(target)
      if (isNaN(newDelay) || newDelay < 500 || newDelay > 10000) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid delay\n║ Range: 500-10000ms\n║ Example: ${prefix}at time 3000\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('autotypingDelay', newDelay)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⏱️ Typing Delay Set\n║ Duration: ${newDelay}ms\n║ ${(newDelay/1000).toFixed(1)} seconds\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ADD
    if (action === 'add') {
      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autotypingUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autotypingUsers', users)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Added\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('autotypingGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('autotypingGroups', groups)
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
        let users = await db.get('autotypingUsers') || []
        users = users.filter(u => u!== userJid)
        await db.set('autotypingUsers', users)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('autotypingGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('autotypingGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Group Removed\n║ This group removed\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('autotypingUsers', [])
      await db.set('autotypingGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Targets Cleared\n║ Whitelist reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}at status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}