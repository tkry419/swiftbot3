/**
 * SwiftBot - plugins/commands/automations/autoreact.js
 * AutoReact Control Panel - Full customization
 */

export default {
  name: 'autoreact',
  desc: 'Control autoreact system',
  usage: 'autoreact on/off/global/dm/type/emoji/list/reset',
  category: 'automations',
  permission: 'admin',
  alias: ['areact', 'autorc'],

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m
    const isGroup = from.endsWith('@g.us')
    const action = args[0]?.toLowerCase()

    const DEFAULT_EMOJIS = [
      '✅','❤️','🔥','💯','👍','😂','😍','🤔','👏','💀',
      '⚡','✨','🌟','🎯','🚀','💎','👑','🌈','🎉','💪',
      '🙏','😎','🥳','🤩','😇','🤗','😘','🤫','🤐','🤑',
      '🤠','👻','👽','🤖','😺','🐶','🦁','🐯','🦄','🐸',
      '🍕','🍔','🍟','🌮','🍩','🍪','🍭','🍯','🧃','☕'
    ]

    if (!action) {
      const [
        globalEnabled, groupEnabled, dmEnabled, allTypes,
        reactStickers, reactImages, reactVideos, reactAudios,
        reactDocuments, emojis
      ] = await Promise.all([
        db.get('autoreactGlobalEnabled'),
        isGroup? db.getGroupKey(from, 'autoreactEnabled') : null,
        db.get('autoreactDmEnabled'),
        db.get('autoreactAllTypes'),
        db.get('autoreactStickers'),
        db.get('autoreactImages'),
        db.get('autoreactVideos'),
        db.get('autoreactAudios'),
        db.get('autoreactDocuments'),
        db.get('autoreactEmojis')
      ])

      const statusText = `Global: ${globalEnabled? 'ON' : 'OFF'}\n` +
        (isGroup? `Group: ${groupEnabled === true? 'ON' : groupEnabled === false? 'OFF' : 'INHERIT'}\n` : '') +
        `DM: ${dmEnabled? 'ON' : 'OFF'}\n` +
        `All Types: ${allTypes!== false? 'ON' : 'OFF'}\n` +
        `Stickers: ${reactStickers!== false? 'ON' : 'OFF'}\n` +
        `Images: ${reactImages!== false? 'ON' : 'OFF'}\n` +
        `Videos: ${reactVideos!== false? 'ON' : 'OFF'}\n` +
        `Audios: ${reactAudios!== false? 'ON' : 'OFF'}\n` +
        `Documents: ${reactDocuments!== false? 'ON' : 'OFF'}\n` +
        `Emojis: ${emojis?.length || 50} keys`

      const text = nobox
 ? `AutoReact Control\n\nStatus:\n${statusText}\n\nUsage:\n${prefix}autoreact on - Enable for this group\n${prefix}autoreact off - Disable for this group\n${prefix}autoreact global on - Enable globally\n${prefix}autoreact dm on - Enable for DMs\n${prefix}autoreact type sticker off - Disable sticker reacts\n${prefix}autoreact emoji add 🤡\n${prefix}autoreact emoji list\n${prefix}autoreact emoji reset\n${prefix}autoreact reset - Reset all to default`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ AUTOREACT CONTROL\n║ \n║ ${statusText.replace(/\n/g, '\n║ ')}\n║ \n║ Usage:\n║ ${prefix}autoreact on/off\n║ ${prefix}autoreact global on/off\n║ ${prefix}autoreact dm on/off\n║ ${prefix}autoreact type sticker on/off\n║ ${prefix}autoreact emoji add 🤡\n║ ${prefix}autoreact emoji list\n║ ${prefix}autoreact emoji reset\n║ ${prefix}autoreact reset\n╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // GROUP ON/OFF
    if (action === 'on' && isGroup) {
      await db.setGroupKey(from, 'autoreactEnabled', true)
      return await sock.sendMessage(from, {
        text: nobox? 'AutoReact enabled for this group' : await box.success('AutoReact enabled for this group')
      }, { quoted: msg })
    }

    if (action === 'off' && isGroup) {
      await db.setGroupKey(from, 'autoreactEnabled', false)
      return await sock.sendMessage(from, {
        text: nobox? 'AutoReact disabled for this group' : await box.success('AutoReact disabled for this group')
      }, { quoted: msg })
    }

    // GLOBAL ON/OFF
    if (action === 'global') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('autoreactGlobalEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoReact enabled globally' : await box.success('AutoReact enabled globally')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('autoreactGlobalEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoReact disabled globally' : await box.success('AutoReact disabled globally')
        }, { quoted: msg })
      }
    }

    // DM ON/OFF
    if (action === 'dm') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('autoreactDmEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoReact enabled for DMs' : await box.success('AutoReact enabled for DMs')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('autoreactDmEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AutoReact disabled for DMs' : await box.success('AutoReact disabled for DMs')
        }, { quoted: msg })
      }
    }

    // TYPE CONTROL - sticker, image, video, audio, document
    if (action === 'type') {
      const msgType = args[1]?.toLowerCase()
      const toggle = args[2]?.toLowerCase()

      const typeMap = {
        'sticker': 'autoreactStickers',
        'image': 'autoreactImages',
        'video': 'autoreactVideos',
        'audio': 'autoreactAudios',
        'document': 'autoreactDocuments',
        'all': 'autoreactAllTypes'
      }

      const dbKey = typeMap[msgType]
      if (!dbKey) {
        return await sock.sendMessage(from, {
          text: nobox? 'Types: sticker/image/video/audio/document/all' : await box.error('Types: sticker/image/video/audio/document/all')
        }, { quoted: msg })
      }

      if (toggle === 'on') {
        await db.set(dbKey, true)
        return await sock.sendMessage(from, {
          text: nobox? `AutoReact enabled for ${msgType}` : await box.success(`AutoReact enabled for ${msgType}`)
        }, { quoted: msg })
      }
      if (toggle === 'off') {
        await db.set(dbKey, false)
        return await sock.sendMessage(from, {
          text: nobox? `AutoReact disabled for ${msgType}` : await box.success(`AutoReact disabled for ${msgType}`)
        }, { quoted: msg })
      }
    }

    // EMOJI CONTROL
    if (action === 'emoji') {
      const subAction = args[1]?.toLowerCase()

      if (subAction === 'add') {
        const emoji = args[2]
        if (!emoji) return await sock.sendMessage(from, { text: 'Provide an emoji' }, { quoted: msg })
        const list = await db.get('autoreactEmojis') || DEFAULT_EMOJIS
        if (!list.includes(emoji)) {
          list.push(emoji)
          await db.set('autoreactEmojis', list)
        }
        return await sock.sendMessage(from, {
          text: nobox? `Added ${emoji} to react list` : await box.success(`Added ${emoji} to react list`)
        }, { quoted: msg })
      }

      if (subAction === 'del') {
        const emoji = args[2]
        const list = await db.get('autoreactEmojis') || DEFAULT_EMOJIS
        const newList = list.filter(e => e!== emoji)
        await db.set('autoreactEmojis', newList)
        return await sock.sendMessage(from, {
          text: nobox? `Removed ${emoji} from react list` : await box.success(`Removed ${emoji} from react list`)
        }, { quoted: msg })
      }

      if (subAction === 'list') {
        const list = await db.get('autoreactEmojis') || DEFAULT_EMOJIS
        return await sock.sendMessage(from, {
          text: `React Emojis (${list.length}):\n${list.join(' ')}`
        }, { quoted: msg })
      }

      if (subAction === 'reset') {
        await db.set('autoreactEmojis', DEFAULT_EMOJIS)
        return await sock.sendMessage(from, {
          text: nobox? 'Reset to default 50 emojis' : await box.success('Reset to default 50 emojis')
        }, { quoted: msg })
      }
    }

    // RESET ALL
    if (action === 'reset') {
      await Promise.all([
        db.set('autoreactGlobalEnabled', false),
        db.set('autoreactDmEnabled', false),
        db.set('autoreactAllTypes', true),
        db.set('autoreactStickers', true),
        db.set('autoreactImages', true),
        db.set('autoreactVideos', true),
        db.set('autoreactAudios', true),
        db.set('autoreactDocuments', true),
        db.set('autoreactEmojis', DEFAULT_EMOJIS)
      ])
      return await sock.sendMessage(from, {
        text: nobox? 'AutoReact reset to defaults' : await box.success('AutoReact reset to defaults')
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: nobox? 'Invalid action' : await box.error('Invalid action')
    }, { quoted: msg })
  }
}