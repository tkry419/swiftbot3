/**
 * SwiftBot - plugins/commands/automation/antibadwords.js
 * Anti Bad Words Manager - Full Control
 * Delete bad words, warn, kick - Owner only
 */

export default {
  name: 'antibadwords',
  alias: ['nobadwords', 'antimatusi', 'nowords', 'abw'],
  desc: 'Control anti bad words protection in groups',
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
    const value = args.slice(2).join(' ')

    // STATUS
    if (!action || action === 'status' || action === 'info') {
      const [
        antibad, action_type, groups, groupsEnabled,
        whitelist, wordlist
      ] = await Promise.all([
        db.get('antibadwords'),
        db.get('antibadwordsAction'),
        db.get('antibadwordsGroups'),
        db.get('antibadwordsGroupsEnabled'),
        db.get('antibadwordsWhitelist'),
        db.get('antibadwordsList')
      ])

      const groupList = groups?.length? groups.map(g => g.split('@')[0]).join(', ') : 'None'
      const whitelistList = whitelist?.length? whitelist.map(u => u.split('@')[0]).join(', ') : 'None'
      const wordsCount = wordlist?.length || 0

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ 🤬 ANTI BAD WORDS STATUS
╠═══════════════════
║ Status: ${antibad? '🟢 ON' : '🔴 OFF'}
║ Action: ${action_type || 'delete'}
║ Words: ${wordsCount}
║
║ 📍 TARGETS:
║ All Groups: ${groupsEnabled!== false? '✅ ON' : '❌ OFF'}
║ Specific Groups: ${groups?.length || 0}
║ ${groups?.length? '𖠁 ' + groupList : ''}
║ Whitelisted Users: ${whitelist?.length || 0}
║ ${whitelist?.length? '𖠁 ' + whitelistList : ''}
╠═══════════════════
║ 📝 USAGE:
║ ${prefix}abw on global
║ ${prefix}abw on group
║ ${prefix}abw off global
║ ${prefix}abw action delete
║ ${prefix}abw action warn
║ ${prefix}abw action kick
║ ${prefix}abw add word matusi
║ ${prefix}abw del word matusi
║ ${prefix}abw add whitelist 255xxx
║ ${prefix}abw list
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // ON / OFF
    if (action === 'on' || action === 'enable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antibadwords', true)
        await db.set('antibadwordsGroupsEnabled', true)
        await db.set('antibadwordsAction', 'delete')
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Bad Words Enabled\n║ Mode: GLOBAL\n║ Action: Delete\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        const groups = await db.get('antibadwordsGroups') || []
        if (!groups.includes(from)) {
          groups.push(from)
          await db.set('antibadwordsGroups', groups)
        }
        await db.set('antibadwords', true)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Anti Bad Words Enabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // OFF / DISABLE
    if (action === 'off' || action === 'disable') {
      if (!target || target === 'global' || target === 'all') {
        await db.set('antibadwords', false)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Bad Words Disabled\n║ Mode: GLOBAL OFF\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'group' && isGroup) {
        let groups = await db.get('antibadwordsGroups') || []
        groups = groups.filter(g => g!== from)
        await db.set('antibadwordsGroups', groups)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Anti Bad Words Disabled\n║ Target: THIS GROUP\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ACTION TYPE
    if (action === 'action' || action === 'punish' || action === 'set') {
      if (['delete', 'warn', 'kick'].includes(target)) {
        await db.set('antibadwordsAction', target)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ⚙️ Action Set\n║ Type: ${target.toUpperCase()}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // ADD WORD
    if (action === 'add') {
      if (target === 'word') {
        if (!value) {
          return await sock.sendMessage(from, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Provide a word\n║ ${prefix}abw add word matusi\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        }
        const wordlist = await db.get('antibadwordsList') || []
        const word = value.toLowerCase().trim()
        if (!wordlist.includes(word)) {
          wordlist.push(word)
          await db.set('antibadwordsList', wordlist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ Word Added\n║ ${word}\n║ Total: ${wordlist.length}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        const whitelist = await db.get('antibadwordsWhitelist') || []
        if (!whitelist.includes(userJid)) {
          whitelist.push(userJid)
          await db.set('antibadwordsWhitelist', whitelist)
        }
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ✅ User Whitelisted\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // DEL / REMOVE
    if (action === 'del' || action === 'remove' || action === 'delete') {
      if (target === 'word') {
        if (!value) {
          return await sock.sendMessage(from, {
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Provide a word\n╚━━━━━━━━━━━━━━━━━═❒`
          }, { quoted: m })
        }
        let wordlist = await db.get('antibadwordsList') || []
        const word = value.toLowerCase().trim()
        wordlist = wordlist.filter(w => w!== word)
        await db.set('antibadwordsList', wordlist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ Word Removed\n║ ${word}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (target === 'whitelist' || target === 'wl') {
        const userJid = value?.includes('@')? value : `${value}@s.whatsapp.net`
        let whitelist = await db.get('antibadwordsWhitelist') || []
        whitelist = whitelist.filter(u => u!== userJid)
        await db.set('antibadwordsWhitelist', whitelist)
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ User Removed\n║ ${value}\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }

    // LIST WORDS
    if (action === 'list' || action === 'words') {
      const wordlist = await db.get('antibadwordsList') || []
      if (wordlist.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 📝 Word List Empty\n║ Add words first\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 📝 BAD WORDS LIST\n╠═══════════════════\n║ ${wordlist.join(', ')}\n║\n║ Total: ${wordlist.length}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // CLEAR ALL
    if (action === 'clear' || action === 'reset') {
      await db.set('antibadwordsWhitelist', [])
      await db.set('antibadwordsGroups', [])
      await db.set('antibadwordsList', [])
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ 🗑️ All Lists Cleared\n║ Whitelist + Groups + Words\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // INVALID
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid command\n║ Use: ${prefix}abw status\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}