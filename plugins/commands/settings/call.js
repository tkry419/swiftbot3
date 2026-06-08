/**
 * SwiftBot - plugins/commands/settings/calls.js
 * Calls Privacy - Control who can call you, silence unknown callers
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 * Works in DM + Groups, accepts @tag or raw numbers
 */

export default {
  name: 'calls',
  alias: ['callprivacy', 'callpv', 'silence'],
  desc: 'Control who can call you - all/contacts/nobody + silence unknown + custom excludes',
  usage: 'all/contacts/nobody | silence on/off | exclude @user | exclude 2348012345678 | status',
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

    const validOptions = ['all', 'contacts', 'nobody', 'exclude', 'silence', 'status', 'reset']

    // 1. STATUS - Check current setting
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const excludeList = JSON.parse(await db.get('calls_exclude') || '[]')
        const silenceUnknown = await db.get('calls_silence_unknown') || false

        let detailText = ''
        if (settings.calladd === 'contacts_except' && excludeList.length > 0) {
          detailText = `\n┃➠ ᴇxᴄʟᴜᴅᴇᴅ: ${excludeList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 📞ᴄᴀʟʟs 〙═╗
┃➠ ᴡʜᴏ ᴄᴀɴ ᴄᴀʟ: ${settings.calladd}${detailText}
┃➠ sɪʟᴇɴᴄᴇ ᴜɴᴋɴᴏᴡɴ: ${silenceUnknown? 'ON ✅' : 'OFF ❌'}
┃
┃➠ ᴀʟʟ - ᴀɴʏᴏɴᴇ ᴄᴀɴ ᴄᴀʟ
┃➠ ᴄᴏɴᴛᴀᴄᴛs - sᴀᴠᴇᴅ ᴏɴʟʏ
┃➠ ɴᴏʙᴏᴅʏ - ɴᴏ ᴏɴᴇ ᴄᴀɴ ᴄᴀʟ
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}calls contacts
┃➠ sɪʟᴇɴᴄᴇ: ${prefix}calls silence on
┃➠ ʙʟᴏᴄᴋ: ${prefix}calls exclude @user
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
        await sock.updateProfileSettings({ calladd: subCmd })
        await db.set('privacy_calls', subCmd)
        await db.set('calls_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ᴄᴀʟʟs ᴘʀɪᴠᴀᴄʏ: ${subCmd}
┃➠ ᴡʜᴏ ᴄᴀɴ ᴄᴀʟ: ${subCmd}
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

    // 3. SILENCE UNKNOWN CALLERS
    if (subCmd === 'silence') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}calls silence on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ calladd_silence_unknown: enabled })
        await db.set('calls_silence_unknown', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🔇' : '🔊'}sɪʟᴇɴᴄᴇ 〙═╗
┃➠ sɪʟᴇɴᴄᴇ ᴜɴᴋɴᴏᴡɴ: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'ᴜɴᴋɴᴏᴡɴ ᴄᴀʟʟs sɪʟᴇɴᴄᴇᴅ' : 'ᴀʟ ᴄᴀʟʟs ᴡɪʟ ʀɪɴɢ'}
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴛᴏɢʟᴇ
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
┃➠ ᴇx: ${prefix}calls exclude @user
┃➠ ᴇx: ${prefix}calls exclude 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let excludeList = JSON.parse(await db.get('calls_exclude') || '[]')
        excludeList = [...new Set([...excludeList,...targets])]

        await sock.updateProfileSettings({
          calladd: 'contacts_except',
          calladd_except: excludeList
        })
        await db.set('privacy_calls', 'contacts_except')
        await db.set('calls_exclude', JSON.stringify(excludeList))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ᴄᴀʟʟs: ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ
┃➠ ʙʟᴏᴄᴋᴇᴅ: ${excludeList.length} users
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
        await sock.updateProfileSettings({ calladd: 'contacts' })
        await db.set('privacy_calls', 'contacts')
        await db.set('calls_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ᴄᴀʟʟs ᴘʀɪᴠᴀᴄʏ: ᴄᴏɴᴛᴀᴄᴛs
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
      text: `╔═〘 📞ᴄᴀʟʟs 〙═╗
┃➠ ${prefix}calls all - ᴀɴʏᴏɴᴇ ᴄᴀɴ ᴄᴀʟ
┃➠ ${prefix}calls contacts - sᴀᴠᴇᴅ ᴏɴʟʏ
┃➠ ${prefix}calls nobody - ɴᴏ ᴏɴᴇ ᴄᴀɴ ᴄᴀʟ
┃➠ ${prefix}calls silence on/off
┃➠ ${prefix}calls exclude @user - ʙʟᴏᴄᴋ
┃➠ ${prefix}calls exclude 2348012345678
┃➠ ${prefix}calls status - ᴠɪᴇᴡ sᴇᴛᴛɪɴɢs
┃➠ ${prefix}calls reset - ᴄʟᴇᴀʀ ʟɪsᴛ
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}