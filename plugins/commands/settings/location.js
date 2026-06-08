/**
 * SwiftBot - plugins/commands/settings/location.js
 * Location Privacy - Control live location sharing, who can see, auto-stop timer
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 * Works in DM + Groups, accepts @tag or raw numbers
 */

export default {
  name: 'location',
  alias: ['liveloc', 'loc', 'gps'],
  desc: 'Control live location sharing - all/contacts/nobody + duration + custom excludes',
  usage: 'share 15m/1h/8h | stop | allow all/contacts/nobody | exclude @user | status',
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

    // Helper: Parse duration to seconds
    const parseDuration = (str) => {
      const match = str.match(/^(\d+)(m|h)$/)
      if (!match) return null
      const val = parseInt(match[1])
      const unit = match[2]
      return unit === 'm'? val * 60 : val * 3600
    }

    const validOptions = ['share', 'stop', 'allow', 'exclude', 'status', 'reset']

    // 1. STATUS - Check current settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const activeShare = await db.get('location_active') || false
        const shareExpiry = await db.get('location_expiry') || 0
        const excludeList = JSON.parse(await db.get('location_exclude') || '[]')

        let shareText = 'OFF ❌'
        if (activeShare && shareExpiry > Date.now()) {
          const minsLeft = Math.floor((shareExpiry - Date.now()) / 60000)
          shareText = `ON ✅ - ${minsLeft}m left`
        }

        let detailText = ''
        if (settings.location === 'contacts_except' && excludeList.length > 0) {
          detailText = `\n┃➠ ʜɪᴅᴇɴ ғʀᴏᴍ: ${excludeList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 📍ʟᴏᴄᴀᴛɪᴏɴ 〙═╗
┃➠ ʟɪᴠᴇ sʜᴀʀɪɴɢ: ${shareText}
┃➠ ᴡʜᴏ ᴄᴀɴ sᴇᴇ: ${settings.location || 'all'}${detailText}
┃
┃➠ sʜᴀʀᴇ: ${prefix}location share 1h
┃➠ sᴛᴏᴘ: ${prefix}location stop
┃➠ ᴘʀɪᴠᴀᴄʏ: ${prefix}location allow contacts
┃➠ ʙʟᴏᴄᴋ: ${prefix}location exclude @user
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

    // 2. SHARE - Start live location for duration
    if (subCmd === 'share') {
      const durationStr = args[1]
      const seconds = parseDuration(durationStr)

      if (!seconds || seconds < 900 || seconds > 28800) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴅᴜʀᴀᴛɪᴏɴ
┃➠ ᴜsᴀɢᴇ: ${prefix}location share 15m
┃➠ ᴜsᴀɢᴇ: ${prefix}location share 1h
┃➠ ᴜsᴀɢᴇ: ${prefix}location share 8h
┃➠ ʀᴀɴɢᴇ: 15m - 8h
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        const expiry = Date.now() + (seconds * 1000)
        await sock.updateProfileSettings({ location_sharing: true })
        await db.set('location_active', true)
        await db.set('location_expiry', expiry)

        const durationText = durationStr.replace('m', ' mins').replace('h', ' hours')

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅sʜᴀʀɪɴɢ 〙═╗
┃➠ ʟɪᴠᴇ ʟᴏᴄᴀᴛɪᴏɴ: ON
┃➠ ᴅᴜʀᴀᴛɪᴏɴ: ${durationText}
┃➠ ᴀᴜᴛᴏ-sᴛᴏᴘ: <t:${Math.floor(expiry/1000)}:R>
┃
┃➠ sᴛᴏᴘ: ${prefix}location stop
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ sʜᴀʀᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. STOP - Stop live location sharing
    if (subCmd === 'stop') {
      try {
        await sock.updateProfileSettings({ location_sharing: false })
        await db.set('location_active', false)
        await db.set('location_expiry', 0)

        return await sock.sendMessage(from, {
          text: `╔═〘 🛑sᴛᴏᴘᴇᴅ 〙═╗
┃➠ ʟɪᴠᴇ ʟᴏᴄᴀᴛɪᴏɴ: OFF
┃➠ sʜᴀʀɪɴɢ sᴛᴏᴘᴘᴇᴅ
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ sᴛᴏᴘ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 4. ALLOW - Who can see your location
    if (subCmd === 'allow') {
      const option = args[1]?.toLowerCase()

      if (!['all', 'contacts', 'nobody'].includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}location allow <all/contacts/nobody>
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ location: option })
        await db.set('privacy_location', option)
        await db.set('location_exclude', null)

        let descText = option === 'all'? 'ᴀɴʏᴏɴᴇ ᴄᴀɴ sᴇᴇ' :
                       option === 'contacts'? 'ᴏɴʟʏ ᴄᴏɴᴛᴀᴄᴛs ᴄᴀɴ sᴇᴇ' :
                       'ɴᴏ ᴏɴᴇ ᴄᴀɴ sᴇᴇ ʏᴏᴜʀ ʟᴏᴄᴀᴛɪᴏɴ'

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ʟᴏᴄᴀᴛɪᴏɴ ᴘʀɪᴠᴀᴄʏ: ${option}
┃➠ ${descText}
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

    // 5. EXCLUDE USERS - contacts_except, works with @tag or numbers
    if (subCmd === 'exclude') {
      let targets = mentioned.length > 0? mentioned : parseNumbers(1)

      if (targets.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴏʀ ᴘᴀss ɴᴜᴍʙᴇʀs
┃➠ ᴇx: ${prefix}location exclude @user
┃➠ ᴇx: ${prefix}location exclude 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let excludeList = JSON.parse(await db.get('location_exclude') || '[]')
        excludeList = [...new Set([...excludeList,...targets])]

        await sock.updateProfileSettings({
          location: 'contacts_except',
          location_except: excludeList
        })
        await db.set('privacy_location', 'contacts_except')
        await db.set('location_exclude', JSON.stringify(excludeList))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ʟᴏᴄᴀᴛɪᴏɴ: ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ
┃➠ ʜɪᴅᴅᴇɴ ғʀᴏᴍ: ${excludeList.length} users
┃➠ ᴀᴅᴅᴇᴅ: ${targets.length} users
┃
┃➠ ᴛʜᴇʏ ᴄᴀɴ'ᴛ sᴇᴇ ʏᴏᴜʀ ʟɪᴠᴇ ʟᴏᴄ
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

    // 6. RESET - Clear all
    if (subCmd === 'reset') {
      try {
        await sock.updateProfileSettings({
          location_sharing: false,
          location: 'all'
        })
        await db.set('location_active', false)
        await db.set('location_expiry', 0)
        await db.set('privacy_location', 'all')
        await db.set('location_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ʟɪᴠᴇ sʜᴀʀɪɴɢ: OFF
┃➠ ʟᴏᴄᴀᴛɪᴏɴ ᴘʀɪᴠᴀᴄʏ: ᴀʟʟ
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
      text: `╔═〘 📍ʟᴏᴄᴀᴛɪᴏɴ 〙═╗
┃➠ ${prefix}location share 15m/1h/8h
┃➠ ${prefix}location stop - sᴛᴏᴘ sʜᴀʀɪɴɢ
┃➠ ${prefix}location allow all/contacts/nobody
┃➠ ${prefix}location exclude @user - ʜɪᴅᴇ ғʀᴏᴍ
┃➠ ${prefix}location exclude 2348012345678
┃➠ ${prefix}location status - ᴠɪᴇᴡ sᴇᴛɪɴɢs
┃➠ ${prefix}location reset - ᴄʟᴇᴀʀ ᴀʟ
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}