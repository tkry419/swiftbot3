/**
 * SwiftBot - plugins/commands/automation/antimessages.js
 * Anti Messages Manager - Full Control
 * Block users from sending messages - Owner only
 */

export default {
  name: 'antimessages',
  alias: ['nomessages', 'antichat', 'nomsg', 'am'],
  desc: 'Block specific users or all non-admins from messaging',
  usage: '[on/off/status] [global/group] [mode]',
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
        antimessages, mode, groups, groupsEnabled,
        blockedUsers, whitelist
      ] = await Promise.all([
        db.get('antimessages'),
        db.get('antimessagesMode'),
        db.get('antimessagesGroups'),
        db.get('antimessagesGroupsEnabled'),
        db.get('antimessagesBlocked'),
        db.get('antimessagesWhitelist')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const blockedList = blockedUsers?.length? blockedUsers.map(u => u.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 💬 ANTI MESSAGES STATUS
╠═══════════════════
║ Status: ${antimessages? '🟢 ON' : '🔴 OFF'}
║ Mode: ${mode || 'blocked'}
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Blocked Users: ${blockedUsers?.length || 0}
║ ${blockedUsers?.length? '𖠁 ' + blockedList : ''}
║ Whitelisted: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 MODES:
║ blocked = Block specific users only
║ all = Block all non-admins
║
║ 📝 USAGE:
║ ${prefix}am on global
║ ${prefix}am on group
║ ${prefix}am mode blocked
║ ${prefix}am mode all
║ ${prefix}am add block 255xxx
║ ${prefix}am del block 255xxx
║ ${prefix}am add whitelist 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antimessages', true)
        await db.set('antimessagesGroupsEnabled', true)
        await db.set('antimessagesMode', 'blocked')
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Messages Enabled\n║ Mode: GLOBAL\n║ Type: Blocked users\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antimessagesGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antimessagesGroups', groups)
        }
        await db.set('antimessages', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Messages Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antimessages', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Messages Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antimessagesGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antimessagesGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Messages Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // MODE
    if (action === 'mode') {
      if (['blocked', 'all'].includes(target)) {
        await db.set('antimessagesMode', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Mode Set\n║ Type: ${target.toUpperCase()}\n║ ${target === 'all'? 'All non-admins blocked' : 'Specific users blocked'}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD
    if (action === 'add') {
      if (target === 'block' || target === 'blocked') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const blocked = await db.get('antimessagesBlocked') || []
        if (!blocked.includes(userJid)) {
          blocked.push(userJid)
          await db.set('antimessagesBlocked', blocked)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🚫 User Blocked\n║ ${value}\n║ Can't send messages\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antimessagesWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antimessagesWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'block' || target === 'blocked') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let blocked = await db.get('antimessagesBlocked') || []
        blocked = blocked.filter(u => u!== userJid)
        await db.set('antimessagesBlocked', blocked)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Unblocked\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antimessagesWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antimessagesWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antimessagesWhitelist', [])
      await db.set('antimessagesBlocked', [])
      await db.set('antimessagesGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Blocked + Whitelist + Groups\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}am status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}