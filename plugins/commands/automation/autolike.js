/**
 * SwiftBot - plugins/commands/automations/autolikestatus.js
 * AutoLikeStatus Control Panel
 * Controls the autolikestatus observer in plugins/observers/autolikestatus.js
 */

export default {
  name: 'autolikestatus',
  desc: 'Control autolikestatus system',
  usage: 'autolikestatus on/off/contacts/emoji/type/reset',
  category: 'automations',
  permission: 'admin',
  alias: ['autolike', 'als'],

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m
    const action = args[0]?.toLowerCase()

    const DEFAULT_EMOJIS = [
      '❤️','🔥','💯','👍','😂','😍','🤔','👏','💀','⚡',
      '✨','🌟','🎯','🚀','💎','👑','🌈','🎉','💪','🙏',
      '😎','🥳','🤩','😇','🤗','😘','🤫','🤐','🤑','🤠',
      '👻','👽','🤖','😺','🐶','🦁','🐯','🦄','🐸','🍕',
      '🍔','🍟','🌮','🍩','🍪','🍭','🍯','🧃','☕','🥰'
    ]

    // ─── STATUS PANEL (no args) ──────────────────
    if (!action) {
      const [
        enabled, contactsOnly, emojis,
        likeImages, likeVideos, likeTexts
      ] = await Promise.all([
        db.get('autolikestatusEnabled'),
        db.get('autolikestatusContactsOnly'),
        db.get('autolikestatusEmojis'),
        db.get('autolikestatusImages'),
        db.get('autolikestatusVideos'),
        db.get('autolikestatusTexts')
      ])

      const statusText =
        `Status   : ${enabled ? 'ON ✅' : 'OFF ❌'}\n` +
        `Scope    : ${contactsOnly ? 'Contacts Only' : 'Everyone'}\n` +
        `Images   : ${likeImages !== false ? 'ON' : 'OFF'}\n` +
        `Videos   : ${likeVideos !== false ? 'ON' : 'OFF'}\n` +
        `Texts    : ${likeTexts  !== false ? 'ON' : 'OFF'}\n` +
        `Emojis   : ${(emojis?.length) || 50} keys`

      const usage =
        `${prefix}autolikestatus on/off\n` +
        `${prefix}autolikestatus contacts on/off\n` +
        `${prefix}autolikestatus type image/video/text on/off\n` +
        `${prefix}autolikestatus emoji add <emoji>\n` +
        `${prefix}autolikestatus emoji del <emoji>\n` +
        `${prefix}autolikestatus emoji list\n` +
        `${prefix}autolikestatus emoji reset\n` +
        `${prefix}autolikestatus reset`

      const text = nobox
        ? `AutoLikeStatus Control\n\n${statusText}\n\nUsage:\n${usage}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ AUTOLIKESTATUS CONTROL\n║ \n║ ${statusText.replace(/\n/g, '\n║ ')}\n║ \n║ Usage:\n║ ${usage.replace(/\n/g, '\n║ ')}\n╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // ─── ON ──────────────────────────────────────
    if (action === 'on') {
      await db.set('autolikestatusEnabled', true)
      return await sock.sendMessage(from, {
        text: nobox ? 'AutoLikeStatus enabled ✅' : await box.success('AutoLikeStatus enabled')
      }, { quoted: msg })
    }

    // ─── OFF ─────────────────────────────────────
    if (action === 'off') {
      await db.set('autolikestatusEnabled', false)
      return await sock.sendMessage(from, {
        text: nobox ? 'AutoLikeStatus disabled ❌' : await box.success('AutoLikeStatus disabled')
      }, { quoted: msg })
    }

    // ─── CONTACTS FILTER ─────────────────────────
    if (action === 'contacts') {
      const sub = args[1]?.toLowerCase()
      if (sub === 'on') {
        await db.set('autolikestatusContactsOnly', true)
        return await sock.sendMessage(from, {
          text: nobox ? 'AutoLikeStatus set to contacts only' : await box.success('Set to contacts only')
        }, { quoted: msg })
      }
      if (sub === 'off') {
        await db.set('autolikestatusContactsOnly', false)
        return await sock.sendMessage(from, {
          text: nobox ? 'AutoLikeStatus set to everyone' : await box.success('Set to everyone')
        }, { quoted: msg })
      }
      return await sock.sendMessage(from, {
        text: nobox ? 'Use: contacts on/off' : await box.error('Use: contacts on/off')
      }, { quoted: msg })
    }

    // ─── TYPE TOGGLE ─────────────────────────────
    if (action === 'type') {
      const msgType = args[1]?.toLowerCase()
      const toggle  = args[2]?.toLowerCase()

      const typeMap = {
        image : 'autolikestatusImages',
        video : 'autolikestatusVideos',
        text  : 'autolikestatusTexts'
      }

      const dbKey = typeMap[msgType]
      if (!dbKey) {
        return await sock.sendMessage(from, {
          text: nobox ? 'Types: image / video / text' : await box.error('Types: image / video / text')
        }, { quoted: msg })
      }

      if (toggle === 'on' || toggle === 'off') {
        await db.set(dbKey, toggle === 'on')
        return await sock.sendMessage(from, {
          text: nobox
            ? `AutoLikeStatus ${msgType}: ${toggle.toUpperCase()}`
            : await box.success(`AutoLikeStatus ${msgType}: ${toggle.toUpperCase()}`)
        }, { quoted: msg })
      }

      return await sock.sendMessage(from, {
        text: nobox ? `Use: type ${msgType} on/off` : await box.error(`Use: type ${msgType} on/off`)
      }, { quoted: msg })
    }

    // ─── EMOJI CONTROL ───────────────────────────
    if (action === 'emoji') {
      const sub   = args[1]?.toLowerCase()
      const emoji = args[2]

      // ADD
      if (sub === 'add') {
        if (!emoji) return await sock.sendMessage(from, { text: 'Provide an emoji' }, { quoted: msg })
        const list = await db.get('autolikestatusEmojis') || [...DEFAULT_EMOJIS]
        if (!list.includes(emoji)) {
          list.push(emoji)
          await db.set('autolikestatusEmojis', list)
        }
        return await sock.sendMessage(from, {
          text: nobox ? `Added ${emoji} (total: ${list.length})` : await box.success(`Added ${emoji} ─ total: ${list.length}`)
        }, { quoted: msg })
      }

      // DEL
      if (sub === 'del') {
        if (!emoji) return await sock.sendMessage(from, { text: 'Provide an emoji to remove' }, { quoted: msg })
        const list = await db.get('autolikestatusEmojis') || [...DEFAULT_EMOJIS]
        const newList = list.filter(e => e !== emoji)
        await db.set('autolikestatusEmojis', newList)
        return await sock.sendMessage(from, {
          text: nobox ? `Removed ${emoji} (total: ${newList.length})` : await box.success(`Removed ${emoji} ─ total: ${newList.length}`)
        }, { quoted: msg })
      }

      // LIST
      if (sub === 'list') {
        const list = await db.get('autolikestatusEmojis') || DEFAULT_EMOJIS
        return await sock.sendMessage(from, {
          text: `Like Emojis (${list.length}):\n${list.join('  ')}`
        }, { quoted: msg })
      }

      // RESET
      if (sub === 'reset') {
        await db.set('autolikestatusEmojis', [...DEFAULT_EMOJIS])
        return await sock.sendMessage(from, {
          text: nobox ? 'Reset to 50 default emojis ✅' : await box.success('Reset to 50 default emojis')
        }, { quoted: msg })
      }

      return await sock.sendMessage(from, {
        text: nobox ? 'Use: emoji add/del/list/reset' : await box.error('Use: emoji add/del/list/reset')
      }, { quoted: msg })
    }

    // ─── RESET ALL ───────────────────────────────
    if (action === 'reset') {
      await Promise.all([
        db.set('autolikestatusEnabled',      false),
        db.set('autolikestatusContactsOnly', false),
        db.set('autolikestatusImages',       true),
        db.set('autolikestatusVideos',       true),
        db.set('autolikestatusTexts',        true),
        db.set('autolikestatusEmojis',       [...DEFAULT_EMOJIS])
      ])
      return await sock.sendMessage(from, {
        text: nobox ? 'AutoLikeStatus reset to defaults ✅' : await box.success('AutoLikeStatus reset to defaults')
      }, { quoted: msg })
    }

    // ─── UNKNOWN ─────────────────────────────────
    await sock.sendMessage(from, {
      text: nobox ? 'Unknown action. Use: on/off/contacts/type/emoji/reset' : await box.error('Unknown action. Use: on/off/contacts/type/emoji/reset')
    }, { quoted: msg })
  }
}
