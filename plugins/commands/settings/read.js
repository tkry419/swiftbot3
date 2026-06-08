/**
 * SwiftBot - plugins/commands/settings/readreceipts.js
 * Read Receipts Settings - Toggle blue ticks on/off
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings
 */

export default {
  name: 'readreceipts',
  alias: ['blueticks', 'rr', 'read'],
  desc: 'Toggle read receipts - blue ticks on/off',
  usage: 'on/off | status',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()

    const validOptions = ['on', 'off', 'status', 'enable', 'disable']

    // 1. STATUS - Check current setting
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const statusText = settings.readreceipts === 'all'? 'ON ✅' : 'OFF ❌'

        return await sock.sendMessage(from, {
          text: `╔═〘 📩ʀᴇᴀᴅ ʀᴇᴄᴇɪᴘᴛs 〙═╗
┃➠ sᴛᴀᴛᴜs: ${statusText}
┃➠ ʙʟᴜᴇ ᴛɪᴄᴋs: ${settings.readreceipts === 'all'? 'ᴇɴᴀʙʟᴇᴅ' : 'ᴅɪsᴀʙʟᴇᴅ'}
┃
┃➠ ᴏɴ: ${prefix}readreceipts on
┃➠ ᴏғғ: ${prefix}readreceipts off
┃
┃➠ ɴᴏᴛᴇ: ᴛᴜʀɴɪɴɢ ᴏғ ᴍᴇᴀɴs ʏᴏᴜ ᴄᴀɴ'ᴛ
┃➠ sᴇᴇ ᴏᴛʜᴇʀs ʀᴇᴀᴅ ʀᴇᴄᴇɪᴘᴛs ᴛᴏ
╚═══════════════════╝`
        }, { quoted: m })
      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ sᴇᴛɪɴɢs
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 2. UPDATE SETTINGS
    if (['on', 'enable'].includes(subCmd)) {
      try {
        await sock.updateProfileSettings({ readreceipts: 'all' })
        await db.set('privacy_readreceipts', 'all')

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴇɴᴀʙʟᴇᴅ 〙═╗
┃➠ ʀᴇᴀᴅ ʀᴇᴄᴇɪᴘᴛs: ON
┃➠ ʙʟᴜᴇ ᴛɪᴄᴋs ᴇɴᴀʙʟᴇᴅ
┃➠ ᴏᴛʜᴇʀs ᴄᴀɴ sᴇᴇ ᴡʜᴇɴ ʏᴏᴜ ʀᴇᴀᴅ
┃➠ ʏᴏᴜ ᴄᴀɴ sᴇᴇ ᴛʜᴇɪʀs ᴛᴏᴏ
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴇɴᴀʙʟᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    if (['off', 'disable'].includes(subCmd)) {
      try {
        await sock.updateProfileSettings({ readreceipts: 'none' })
        await db.set('privacy_readreceipts', 'none')

        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴅɪsᴀʙʟᴇᴅ 〙═╗
┃➠ ʀᴇᴀᴅ ʀᴇᴄᴇɪᴘᴛs: OFF
┃➠ ʙʟᴜᴇ ᴛɪᴄᴋs ᴅɪsᴀʙʟᴇᴅ
┃➠ ᴏᴛʜᴇʀs ᴄᴀɴ'ᴛ sᴇᴇ ᴡʜᴇɴ ʏᴏᴜ ʀᴇᴀᴅ
┃➠ ʏᴏᴜ ᴄᴀɴ'ᴛ sᴇᴇ ᴛʜᴇɪʀs ᴇɪᴛʜᴇʀ
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴅɪsᴀʙʟᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 📩ʀᴇᴀᴅ ʀᴇᴄᴇɪᴘᴛs 〙═╗
┃➠ ${prefix}readreceipts on - ᴇɴᴀʙʟᴇ ʙʟᴜᴇ ᴛɪᴄᴋs
┃➠ ${prefix}readreceipts off - ᴅɪsᴀʙʟᴇ ʙʟᴜᴇ ᴛɪᴄᴋs
┃➠ ${prefix}readreceipts status - ᴄʜᴇᴄᴋ sᴛᴀᴛᴜs
╚═══════════════════╝`
    }, { quoted: m })
  }
}