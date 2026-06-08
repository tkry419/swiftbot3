/**
 * SwiftBot - plugins/commands/settings/groups.js
 * Groups Privacy - Control who can add you to groups
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 */

export default {
  name: 'groups',
  alias: ['groupadd', 'groupprivacy'],
  desc: 'Control who can add you to groups - everyone/contacts/nobody + custom excludes',
  usage: 'all/contacts/nobody | except @user | status',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    const validOptions = ['all', 'contacts', 'nobody', 'except']

    // 1. STATUS - Check current setting
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const exceptList = JSON.parse(await db.get('privacy_groups_except') || '[]')
        let exceptText = ''

        if (exceptList.length > 0 && settings.groups === 'contacts_except') {
          exceptText = `\n┃➠ ᴇxᴄʟᴜᴅᴇᴅ: ${exceptList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 👥ɢʀᴏᴜᴘs 〙═╗
┃➠ ᴡʜᴏ ᴄᴀɴ ᴀᴅᴅ ʏᴏᴜ: ${settings.groups}${exceptText}
┃
┃➠ ᴀʟʟ - ᴀɴʏᴏɴᴇ
┃➠ ᴄᴏɴᴛᴀᴄᴛs - ᴏɴʟʏ sᴀᴠᴇᴅ
┃➠ ɴᴏʙᴏᴅʏ - ɴᴏ ᴏɴᴇ
┃➠ ᴇxᴄᴇᴘᴛ - ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ ᴜsᴇʀs
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}groups contacts
┃➠ ᴇxᴄʟᴜᴅᴇ: ${prefix}groups except @user
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
    if (validOptions.includes(subCmd)) {
      try {
        let updateValue = subCmd
        let exceptUsers = []

        // Handle "contacts_except" with custom numbers
        if (subCmd === 'except') {
          if (mentioned.length === 0) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴛᴏ ʙʟᴏᴄᴋ ғʀᴏᴍ ᴀᴅᴅɪɴɢ
┃➠ ᴇx: ${prefix}groups except @user @user2
╚═══════════════════╝`
            }, { quoted: m })
          }
          updateValue = 'contacts_except'
          exceptUsers = mentioned
          await db.set('privacy_groups_except', JSON.stringify(exceptUsers))
        } else {
          // Clear except list if switching to all/contacts/nobody
          await db.set('privacy_groups_except', null)
        }

        const updateObj = { groups: updateValue }
        if (exceptUsers.length > 0) updateObj.groups_except = exceptUsers

        await sock.updateProfileSettings(updateObj)
        await db.set('privacy_groups', updateValue)

        let resultText = `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ɢʀᴏᴜᴘ ᴀᴅᴅ: ${updateValue}`

        if (exceptUsers.length > 0) {
          resultText += `\n┃➠ ʙʟᴏᴄᴋᴇᴅ: ${exceptUsers.length} users`
        }

        resultText += `\n┃
┃➠ ᴠɪᴇᴡ: ${prefix}groups status
╚═══════════════════╝`

        return await sock.sendMessage(from, {
          text: resultText,
          mentions: exceptUsers
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴜᴘᴅᴀᴛᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 👥ɢʀᴏᴜᴘs 〙═╗
┃➠ ${prefix}groups all - ᴀɴʏᴏɴᴇ ᴄᴀɴ ᴀᴅᴅ
┃➠ ${prefix}groups contacts - ᴏɴʟʏ ᴄᴏɴᴛᴀᴄᴛs
┃➠ ${prefix}groups nobody - ɴᴏ ᴏɴᴇ ᴄᴀɴ ᴀᴅᴅ
┃➠ ${prefix}groups except @user - ʙʟᴏᴄᴋ ᴜsᴇʀs
┃➠ ${prefix}groups status - ᴄʜᴇᴄᴋ sᴇᴛᴛɪɴɢ
╚═══════════════════╝`
    }, { quoted: m })
  }
}