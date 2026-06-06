/**
 * SwiftBot - plugins/commands/automations/antilink.js
 * AntiLink Control Panel - Enable/disable/set scope
 */

export default {
  name: 'antilink',
  desc: 'Control antilink system',
  usage: 'antilink on/off/global/setwarn/whitelist/resetwarn',
  category: 'automations',
  permission: 'admin',
  alias: ['antilinks'],

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m
    const isGroup = from.endsWith('@g.us')
    const action = args[0]?.toLowerCase()

    if (!action) {
      const [globalStatus, groupStatus, maxWarns] = await Promise.all([
        db.get('antilinkEnabled'),
        isGroup? db.getGroupKey(from, 'antilinkEnabled') : null,
        isGroup? db.getGroupKey(from, 'antilinkMaxWarns') : await db.get('antilinkMaxWarns')
      ])

      const statusText = isGroup
       ? `Group: ${groupStatus === true? 'ON' : groupStatus === false? 'OFF' : 'INHERIT'}\nGlobal: ${globalStatus? 'ON' : 'OFF'}`
        : `Global: ${globalStatus? 'ON' : 'OFF'}`

      const text = nobox
 ? `AntiLink Control\n\nStatus:\n${statusText}\nMax Warns: ${maxWarns || 3}\n\nUsage:\n${prefix}antilink on - Enable for this group\n${prefix}antilink off - Disable for this group\n${prefix}antilink global on - Enable globally\n${prefix}antilink global off - Disable globally\n${prefix}antilink setwarn 5 - Set max warns\n${prefix}antilink whitelist add youtube.com\n${prefix}antilink resetwarn @user`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ ANTILINK CONTROL\n║ \n║ Status:\n║ ${statusText.replace('\n', '\n║ ')}\n║ Max Warns: ${maxWarns || 3}\n║ \n║ Usage:\n║ ${prefix}antilink on\n║ ${prefix}antilink off\n║ ${prefix}antilink global on\n║ ${prefix}antilink global off\n║ ${prefix}antilink setwarn 5\n║ ${prefix}antilink whitelist add domain\n║ ${prefix}antilink resetwarn @user\n╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // GLOBAL ON/OFF
    if (action === 'global') {
      const subAction = args[1]?.toLowerCase()
      if (subAction === 'on') {
        await db.set('antilinkEnabled', true)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiLink enabled globally' : await box.success('AntiLink enabled globally')
        }, { quoted: msg })
      }
      if (subAction === 'off') {
        await db.set('antilinkEnabled', false)
        return await sock.sendMessage(from, {
          text: nobox? 'AntiLink disabled globally' : await box.success('AntiLink disabled globally')
        }, { quoted: msg })
      }
    }

    // GROUP ON/OFF - only works in groups
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: nobox? 'This command works in groups only' : await box.error('This command works in groups only')
      }, { quoted: msg })
    }

    if (action === 'on') {
      await db.setGroupKey(from, 'antilinkEnabled', true)
      return await sock.sendMessage(from, {
        text: nobox? 'AntiLink enabled for this group' : await box.success('AntiLink enabled for this group')
      }, { quoted: msg })
    }

    if (action === 'off') {
      await db.setGroupKey(from, 'antilinkEnabled', false)
      return await sock.sendMessage(from, {
        text: nobox? 'AntiLink disabled for this group' : await box.success('AntiLink disabled for this group')
      }, { quoted: msg })
    }

    // SET MAX WARNS
    if (action === 'setwarn') {
      const warns = parseInt(args[1])
      if (isNaN(warns) || warns < 1 || warns > 10) {
        return await sock.sendMessage(from, {
          text: nobox? 'Usage: antilink setwarn 1-10' : await box.error('Usage: antilink setwarn 1-10')
        }, { quoted: msg })
      }
      await db.setGroupKey(from, 'antilinkMaxWarns', warns)
      return await sock.sendMessage(from, {
        text: nobox? `Max warns set to ${warns}` : await box.success(`Max warns set to ${warns}`)
      }, { quoted: msg })
    }

    // WHITELIST
    if (action === 'whitelist') {
      const subAction = args[1]?.toLowerCase()
      const domain = args[2]?.toLowerCase()

      if (subAction === 'add' && domain) {
        const list = await db.getGroupKey(from, 'antilinkWhitelist') || []
        if (!list.includes(domain)) {
          list.push(domain)
          await db.setGroupKey(from, 'antilinkWhitelist', list)
        }
        return await sock.sendMessage(from, {
          text: nobox? `Added ${domain} to whitelist` : await box.success(`Added ${domain} to whitelist`)
        }, { quoted: msg })
      }

      if (subAction === 'del' && domain) {
        const list = await db.getGroupKey(from, 'antilinkWhitelist') || []
        const newList = list.filter(d => d!== domain)
        await db.setGroupKey(from, 'antilinkWhitelist', newList)
        return await sock.sendMessage(from, {
          text: nobox? `Removed ${domain} from whitelist` : await box.success(`Removed ${domain} from whitelist`)
        }, { quoted: msg })
      }

      if (subAction === 'list') {
        const list = await db.getGroupKey(from, 'antilinkWhitelist') || []
        const text = list.length
         ? `Whitelisted domains:\n${list.map(d => `- ${d}`).join('\n')}`
          : 'No whitelisted domains'
        return await sock.sendMessage(from, { text }, { quoted: msg })
      }
    }

    // RESET WARNS
    if (action === 'resetwarn') {
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      if (!mentioned) {
        return await sock.sendMessage(from, {
          text: nobox? 'Mention a user: antilink resetwarn @user' : await box.error('Mention a user: antilink resetwarn @user')
        }, { quoted: msg })
      }
      const warnKey = `antilink_warns_${from}_${mentioned}`
      await db.set(warnKey, 0)
      return await sock.sendMessage(from, {
        text: nobox? `Reset warns for @${mentioned.split('@')[0]}` : await box.success(`Reset warns for @${mentioned.split('@')[0]}`),
        mentions: [mentioned]
      }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      text: nobox? 'Invalid action' : await box.error('Invalid action. Use: on/off/global/setwarn/whitelist/resetwarn')
    }, { quoted: msg })
  }
}