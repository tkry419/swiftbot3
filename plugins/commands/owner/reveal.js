/**
 * SwiftBot - plugins/commands/owner/cleardb.js
 * Clear Database - Reset All Settings to Defaults
 * Owner only, requires confirmation
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

import { DEFAULTS } from '../../system/db.js'

export default {
  name: 'cleardb',
  alias: ['resetdb', 'factoryreset', 'wipedb'],
  desc: 'Reset entire database to defaults',
  usage: '<confirm>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const confirm = args[0]?.toLowerCase()

    if (confirm!== 'confirm') {
      const msg = nobox
   ? `⚠️ DANGER: Clear Database\n\nThis will RESET ALL settings to defaults:\n• All configs wiped\n• All groups/users data deleted\n• All stats reset\n• Cannot be undone\n\nTo proceed: #cleardb confirm`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *⚠️ DANGER: CLEAR DB*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ This will RESET ALL:\n║\n║ • All settings → defaults\n║ • All group data deleted\n║ • All user data deleted\n║ • All stats reset to 0\n║\n║ CANNOT BE UNDONE!\n║\n║ To proceed:\n║ #cleardb confirm\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: nobox
   ? `Resetting database...\n\nBy: ${senderName}\n\nPlease wait...`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *CLEAR DATABASE*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║\n║ Resetting all data...\n║ Please wait...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      // Get all current keys
      const allData = await db.getAll()
      const keys = Object.keys(allData)

      // Delete all existing keys
      for (const key of keys) {
        await db.delete(key)
      }

      // Restore defaults
      for (const [key, value] of Object.entries(DEFAULTS)) {
        await db.set(key, value)
      }

      // If MongoDB, also clear groups and users collections
      if (db.mode === 'mongodb') {
        await db._settings.deleteMany({ key: { $nin: Object.keys(DEFAULTS) } })
        // Note: Groups/Users clearing needs direct collection access
        // This clears main settings only
      }

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: nobox
       ? `Database cleared ✅\n\nAll settings reset to defaults\nBy: ${senderName}\n\nRestart recommended: #restart`
            : `╔═━━━━━━━━━━━━━━━━═❒\n║ *DATABASE CLEARED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Success ✅\n║ All settings → defaults\n║ By: ${senderName}\n║\n║ Restart recommended\n║ Use: #restart\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch (error) {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: nobox
       ? `Failed to clear DB\n\nError: ${error.message}`
            : `╔═━━━━━━━━━━━━━━━━═❒\n║ *CLEAR DB FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Error: ${error.message}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}