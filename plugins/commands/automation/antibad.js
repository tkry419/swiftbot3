/**
 * SwiftBot - plugins/commands/automations/antibadword.js
 * AntiBadWord Control Panel - Full customization
 */

export default {
  name: 'antibadword',
  desc: 'Control antibadword system',
  usage: 'antibadword on/off/global/dm/add/del/list/setwarn/resetwarn/reset',
  category: 'automations',
  permission: 'admin',
  alias: ['abw', 'badword'],

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m
    const isGroup = from.endsWith('@g.us')
    const isDM =!isGroup
    const action = args[0]?.toLowerCase()

    if (!action) {
      const [
        globalEnabled, groupEnabled, dmEnabled, maxWarns,
        globalWords, groupWords, dmWords
      ] = await Promise.all([
        db.get('antibadwordGlobalEnabled'),
        isGroup? db.getGroupKey(from, 'antibadwordEnabled') : null,
        db.get('antibadwordDmEnabled'),
        isGroup? db.getGroupKey(from, 'antibadwordMaxWarns') : await db.get('antibadwordMaxWarns'),
        db.get('antibadwordGlobalList'),
        isGroup? db.getGroupKey(from, 'antibadwordList') : null,
        isDM? db.get('antibadwordDmList') : null
      ])

      const wordCount = isGroup
       ? (groupWords?.length || globalWords?.length || 0)
        : isDM
         ? (dmWords?.length || globalWords?.length || 0)
          : (globalWords?.length || 0)

      const statusText = `Global: ${globalEnabled? 'ON' : 'OFF'}\n` +
        (isGroup? `Group: ${groupEnabled === true? 'ON' : groupEnabled === false? 'OFF' : 'INHERIT'}\n` : '') +
        `DM: ${dmEnabled? 'ON' : 'OFF'}\n` +
        `Max Warns: ${maxWarns || 3}\n` +
        `Bad Words: ${wordCount} words`

      const text = nobox
? `AntiBadWord Control\n\nStatus:\n${statusText}\n\nUsage:\n${prefix}antibadword on - Enable for this scope\n${prefix}antibadword off - Disable for this scope\n${prefix}antibadword global on - Enable globally\n${prefix}antibadword dm on - Enable for DMs\n${prefix}antibadword add word - Add bad word\n${prefix}antibadword del word - Delete bad word\n${prefix}antibadword list - List all words\n${prefix}antibadword setwarn 5 - Set max warns\n${prefix}antibadword resetwarn @user - Reset warns\n${prefix}antibadword reset - Reset all`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ ANTIBADWORD CONTROL\n║ \n║ ${statusText.replace(/\n/g, '\n║ ')}\n║ \n║ Usage:\n║ ${prefix}antibadword on/off\n║ ${prefix}antibadword global on/off\n║ ${prefix}antibadword dm on/off\n║ ${prefix}antibadword add word\n║ ${prefix}antibadword del word\n║ ${prefix}antibadword list\n║ ${prefix}antibadword setwarn 5\n║ ${prefix}antibadword resetwarn @user\n║ ${prefix}antibadword reset\n╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // ON/OFF for current scope
    if (action === 'on') {
      if (isGroup) {
        await db.setGroupKey(from, 'antibadwordEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord enabled for this group' : await box.success('AntiBadWord enabled for this group')
        }, { quoted: msg })
      } else if (isDM) {
        await db.set('antibadwordDmEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord enabled for DMs' : await box.success('AntiBadWord enabled for DMs')
        }, { quoted: msg })
      }
    }

    if (action === 'off') {
      if (isGroup) {
        await db.setGroupKey(from, 'antibadwordEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord disabled for this group' : await box.success('AntiBadWord disabled for this group')
        }, { quoted: msg })
      } else if (isDM) {
        await db.set('antibadwordDmEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord disabled for DMs' : await box.success('AntiBadWord disabled for DMs')
        }, { quoted: msg })
      }
    }

    // GLOBAL ON/OFF
    if (action === 'global') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('antibadwordGlobalEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord enabled globally' : await box.success('AntiBadWord enabled globally')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('antibadwordGlobalEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord disabled globally' : await box.success('AntiBadWord disabled globally')
        }, { quoted: msg })
      }
    }

    // DM ON/OFF
    if (action === 'dm') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('antibadwordDmEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord enabled for DMs' : await box.success('AntiBadWord enabled for DMs')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('antibadwordDmEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiBadWord disabled for DMs' : await box.success('AntiBadWord disabled for DMs')
        }, { quoted: msg })
      }
    }

    // ADD WORD
    if (action === 'add') {
      const word = args.slice(1).join(' ').toLowerCase()
      if (!word) return await sock.sendMessage(from, { text: 'Provide a word' }, { quoted: msg })

      const dbKey = isGroup? 'antibadwordList' : isDM? 'antibadwordDmList' : 'antibadwordGlobalList'
      const list = isGroup
       ? await db.getGroupKey(from, dbKey) || []
        : await db.get(dbKey) || []

      if (!list.includes(word)) {
        list.push(word)
        if (isGroup) {
          await db.setGroupKey(from, dbKey, list)
        } else {
          await db.set(dbKey, list)
        }
      }

      return await sock.sendMessage(from, {
        text: nobox? `Added "${word}" to bad word list` : await box.success(`Added "${word}" to bad word list`)
      }, { quoted: msg })
    }

    // DELETE WORD
    if (action === 'del') {
      const word = args.slice(1).join(' ').toLowerCase()
      const dbKey = isGroup? 'antibadwordList' : isDM? 'antibadwordDmList' : 'antibadwordGlobalList'
      const list = isGroup
       ? await db.getGroupKey(from, dbKey) || []
        : await db.get(dbKey) || []

      const newList = list.filter(w => w!== word)
      if (isGroup) {
        await db.setGroupKey(from, dbKey, newList)
      } else {
        await db.set(dbKey, newList)
      }

      return await sock.sendMessage(from, {
        text: nobox? `Removed "${word}" from bad word list` : await box.success(`Removed "${word}" from bad word list`)
      }, { quoted: msg })
    }

    // LIST WORDS
    if (action === 'list') {
      const dbKey = isGroup? 'antibadwordList' : isDM? 'antibadwordDmList' : 'antibadwordGlobalList'
      const list = isGroup
       ? await db.getGroupKey(from, dbKey) || await db.get('antibadwordGlobalList') || []
        : await db.get(dbKey) || []

      const text = list.length
       ? `Bad Words (${list.length}):\n${list.map((w, i) => `${i + 1}. ${w}`).join('\n')}`
        : 'No bad words set'

      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // SET MAX WARNS
    if (action === 'setwarn') {
      const warns = parseInt(args[1])
      if (isNaN(warns) || warns < 1 || warns > 10) {
        return await sock.sendMessage(from, {
          text: nobox? 'Usage: antibadword setwarn 1-10' : await box.error('Usage: antibadword setwarn 1-10')
        }, { quoted: msg })
      }

      const dbKey = isGroup? 'antibadwordMaxWarns' : 'antibadwordDmMaxWarns'
      if (isGroup) {
        await db.setGroupKey(from, dbKey, warns)
      } else {
        await db.set(dbKey, warns)
      }

      return await sock.sendMessage(from, {
        text: nobox? `Max warns set to ${warns}` : await box.success(`Max warns set to ${warns}`)
      }, { quoted: msg })
    }

    // RESET WARNS
    if (action === 'resetwarn') {
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (!mentioned) {
        return await sock.sendMessage(from, {
          text: nobox? 'Mention a user: antibadword resetwarn @user' : await box.error('Mention a user: antibadword resetwarn @user')
        }, { quoted: msg })
      }
      const warnKey = `antibadword_warns_${from}_${mentioned}`
      await db.set(warnKey, 0)
      return await sock.sendMessage(from, {
        text: nobox? `Reset warns for @${mentioned.split('@')[0]}` : await box.success(`Reset warns for @${mentioned.split('@')[0]}`),
        mentions: [mentioned]
      }, { quoted: msg })
    }

    // RESET ALL
    if (action === 'reset') {
      await Promise.all([
        db.set('antibadwordGlobalEnabled', false),
        db.set('antibadwordDmEnabled', false),
        db.set('antibadwordMaxWarns', 3),
        db.set('antibadwordDmMaxWarns', 3),
        db.set('antibadwordGlobalList', [])
      ])
      return await sock.sendMessage(from, {
        text: nobox? 'AntiBadWord reset to defaults' : await box.success('AntiBadWord reset to defaults')
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: nobox? 'Invalid action' : await box.error('Invalid action')
    }, { quoted: msg })
  }
}