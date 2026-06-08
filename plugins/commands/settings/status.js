/**
 * SwiftBot - plugins/commands/settings/status.js
 * Status Privacy - Control who sees your status updates
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 */

export default {
  name: 'status',
  alias: ['statusprivacy', 'stpv'],
  desc: 'Control who can see your status updates - contacts/exclude/include',
  usage: 'all/contacts/nobody | exclude @user | include @user | list | reset',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    const validOptions = ['all', 'contacts', 'nobody', 'exclude', 'include', 'list', 'reset']

    // 1. LIST/STATUS - Check current setting
    if (subCmd === 'list' || subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const excludeList = JSON.parse(await db.get('status_exclude') || '[]')
        const includeList = JSON.parse(await db.get('status_include') || '[]')

        let detailText = ''
        if (settings.status === 'contacts_except' && excludeList.length > 0) {
          detailText = `\n┃➠ ᴇxᴄʟᴜᴅᴇᴅ: ${excludeList.length} users`
        }
        if (settings.status === 'only_share_with' && includeList.length > 0) {
          detailText = `\n┃➠ sʜᴀʀᴇᴅ ᴡɪᴛʜ: ${includeList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 📸sᴛᴀᴛᴜs 〙═╗
┃➠ ᴡʜᴏ ᴄᴀɴ sᴇᴇ: ${settings.status}${detailText}
┃
┃➠ ᴀʟʟ - ᴀɴʏᴏɴᴇ ᴡɪᴛʜ ʏᴏᴜʀ ɴᴜᴍʙᴇʀ
┃➠ ᴄᴏɴᴛᴀᴄᴛs - ᴏɴʟʏ sᴀᴠᴇᴅ ᴄᴏɴᴛᴀᴄᴛs
┃➠ ɴᴏʙᴏᴅʏ - ɴᴏ ᴏɴᴇ
┃➠ ᴇxᴄʟᴜᴅᴇ - ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ ᴜsᴇʀs
┃➠ ɪɴᴄʟᴜᴅᴇ - ᴏɴʟʏ sʜᴀʀᴇ ᴡɪᴛʜ ᴜsᴇʀs
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}status contacts
┃➠ ᴇxᴄʟᴜᴅᴇ: ${prefix}status exclude @user
┃➠ ɪɴᴄʟᴜᴅᴇ: ${prefix}status include @user
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

    // 2. BASIC UPDATE - all/contacts/nobody
    if (['all', 'contacts', 'nobody'].includes(subCmd)) {
      try {
        await sock.updateProfileSettings({ status: subCmd })
        await db.set('privacy_status', subCmd)
        await db.set('status_exclude', null)
        await db.set('status_include', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ sᴛᴀᴛᴜs ᴘʀɪᴠᴀᴄʏ: ${subCmd}
┃➠ ᴡʜᴏ ᴄᴀɴ sᴇᴇ: ${subCmd}
┃
┃➠ ᴠɪᴇᴡ: ${prefix}status list
╚═══════════════════╝`
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

    // 3. EXCLUDE USERS - contacts_except
    if (subCmd === 'exclude') {
      if (mentioned.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴛᴏ ᴇxᴄʟᴜᴅᴇ
┃➠ ᴇx: ${prefix}status exclude @user @user2
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let excludeList = JSON.parse(await db.get('status_exclude') || '[]')
        excludeList = [...new Set([...excludeList,...mentioned])]

        await sock.updateProfileSettings({
          status: 'contacts_except',
          status_except: excludeList
        })
        await db.set('privacy_status', 'contacts_except')
        await db.set('status_exclude', JSON.stringify(excludeList))
        await db.set('status_include', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ sᴛᴀᴛᴜs: ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ
┃➠ ᴇxᴄʟᴜᴅᴇᴅ: ${excludeList.length} users
┃➠ ᴀᴅᴅᴇᴅ: ${mentioned.length} users
╚═══════════════════╝`,
          mentions: mentioned
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴇxᴄʟᴜᴅᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 4. INCLUDE ONLY - only_share_with
    if (subCmd === 'include') {
      if (mentioned.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴛᴏ sʜᴀʀᴇ ᴡɪᴛʜ
┃➠ ᴇx: ${prefix}status include @user @user2
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let includeList = JSON.parse(await db.get('status_include') || '[]')
        includeList = [...new Set([...includeList,...mentioned])]

        await sock.updateProfileSettings({
          status: 'only_share_with',
          status_only_share_with: includeList
        })
        await db.set('privacy_status', 'only_share_with')
        await db.set('status_include', JSON.stringify(includeList))
        await db.set('status_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ sᴛᴀᴛᴜs: ᴏɴʟʏ sʜᴀʀᴇ ᴡɪᴛʜ
┃➠ sʜᴀʀᴇᴅ ᴡɪᴛʜ: ${includeList.length} users
┃➠ ᴀᴅᴅᴇᴅ: ${mentioned.length} users
╚═══════════════════╝`,
          mentions: mentioned
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ɪɴᴄʟᴜᴅᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 5. RESET - Clear exclude/include lists
    if (subCmd === 'reset') {
      try {
        await sock.updateProfileSettings({ status: 'contacts' })
        await db.set('privacy_status', 'contacts')
        await db.set('status_exclude', null)
        await db.set('status_include', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ sᴛᴀᴛᴜs ᴘʀɪᴠᴀᴄʏ: ᴄᴏɴᴛᴀᴄᴛs
┃➠ ᴇxᴄʟᴜᴅᴇ/ɪɴᴄʟᴜᴅᴇ ʟɪsᴛs ᴄʟᴇᴀʀᴇᴅ
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ʀᴇsᴇᴛ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 📸sᴛᴀᴛᴜs 〙═╗
┃➠ ${prefix}status all - ᴀɴʏᴏɴᴇ
┃➠ ${prefix}status contacts - sᴀᴠᴇᴅ ᴏɴʟʏ
┃➠ ${prefix}status nobody - ɴᴏ ᴏɴᴇ
┃➠ ${prefix}status exclude @user - ʜɪᴅᴇ ғʀᴏᴍ
┃➠ ${prefix}status include @user - sʜᴀʀᴇ ᴡɪᴛʜ
┃➠ ${prefix}status list - ᴠɪᴇᴡ sᴇᴛᴛɪɴɢs
┃➠ ${prefix}status reset - ᴄʟᴇᴀʀ ʟɪsᴛs
╚═══════════════════╝`
    }, { quoted: m })
  }
}