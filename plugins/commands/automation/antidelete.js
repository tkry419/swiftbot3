/**
 * SwiftBot - plugins/commands/automation/antidelete.js
 * Anti-Delete Manager - Control deleted message recovery
 * Commands: on/off, dest, target, status
 * Destinations: self, number, group, channel, inplace
 */

import { db } from '../../../system/db.js'

export default {
  name: 'antidelete',
  alias: ['antidel', 'ad'],
  desc: 'Manage anti-delete settings for deleted messages',
  usage: 'on|off|dest|target|status',
  category: 'automation',
  permission: 'admin', // Only admins can change

  execute: async (sock, m, args, { box, fonts, isGroup }) => {
    const from = m.key.remoteJid
    const action = args[0]?.toLowerCase()
    const prefix = await db.get('prefix')

    // 1. HELP - MSAADA
    if (!action) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *ANTIDELETE CONTROL*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ${prefix}antidelete on - Enable
║ ${prefix}antidelete off - Disable
║ ${prefix}antidelete dest <type> - Set destination
║ ${prefix}antidelete target <jid/number> - Set target
║ ${prefix}antidelete status - Check settings
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ *Destinations:*
║ self - Send to owner DM
║ number - Send to specific number
║ group - Send to specific group
║ channel - Send to channel/newsletter
║ inplace - Recover in same chat
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. STATUS - ANGALIA SETTINGS
    if (action === 'status') {
      const [enabled, dest, target, owner] = await Promise.all([
        isGroup? db.getGroupKey(from, 'antiDelete') : db.get('antiDelete'),
        db.get('antiDeleteDest'),
        db.get('antiDeleteTarget'),
        db.get('owner')
      ])

      const destText = dest === 'self'? 'Owner DM' :
                      dest === 'number'? `Number: ${target || 'Not set'}` :
                      dest === 'group'? `Group: ${target || 'Not set'}` :
                      dest === 'channel'? `Channel: ${target || 'Not set'}` :
                      dest === 'inplace'? 'Same chat' : 'Owner DM'

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *ANTIDELETE STATUS*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Status: ${enabled? 'Enabled ✅' : 'Disabled ❌'}
║ Scope: ${isGroup? 'This Group' : 'Global/DM'}
║ Destination: ${destText}
║ Owner: ${owner}
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 3. ON/OFF - WASHA/ZIMA
    if (action === 'on' || action === 'enable') {
      if (isGroup) {
        await db.setGroupKey(from, 'antiDelete', true)
      } else {
        await db.set('antiDelete', true)
      }
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *ANTIDELETE*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Status: Enabled ✅
║ Scope: ${isGroup? 'This Group' : 'Global/DM'}
║ Use ${prefix}antidelete dest to change destination
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (action === 'off' || action === 'disable') {
      if (isGroup) {
        await db.setGroupKey(from, 'antiDelete', false)
      } else {
        await db.set('antiDelete', false)
      }
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *ANTIDELETE*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Status: Disabled ❌
║ Deleted messages will not be recovered
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 4. DEST - WEKA SEHEMU YA KUTUMA
    if (action === 'dest' || action === 'destination') {
      const destType = args[1]?.toLowerCase()
      const validDests = ['self', 'number', 'group', 'channel', 'inplace']

      if (!destType ||!validDests.includes(destType)) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒
║ *INVALID DESTINATION*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Usage: ${prefix}antidelete dest <type>
║ Types: self, number, group, channel, inplace
║
║ Example: ${prefix}antidelete dest channel
╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      await db.set('antiDeleteDest', destType)

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *DESTINATION UPDATED*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ New destination: ${destType}
║ ${destType!== 'self' && destType!== 'inplace'? `Now set target: ${prefix}antidelete target <jid/number>` : 'Ready to recover'}
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 5. TARGET - WEKA JID/NUMBER
    if (action === 'target') {
      const target = args[1]
      const dest = await db.get('antiDeleteDest')

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒
║ *TARGET REQUIRED*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Usage: ${prefix}antidelete target <jid/number>
║
║ For number: ${prefix}antidelete target 254712345678
║ For group: ${prefix}antidelete target 123456@g.us
║ For channel: ${prefix}antidelete target 123456@newsletter
╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      if (dest === 'self' || dest === 'inplace') {
        return await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒
║ *NO TARGET NEEDED*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Destination '${dest}' doesn't need target
║ Change dest first: ${prefix}antidelete dest channel
╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }

      await db.set('antiDeleteTarget', target)

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ *TARGET UPDATED*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ New target: ${target}
║ Destination: ${dest}
║ Deleted messages will be sent here
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Invalid command
    return await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒
║ *INVALID COMMAND*
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ Use: ${prefix}antidelete
║ For help and usage
╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })
  }
}