/**
 * SwiftBot - plugins/commands/settings/privacy.js
 * Privacy Settings - Control who sees profile, last seen, status, about
 * Supports: all, contacts, nobody, contacts_except with custom numbers
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 */

export default {
  name: 'privacy',
  alias: ['priv', 'pv'],
  desc: 'Manage privacy settings - profile pic, last seen, status, about + custom numbers',
  usage: 'pic <all/contacts/nobody> | pic except @user | lastseen <all/contacts/nobody> | status <all/contacts/nobody> | about <all/contacts/nobody> | show',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const value = args[1]?.toLowerCase()
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    const validOptions = ['all', 'contacts', 'nobody', 'except']
    const settingsMap = {
      'pic': 'profile',
      'lastseen': 'last',
      'status': 'status',
      'about': 'about',
      'online': 'online',
      'groups': 'groups'
    }

    // 1. SHOW CURRENT SETTINGS
    if (subCmd === 'show' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()

        let exceptText = ''
        for (const key of Object.keys(settingsMap)) {
          const exceptList = await db.get(`privacy_${key}_except`)
          if (exceptList) {
            const parsed = JSON.parse(exceptList)
            if (parsed.length > 0) {
              exceptText += `\n┃➠ ${key}: ${parsed.length} excluded`
            }
          }
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 🔒ᴘʀɪᴠᴀᴄʏ 〙═╗
┃➠ ᴘʀᴏғɪʟᴇ ᴘɪᴄ: ${settings.profile}
┃➠ ʟᴀsᴛ sᴇᴇɴ: ${settings.last}
┃➠ ᴏɴʟɪɴᴇ: ${settings.online}
┃➠ sᴛᴀᴛᴜs: ${settings.status}
┃➠ ᴀʙᴏᴜᴛ: ${settings.about}
┃➠ ʀᴇᴀᴅ ʀᴇᴄᴇɪᴘᴛs: ${settings.readreceipts}
┃➠ ɢʀᴏᴜᴘs: ${settings.groups}${exceptText}
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}privacy pic contacts
┃➠ ᴇxᴄʟᴜᴅᴇ: ${prefix}privacy pic except @user
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
    if (subCmd in settingsMap) {
      if (!value ||!validOptions.includes(value)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴏᴘᴛɪᴏɴ
┃➠ ᴜsᴀɢᴇ: ${prefix}privacy ${subCmd} <all/contacts/nobody/except>
┃➠ ᴇx: ${prefix}privacy pic contacts
┃➠ ᴇx: ${prefix}privacy pic except @user
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let updateValue = value
        let exceptUsers = []

        // Handle "contacts_except" with custom numbers
        if (value === 'except') {
          if (mentioned.length === 0) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴛᴏ ᴇxᴄʟᴜᴅᴇ
┃➠ ᴇx: ${prefix}privacy ${subCmd} except @user @user2
╚═══════════════════╝`
            }, { quoted: m })
          }
          updateValue = 'contacts_except'
          exceptUsers = mentioned
          await db.set(`privacy_${subCmd}_except`, JSON.stringify(exceptUsers))
        } else {
          // Clear except list if switching to all/contacts/nobody
          await db.set(`privacy_${subCmd}_except`, null)
        }

        // Update privacy via Baileys
        const updateObj = { [settingsMap[subCmd]]: updateValue }
        if (exceptUsers.length > 0) updateObj[settingsMap[subCmd] + '_except'] = exceptUsers

        await sock.updateProfileSettings(updateObj)
        await db.set(`privacy_${subCmd}`, updateValue)

        let resultText = `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ${subCmd.toUpperCase()}: ${updateValue}`

        if (exceptUsers.length > 0) {
          resultText += `\n┃➠ ᴇxᴄʟᴜᴅᴇᴅ: ${exceptUsers.length} users`
        }

        resultText += `\n┃
┃➠ ᴠɪᴇᴡ ᴀʟ: ${prefix}privacy show
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
      text: `╔═〘 🔒ᴘʀɪᴠᴀᴄʏ 〙═╗
┃➠ ${prefix}privacy show - ᴠɪᴇᴡ ᴀʟ
┃➠ ${prefix}privacy pic <all/contacts/nobody>
┃➠ ${prefix}privacy pic except @user
┃➠ ${prefix}privacy lastseen <all/contacts/nobody>
┃➠ ${prefix}privacy online <all/contacts/nobody>
┃➠ ${prefix}privacy status <all/contacts/nobody>
┃➠ ${prefix}privacy about <all/contacts/nobody>
┃➠ ${prefix}privacy groups <all/contacts/nobody>
┃
┃➠ ᴇx: ${prefix}privacy pic except @user @user2
╚═══════════════════╝`
    }, { quoted: m })
  }
}