/**
 * SwiftBot - plugins/commands/automation/antiemoji.js
 * Anti Emoji Manager - Full Control
 * Delete emoji spam, warn, kick - Owner only
 */

export default {
  name: 'antiemoji',
  alias: ['noemoji', 'antimojis', 'noemojis', 'ae'],
  desc: 'Control anti emoji spam protection in groups',
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
        antiemoji, action_type, limit, groups, groupsEnabled, whitelist
      ] = await Promise.all([
        db.get('antiemoji'),
        db.get('antiemojiAction'),
        db.get('antiemojiLimit'),
        db.get('antiemojiGroups'),
        db.get('antiemojiGroupsEnabled'),
        db.get('antiemojiWhitelist')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 😀 ANTI EMOJI STATUS
╠═══════════════════
║ Status: ${antiemoji? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║ Limit: ${limit || 10} emojis
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Whitelisted Users: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}ae on global
║ ${prefix}ae on group
║ ${prefix}ae off global
║ ${prefix}ae action delete
║ ${prefix}ae action warn
║ ${prefix}ae action kick
║ ${prefix}ae limit 10
║ ${prefix}ae add whitelist 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antiemoji', true)
        await db.set('antiemojiGroupsEnabled', true)
        await db.set('antiemojiAction', 'delete')
        await db.set('antiemojiLimit', 10)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Emoji Enabled\n║ Mode: GLOBAL\n║ Limit: 10 emojis/msg\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antiemojiGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antiemojiGroups', groups)
        }
        await db.set('antiemoji', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Emoji Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antiemoji', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Emoji Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antiemojiGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antiemojiGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Emoji Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antiemojiAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // LIMIT
    if (action === 'limit') {
      const newLimit = parseInt(target)
      if (isNaN(newLimit) || newLimit < 3 || newLimit > 50) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid limit\n║ Range: 3-50 emojis\n║ Example: ${prefix}ae limit 10\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('antiemojiLimit', newLimit)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Limit Set\n║ Emojis: ${newLimit}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ADD WHITELIST
    if (action === 'add') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antiemojiWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antiemojiWhitelist', whitelist)
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
        let whitelist = await db.get('antiemojiWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antiemojiWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antiemojiWhitelist', [])
      await db.set('antiemojiGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Whitelist + Groups reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}ae status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}