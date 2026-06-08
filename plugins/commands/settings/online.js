/**
 * SwiftBot - plugins/commands/settings/online.js
 * Online Status Privacy - Control who sees when you're online/last seen
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 * Works in DM + Groups, accepts @tag or raw numbers
 */

export default {
  name: 'online',
  alias: ['lastseen', 'onlinepv', 'presence'],
  desc: 'Control online status & last seen - all/contacts/nobody + custom excludes',
  usage: 'all/contacts/nobody | exclude @user | exclude 2348012345678 | lastseen <option> | status',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    // Helper: Parse numbers from args if no mentions
    const parseNumbers = (startIdx = 1) => {
      const nums = []
      for (let i = startIdx; i < args.length; i++) {
        const clean = args[i].replace(/[^0-9]/g, '')
        if (clean.length >= 10) nums.push(clean + '@s.whatsapp.net')
      }
      return nums
    }

    const validOptions = ['all', 'contacts', 'nobody', 'exclude', 'lastseen', 'status', 'reset']

    // 1. STATUS - Check current setting
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const excludeList = JSON.parse(await db.get('online_exclude') || '[]')

        let detailText = ''
        if (settings.online === 'contacts_except' && excludeList.length > 0) {
          detailText = `\n┃➠ ʜɪᴅᴇɴ ғʀᴏᴍ: ${excludeList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 🟢ᴏɴʟɪɴᴇ 〙═╗
┃➠ ᴏɴʟɪɴᴇ sᴛᴀᴛᴜs: ${settings.online}${detailText}
┃➠ ʟᴀsᴛ sᴇᴇɴ: ${settings.last}
┃
┃➠ ᴀʟʟ - ᴀɴʏᴏɴᴇ sᴇᴇs ᴏɴʟɪɴᴇ
┃➠ ᴄᴏɴᴛᴀᴄᴛs - sᴀᴠᴇᴅ ᴏɴʟʏ
┃➠ ɴᴏʙᴏᴅʏ - ᴀʟᴡᴀʏs ʜɪᴅᴅᴇɴ
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}online contacts
┃➠ ʜɪᴅᴇ: ${prefix}online exclude @user
┃➠ ʟᴀsᴛsᴇɴ: ${prefix}online lastseen nobody
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

    // 2. LAST SEEN SEPARATE CONTROL
    if (subCmd === 'lastseen') {
      const option = args[1]?.toLowerCase()

      if (!['all', 'contacts', 'nobody'].includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}online lastseen <all/contacts/nobody>
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ last: option })
        await db.set('privacy_lastseen', option)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ʟᴀsᴛ sᴇᴇɴ: ${option}
┃➠ ᴡʜᴏ ᴄᴀɴ sᴇᴇ: ${option}
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴜᴘᴅᴀᴛᴇ ʟᴀsᴛsᴇɴ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. BASIC UPDATE - all/contacts/nobody for online
    if (['all', 'contacts', 'nobody'].includes(subCmd)) {
      try {
        await sock.updateProfileSettings({ online: subCmd })
        await db.set('privacy_online', subCmd)
        await db.set('online_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ᴏɴʟɪɴᴇ sᴛᴀᴛᴜs: ${subCmd}
┃➠ ᴡʜᴏ sᴇᴇs ᴜ ᴏɴʟɪɴᴇ: ${subCmd}
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

    // 4. EXCLUDE USERS - contacts_except, works with @tag or numbers
    if (subCmd === 'exclude') {
      let targets = mentioned.length > 0? mentioned : parseNumbers(1)

      if (targets.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴏʀ ᴘᴀss ɴᴜᴍʙᴇʀs
┃➠ ᴇx: ${prefix}online exclude @user
┃➠ ᴇx: ${prefix}online exclude 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let excludeList = JSON.parse(await db.get('online_exclude') || '[]')
        excludeList = [...new Set([...excludeList,...targets])]

        await sock.updateProfileSettings({
          online: 'contacts_except',
          online_except: excludeList
        })
        await db.set('privacy_online', 'contacts_except')
        await db.set('online_exclude', JSON.stringify(excludeList))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ᴏɴʟɪɴᴇ: ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ
┃➠ ʜɪᴅᴅᴇɴ ғʀᴏᴍ: ${excludeList.length} users
┃➠ ᴀᴅᴅᴇᴅ: ${targets.length} users
╚═══════════════════╝`,
          mentions: targets
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

    // 5. RESET - Clear exclude list
    if (subCmd === 'reset') {
      try {
        await sock.updateProfileSettings({ online: 'contacts' })
        await db.set('privacy_online', 'contacts')
        await db.set('online_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ᴏɴʟɪɴᴇ sᴛᴀᴛᴜs: ᴄᴏɴᴛᴀᴄᴛs
┃➠ ᴇxᴄʟᴜᴅᴇ ʟɪsᴛ ᴄʟᴇᴀʀᴇᴅ
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
      text: `╔═〘 🟢ᴏɴʟɪɴᴇ 〙═╗
┃➠ ${prefix}online all - ᴀɴʏᴏɴᴇ sᴇᴇs ᴜ
┃➠ ${prefix}online contacts - sᴀᴠᴇᴅ ᴏɴʟʏ
┃➠ ${prefix}online nobody - ᴀʟᴡᴀʏs ʜɪᴅᴇ
┃➠ ${prefix}online exclude @user - ʜɪᴅᴇ ғʀᴏᴍ
┃➠ ${prefix}online exclude 2348012345678
┃➠ ${prefix}online lastseen <option>
┃➠ ${prefix}online status - ᴠɪᴇᴡ sᴇᴛᴛɪɴɢs
┃➠ ${prefix}online reset - ᴄʟᴇᴀʀ ʟɪsᴛ
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}