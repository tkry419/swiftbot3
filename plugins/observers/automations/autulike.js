/**
 * SwiftBot - plugins/commands/automation/autolikestatus.js
 * Auto Like Status Manager - Full Control
 * Set targets, mode - Owner only
 */

export default {
  name: 'autolikestatus',
  alias: ['alikestatus', 'autolike', 'likestatus', 'als'],
  desc: 'Control auto like status globally or per target',
  usage: '[on/off/status] [global/all/specific] [number]',
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
        likeStatus, users, allEnabled
      ] = await Promise.all([
        db.get('autolikestatus'),
        db.get('autolikestatusUsers'),
        db.get('autolikestatusAll')
      ])

      const userList = users?.length? users.map(u => u.split('@')[0]).join(', ') : 'None'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ ❤️ AUTO LIKE STATUS
╠═══════════════════
║ Like Status: ${likeStatus? '🟢 ON' : '🔴 OFF'}
║
║ 📍 TARGETS:
║ All Contacts: ${allEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Users: ${users?.length || 0}
║ ${users?.length? '𖠁 ' + userList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}als on global
║ ${prefix}als on all
║ ${prefix}als on user 255712345678
║ ${prefix}als off global
║ ${prefix}als add user 255xxx
║ ${prefix}als del user 255xxx
║ ${prefix}als clear
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('autolikestatus', true)
        await db.set('autolikestatusAll', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Like Status Enabled\n║ Mode: GLOBAL\n║ Target: All Status\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autolikestatusUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autolikestatusUsers', users)
        }
        await db.set('autolikestatus', true)
        await db.set('autolikestatusAll', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Auto Like Status Enabled\n║ Target: ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('autolikestatus', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Auto Like Status Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD
    if (action === 'add') {
      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const users = await db.get('autolikestatusUsers') || []
        if (!users.includes(userJid)) {
          users.push(userJid)
          await db.set('autolikestatusUsers', users)
        }
        await db.set('autolikestatusAll', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Added\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'user') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let users = await db.get('autolikestatusUsers') || []
        users = users.filter(u => u!== userJid)
        await db.set('autolikestatusUsers', users)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('autolikestatusUsers', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Targets Cleared\n║ Whitelist reset\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}als status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}