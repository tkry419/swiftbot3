/**
 * SwiftBot - plugins/commands/automation/antireact.js
 * Anti React Bots Manager - Full Control
 * Block bots that auto-react to all messages - Owner only
 */

export default {
  name: 'antireact',
  alias: ['noreact', 'antireaction', 'noautoreact', 'ar'],
  desc: 'Block bots that auto-react to group messages',
  usage: '[on/off/status] [global/group] [threshold]',
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
        antireact, action_type, threshold, groups, groupsEnabled,
        blockedBots, whitelist, stats
      ] = await Promise.all([
        db.get('antireact'),
        db.get('antireactAction'),
        db.get('antireactThreshold'),
        db.get('antireactGroups'),
        db.get('antireactGroupsEnabled'),
        db.get('antireactBlocked'),
        db.get('antireactWhitelist'),
        db.get('antireactStats')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const blockedList = blockedBots?.length? blockedBots.map(u => u.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 👆 ANTI REACT BOTS STATUS
╠═══════════════════
║ Status: ${antireact? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║ Threshold: ${threshold || 8} reacts/min
║
║ 📊 STATS:
║ Bots Blocked: ${blockedBots?.length || 0}
║ Reactions Blocked: ${stats?.blocked || 0}
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Blacklisted Bots: ${blockedBots?.length || 0}
║ ${blockedBots?.length? '𖠁 ' + blockedList : ''}
║ Whitelisted: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}ar on global
║ ${prefix}ar on group
║ ${prefix}ar off global
║ ${prefix}ar action delete
║ ${prefix}ar action kick
║ ${prefix}ar threshold 8
║ ${prefix}ar add block 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antireact', true)
        await db.set('antireactGroupsEnabled', true)
        await db.set('antireactAction', 'delete')
        await db.set('antireactThreshold', 8)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti React Enabled\n║ Mode: GLOBAL\n║ Threshold: 8 reacts/min\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antireactGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antireactGroups', groups)
        }
        await db.set('antireact', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti React Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antireact', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti React Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antireactGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antireactGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti React Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antireactAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // THRESHOLD
    if (action === 'threshold') {
      const newThreshold = parseInt(target)
      if (isNaN(newThreshold) || newThreshold < 3 || newThreshold > 30) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid threshold\n║ Range: 3-30 reacts/min\n║ Example: ${prefix}ar threshold 8\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('antireactThreshold', newThreshold)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Threshold Set\n║ Rate: ${newThreshold}/min\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ADD
    if (action === 'add') {
      if (target === 'block' || target === 'blacklist') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const blocked = await db.get('antireactBlocked') || []
        if (!blocked.includes(userJid)) {
          blocked.push(userJid)
          await db.set('antireactBlocked', blocked)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🚫 Bot Blacklisted\n║ ${value}\n║ Reactions will be deleted\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antireactWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antireactWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Bot Whitelisted\n║ ${value}\n║ Can auto-react\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove') {
      if (target === 'block' || target === 'blacklist') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let blocked = await db.get('antireactBlocked') || []
        blocked = blocked.filter(u => u!== userJid)
        await db.set('antireactBlocked', blocked)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Bot Unblocked\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antireactWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antireactWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Removed from Whitelist\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antireactWhitelist', [])
      await db.set('antireactBlocked', [])
      await db.set('antireactGroups', [])
      await db.set('antireactStats', { blocked: 0 })
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Blacklist + Whitelist + Stats\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}ar status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}