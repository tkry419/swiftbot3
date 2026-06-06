/**
 * SwiftBot - plugins/commands/automation/antistatusmention.js
 * Anti Status Mention Manager - Full Control
 * Block status mentions, warn, kick - Owner only
 */

export default {
  name: 'antistatusmention',
  alias: ['nostatusmention', 'antitagstatus', 'nostag', 'asm'],
  desc: 'Control anti status mention protection',
  usage: '[on/off/status] [global] [action]',
  category: 'Automation',
  permission: 'owner',

  execute: async (sock, m, args, { db, prefix, isOwner }) => {
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
        antistatus, action_type, whitelist, blocked
      ] = await Promise.all([
        db.get('antistatusmention'),
        db.get('antistatusmentionAction'),
        db.get('antistatusmentionWhitelist'),
        db.get('antistatusmentionBlocked')
      ])

      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'
      const blockedList = blocked?.length? blocked.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🏷️ ANTI STATUS MENTION
╠═══════════════════
║ Status: ${antistatus? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║
║ 📍 LISTS:
║ Whitelisted Users: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
║ Blocked Users: ${blocked?.length || 0}
║ ${blocked?.length? '𖠁 ' + blockedList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}asm on global
║ ${prefix}asm off global
║ ${prefix}asm action delete
║ ${prefix}asm action warn
║ ${prefix}asm action kick
║ ${prefix}asm add whitelist 255xxx
║ ${prefix}asm add block 255xxx
║ ${prefix}asm clear
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      await db.set('antistatusmention', true)
      await db.set('antistatusmentionAction', 'delete')
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Status Mention Enabled\n║ Mode: GLOBAL\n║ Action: Delete\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      await db.set('antistatusmention', false)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Status Mention Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antistatusmentionAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD
    if (action === 'add') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antistatusmentionWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antistatusmentionWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${value}\n║ Can tag in status\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'block' || target === 'blocked') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const blocked = await db.get('antistatusmentionBlocked') || []
        if (!blocked.includes(userJid)) {
          blocked.push(userJid)
          await db.set('antistatusmentionBlocked', blocked)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🚫 User Blocked\n║ ${value}\n║ Status tags deleted\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antistatusmentionWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antistatusmentionWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'block' || target === 'blocked') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let blocked = await db.get('antistatusmentionBlocked') || []
        blocked = blocked.filter(u => u!== userJid)
        await db.set('antistatusmentionBlocked', blocked)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Unblocked\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antistatusmentionWhitelist', [])
      await db.set('antistatusmentionBlocked', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Whitelist + Blocked reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}asm status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}