/**
 * SwiftBot - plugins/commands/automation/antisticker.js
 * Anti Sticker Manager - Full Control
 * Delete stickers, warn, kick - Owner only
 */

export default {
  name: 'antisticker',
  alias: ['nosticker', 'antistik', 'nostik', 'ast'],
  desc: 'Control anti sticker protection in groups',
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
        antisticker, action_type, groups, groupsEnabled, whitelist
      ] = await Promise.all([
        db.get('antisticker'),
        db.get('antistickerAction'),
        db.get('antistickerGroups'),
        db.get('antistickerGroupsEnabled'),
        db.get('antistickerWhitelist')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🚫 ANTI STICKER STATUS
╠═══════════════════
║ Status: ${antisticker? '🟢 ON' : '🔴 OFF'}
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
║ ${prefix}ast on global
║ ${prefix}ast on group
║ ${prefix}ast off global
║ ${prefix}ast action delete
║ ${prefix}ast action warn
║ ${prefix}ast action kick
║ ${prefix}ast add whitelist 255xxx
║ ${prefix}ast del whitelist 255xxx
║ ${prefix}ast clear
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antisticker', true)
        await db.set('antistickerGroupsEnabled', true)
        await db.set('antistickerAction', 'delete')
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Sticker Enabled\n║ Mode: GLOBAL\n║ Action: Delete\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antistickerGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antistickerGroups', groups)
        }
        await db.set('antisticker', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Sticker Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antisticker', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Sticker Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antistickerGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antistickerGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Sticker Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antistickerAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD WHITELIST
    if (action === 'add') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antistickerWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antistickerWhitelist', whitelist)
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
        let whitelist = await db.get('antistickerWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antistickerWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antistickerWhitelist', [])
      await db.set('antistickerGroups', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Whitelist + Groups reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}ast status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}