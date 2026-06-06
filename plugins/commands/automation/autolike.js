/**
 * SwiftBot - plugins/commands/automations/autolikestatus.js
 * AutoLikeStatus Control Panel - Full customization
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

    const DEFAULT_EMOJIS = ['❤️', '🔥', '👍', '😍', '💯', '🥰', '😂', '🙏', '👏', '💪']

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

      const statusText = `Status: ${enabled? 'ON' : 'OFF'}\n` +
        `Scope: ${contactsOnly? 'Contacts Only' : 'Everyone'}\n` +
        `Images: ${likeImages!== false? 'ON' : 'OFF'}\n` +
        `Videos: ${likeVideos!== false? 'ON' : 'OFF'}\n` +
        `Texts: ${likeTexts!== false? 'ON' : 'OFF'}\n` +
        `Emojis: ${emojis?.length || 10} keys`

      const text = nobox
? `AutoLikeStatus Control\n\n${statusText}\n\nUsage:\n${prefix}autolikestatus on - Enable\n${prefix}autolikestatus off - Disable\n${prefix}autolikestatus contacts on - Contacts only\n${prefix}autolikestatus contacts off - Everyone\n${prefix}autolikestatus type image off - Disable image likes\n${prefix}autolikestatus emoji add ❤️\n${prefix}autolikestatus emoji list\n${prefix}autolikestatus emoji reset\n${prefix}autolikestatus reset`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ AUTOLIKESTATUS CONTROL\n║ \n║ ${statusText.replace(/\n/g, '\n║ ')}\n║ \n║ Usage:\n║ ${prefix}autolikestatus on/off\n║ ${prefix}autolikestatus contacts on/off\n║ ${prefix}autolikestatus type image on/off\n║ ${prefix}autolikestatus emoji add ❤️\n║ ${prefix}autolikestatus emoji list\n║ ${prefix}autolikestatus emoji reset\n║ ${prefix}autolikestatus reset\n╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // ON/OFF
    if (action === 'on') {
      await db.set('autolikestatusEnabled', true)
      return await sock.sendMessage(from, {
        text: nobox? 'AutoLikeStatus enabled' : await box.success('AutoLikeStatus enabled')
      }, { quoted: msg })
    }

    if (action === 'off') {
      await db.set('autolikestatusEnabled', false)
      return await sock.sendMessage(from, {
        text: nobox? 'AutoLikeStatus disabled' : await box.success('AutoLikeStatus disabled')
      }, { quoted: msg })
    }

    // CONTACTS ONLY
    if (action === 'contacts') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('autolikestatusContactsOnly', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoLikeStatus set to contacts only' : await box.success('AutoLikeStatus set to contacts only')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('autolikestatusContactsOnly', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoLikeStatus set to everyone' : await box.success('AutoLikeStatus set to everyone')
        }, { quoted: msg })
      }
    }

    // TYPE CONTROL - image, video, text
    if (action === 'type') {
      const msgType = args[1]?.toLowerCase()
      const toggle = args[2]?.toLowerCase()

      const typeMap = {
        'image': 'autolikestatusImages',
        'video': 'autolikestatusVideos',
        'text': 'autolikestatusTexts'
      }

      const dbKey = typeMap[msgType]
      if (!dbKey) {
        return await sock.sendMessage(from, {
          text: nobox? 'Types: image/video/text' : await box.error('Types: image/video/text')
        }, { quoted: msg })
      }

      if (toggle === 'on') {
        await db.set(dbKey, true)
        return await sock.sendMessage(from, {
          text: nobox? `AutoLikeStatus enabled for ${msgType}` : await box.success(`AutoLikeStatus enabled for ${msgType}`)
        }, { quoted: msg })
      }
      if (toggle === 'off') {
        await db.set(dbKey, false)
        return await sock.sendMessage(from, {
          text: nobox? `AutoLikeStatus disabled for ${msgType}` : await box.success(`AutoLikeStatus disabled for ${msgType}`)
        }, { quoted: msg })
      }
    }

    // EMOJI CONTROL
    if (action === 'emoji') {
      const subAction = args[1]?.toLowerCase()

      if (subAction === 'add') {
        const emoji = args[2]
        if (!emoji) return await sock.sendMessage(from, { text: 'Provide an emoji' }, { quoted: msg })
        const list = await db.get('autolikestatusEmojis') || DEFAULT_EMOJIS
        if (!list.includes(emoji)) {
          list.push(emoji)
          await db.set('autolikestatusEmojis', list)
        }
        return await sock.sendMessage(from, {
          text: nobox? `Added ${emoji} to like list` : await box.success(`Added ${emoji} to like list`)
        }, { quoted: msg })
      }

      if (subAction === 'del') {
        const emoji = args[2]
        const list = await db.get('autolikestatusEmojis') || DEFAULT_EMOJIS
        const newList = list.filter(e => e!== emoji)
        await db.set('autolikestatusEmojis', newList)
        return await sock.sendMessage(from, {
          text: nobox? `Removed ${emoji} from like list` : await box.success(`Removed ${emoji} from like list`)
        }, { quoted: msg })
      }

      if (subAction === 'list') {
        const list = await db.get('autolikestatusEmojis') || DEFAULT_EMOJIS
        return await sock.sendMessage(from, {
          text: `Like Emojis (${list.length}):\n${list.join(' ')}`
        }, { quoted: msg })
      }

      if (subAction === 'reset') {
        await db.set('autolikestatusEmojis', DEFAULT_EMOJIS)
        return await sock.sendMessage(from, {
          text: nobox? 'Reset to default 10 emojis' : await box.success('Reset to default 10 emojis')
        }, { quoted: msg })
      }
    }

    // RESET ALL
    if (action === 'reset') {
      await Promise.all([
        db.set('autolikestatusEnabled', false),
        db.set('autolikestatusContactsOnly', false),
        db.set('autolikestatusImages', true),
        db.set('autolikestatusVideos', true),
        db.set('autolikestatusTexts', true),
        db.set('autolikestatusEmojis', DEFAULT_EMOJIS)
      ])
      return await sock.sendMessage(from, {
        text: nobox? 'AutoLikeStatus reset to defaults' : await box.success('AutoLikeStatus reset to defaults')
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: nobox? 'Invalid action' : await box.error('Invalid action')
    }, { quoted: msg })
  }
}