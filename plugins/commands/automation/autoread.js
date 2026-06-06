/**
 * SwiftBot - plugins/commands/automations/autoread.js
 * AutoRead Control Panel - Full customization
 */

export default {
  name: 'autoread',
  desc: 'Control autoread system',
  usage: 'autoread on/off/global/dm/type/reset',
  category: 'automations',
  permission: 'admin',
  alias: ['aread', 'autore'],

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m
    const isGroup = from.endsWith('@g.us')
    const action = args[0]?.toLowerCase()

    if (!action) {
      const [
        globalEnabled, groupEnabled, dmEnabled, allTypes,
        readStickers, readImages, readVideos, readAudios,
        readDocuments, readTexts
      ] = await Promise.all([
        db.get('autoreadGlobalEnabled'),
        isGroup? db.getGroupKey(from, 'autoreadEnabled') : null,
        db.get('autoreadDmEnabled'),
        db.get('autoreadAllTypes'),
        db.get('autoreadStickers'),
        db.get('autoreadImages'),
        db.get('autoreadVideos'),
        db.get('autoreadAudios'),
        db.get('autoreadDocuments'),
        db.get('autoreadTexts')
      ])

      const statusText = `Global: ${globalEnabled? 'ON' : 'OFF'}\n` +
        (isGroup? `Group: ${groupEnabled === true? 'ON' : groupEnabled === false? 'OFF' : 'INHERIT'}\n` : '') +
        `DM: ${dmEnabled? 'ON' : 'OFF'}\n` +
        `All Types: ${allTypes!== false? 'ON' : 'OFF'}\n` +
        `Texts: ${readTexts!== false? 'ON' : 'OFF'}\n` +
        `Stickers: ${readStickers!== false? 'ON' : 'OFF'}\n` +
        `Images: ${readImages!== false? 'ON' : 'OFF'}\n` +
        `Videos: ${readVideos!== false? 'ON' : 'OFF'}\n` +
        `Audios: ${readAudios!== false? 'ON' : 'OFF'}\n` +
        `Documents: ${readDocuments!== false? 'ON' : 'OFF'}`

      const text = nobox
? `AutoRead Control\n\nStatus:\n${statusText}\n\nUsage:\n${prefix}autoread on - Enable for this group\n${prefix}autoread off - Disable for this group\n${prefix}autoread global on - Enable globally\n${prefix}autoread dm on - Enable for DMs\n${prefix}autoread type sticker off - Disable sticker reads\n${prefix}autoread type all off - Disable all types\n${prefix}autoread reset - Reset all to default`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ AUTOREAD CONTROL\n║ \n║ ${statusText.replace(/\n/g, '\n║ ')}\n║ \n║ Usage:\n║ ${prefix}autoread on/off\n║ ${prefix}autoread global on/off\n║ ${prefix}autoread dm on/off\n║ ${prefix}autoread type sticker on/off\n║ ${prefix}autoread type all on/off\n║ ${prefix}autoread reset\n╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // GROUP ON/OFF
    if (action === 'on' && isGroup) {
      await db.setGroupKey(from, 'autoreadEnabled', true)
      return await sock.sendMessage(from, {
        text: nobox? 'AutoRead enabled for this group' : await box.success('AutoRead enabled for this group')
      }, { quoted: msg })
    }

    if (action === 'off' && isGroup) {
      await db.setGroupKey(from, 'autoreadEnabled', false)
      return await sock.sendMessage(from, {
        text: nobox? 'AutoRead disabled for this group' : await box.success('AutoRead disabled for this group')
      }, { quoted: msg })
    }

    // GLOBAL ON/OFF
    if (action === 'global') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('autoreadGlobalEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoRead enabled globally' : await box.success('AutoRead enabled globally')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('autoreadGlobalEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoRead disabled globally' : await box.success('AutoRead disabled globally')
        }, { quoted: msg })
      }
    }

    // DM ON/OFF
    if (action === 'dm') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('autoreadDmEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoRead enabled for DMs' : await box.success('AutoRead enabled for DMs')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('autoreadDmEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoRead disabled for DMs' : await box.success('AutoRead disabled for DMs')
        }, { quoted: msg })
      }
    }

    // TYPE CONTROL - sticker, image, video, audio, document, text, all
    if (action === 'type') {
      const msgType = args[1]?.toLowerCase()
      const toggle = args[2]?.toLowerCase()

      const typeMap = {
        'sticker': 'autoreadStickers',
        'image': 'autoreadImages',
        'video': 'autoreadVideos',
        'audio': 'autoreadAudios',
        'document': 'autoreadDocuments',
        'text': 'autoreadTexts',
        'all': 'autoreadAllTypes'
      }

      const dbKey = typeMap[msgType]
      if (!dbKey) {
        return await sock.sendMessage(from, {
          text: nobox? 'Types: sticker/image/video/audio/document/text/all' : await box.error('Types: sticker/image/video/audio/document/text/all')
        }, { quoted: msg })
      }

      if (toggle === 'on') {
        await db.set(dbKey, true)
        return await sock.sendMessage(from, {
          text: nobox? `AutoRead enabled for ${msgType}` : await box.success(`AutoRead enabled for ${msgType}`)
        }, { quoted: msg })
      }
      if (toggle === 'off') {
        await db.set(dbKey, false)
        return await sock.sendMessage(from, {
          text: nobox? `AutoRead disabled for ${msgType}` : await box.success(`AutoRead disabled for ${msgType}`)
        }, { quoted: msg })
      }
    }

    // RESET ALL
    if (action === 'reset') {
      await Promise.all([
        db.set('autoreadGlobalEnabled', false),
        db.set('autoreadDmEnabled', false),
        db.set('autoreadAllTypes', true),
        db.set('autoreadStickers', true),
        db.set('autoreadImages', true),
        db.set('autoreadVideos', true),
        db.set('autoreadAudios', true),
        db.set('autoreadDocuments', true),
        db.set('autoreadTexts', true)
      ])
      return await sock.sendMessage(from, {
        text: nobox? 'AutoRead reset to defaults' : await box.success('AutoRead reset to defaults')
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: nobox? 'Invalid action' : await box.error('Invalid action')
    }, { quoted: msg })
  }
}