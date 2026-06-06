/**
 * SwiftBot - plugins/commands/automation/antiautolike.js
 * Anti Auto Like Status Bots Manager - Full Control
 * Block bots that auto-react to status - Owner only
 */

export default {
  name: 'antiautolike',
  alias: ['noautolike', 'antistatuslike', 'noautolike', 'aal'],
  desc: 'Block bots that auto-like/react to all statuses',
  usage: '[on/off/status] [action] [threshold]',
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
        antiautolike, action_type, threshold,
        blockedBots, whitelist, stats
      ] = await Promise.all([
        db.get('antiautolike'),
        db.get('antiautolikeAction'),
        db.get('antiautolikeThreshold'),
        db.get('antiautolikeBlocked'),
        db.get('antiautolikeWhitelist'),
        db.get('antiautolikeStats')
      ])

      const blockedList = blockedBots?.length? blockedBots.map(u => u.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ ❤️ ANTI AUTO LIKE STATUS
╠═══════════════════
║ Status: ${antiautolike? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'block'}
║ Threshold: ${threshold || 5} likes/min
║
║ 📊 STATS:
║ Bots Blocked: ${blockedBots?.length || 0}
║ Reactions Blocked: ${stats?.blocked || 0}
║
║ 📍 LISTS:
║ Blacklisted Bots: ${blockedBots?.length || 0}
║ ${blockedBots?.length? '𖠁 ' + blockedList : ''}
║ Whitelisted: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}aal on
║ ${prefix}aal off
║ ${prefix}aal action block
║ ${prefix}aal action warn
║ ${prefix}aal threshold 5
║ ${prefix}aal add block 255xxx
║ ${prefix}aal add whitelist 255xxx
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      await db.set('antiautolike', true)
      await db.set('antiautolikeAction', 'block')
      await db.set('antiautolikeThreshold', 5)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Auto Like Enabled\n║ Threshold: 5 reactions/min\n║ Auto-detect bots ON\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      await db.set('antiautolike', false)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Auto Like Disabled\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish') {
      if (['block', 'warn'].includes(target)) {
        await db.set('antiautolikeAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // THRESHOLD
    if (action === 'threshold') {
      const newThreshold = parseInt(target)
      if (isNaN(newThreshold) || newThreshold < 2 || newThreshold > 20) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid threshold\n║ Range: 2-20 reactions/min\n║ Example: ${prefix}aal threshold 5\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      await db.set('antiautolikeThreshold', newThreshold)
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Threshold Set\n║ Rate: ${newThreshold}/min\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ADD
    if (action === 'add') {
      if (target === 'block' || target === 'blacklist') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const blocked = await db.get('antiautolikeBlocked') || []
        if (!blocked.includes(userJid)) {
          blocked.push(userJid)
          await db.set('antiautolikeBlocked', blocked)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🚫 Bot Blacklisted\n║ ${value}\n║ Status reactions blocked\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antiautolikeWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antiautolikeWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Bot Whitelisted\n║ ${value}\n║ Can auto-like status\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove') {
      if (target === 'block' || target === 'blacklist') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let blocked = await db.get('antiautolikeBlocked') || []
        blocked = blocked.filter(u => u!== userJid)
        await db.set('antiautolikeBlocked', blocked)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Bot Unblocked\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antiautolikeWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antiautolikeWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Removed from Whitelist\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antiautolikeWhitelist', [])
      await db.set('antiautolikeBlocked', [])
      await db.set('antiautolikeStats', { blocked: 0 })
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Blacklist + Whitelist + Stats\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}aal status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}