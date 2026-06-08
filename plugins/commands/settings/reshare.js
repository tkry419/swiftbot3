/**
 * SwiftBot - plugins/commands/settings/reshare.js
 * Reshare Privacy - Control who can reshare your status/messages to others
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 * Works in DM + Groups, accepts @tag or raw numbers
 */

export default {
  name: 'reshare',
  alias: ['share', 'forwardprivacy', 'resharepv'],
  desc: 'Control who can reshare your status & messages - all/contacts/nobody + custom excludes',
  usage: 'all/contacts/nobody | exclude @user | exclude 2348012345678 | status | reset',
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

    const validOptions = ['all', 'contacts', 'nobody', 'exclude', 'status', 'reset']

    // 1. STATUS - Check current setting
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const excludeList = JSON.parse(await db.get('reshare_exclude') || '[]')

        let detailText = ''
        if (settings.reshare === 'contacts_except' && excludeList.length > 0) {
          detailText = `\n┃➠ ʙʟᴏᴄᴋᴇᴅ: ${excludeList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 🔁ʀᴇsʜᴀʀᴇ 〙═╗
┃➠ ᴡʜᴏ ᴄᴀɴ ʀᴇsʜᴀʀᴇ: ${settings.reshare || 'all'}${detailText}
┃
┃➠ ᴀʟʟ - ᴀɴʏᴏɴᴇ ᴄᴀɴ ғᴏʀᴡᴀʀᴅ
┃➠ ᴄᴏɴᴛᴀᴄᴛs - sᴀᴠᴇᴅ ᴏɴʟʏ
┃➠ ɴᴏʙᴏᴅʏ - ᴅɪsᴀʙʟᴇ ʀᴇsʜᴀʀɪɴɢ
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}reshare contacts
┃➠ ʙʟᴏᴄᴋ: ${prefix}reshare exclude @user
┃➠ ᴡᴏʀᴋs ғᴏʀ sᴛᴀᴛᴜs & ᴍsɢs
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
        await sock.updateProfileSettings({ reshare: subCmd })
        await db.set('privacy_reshare', subCmd)
        await db.set('reshare_exclude', null)

        let descText = subCmd === 'all'? 'ᴀɴʏᴏɴᴇ ᴄᴀɴ ʀᴇsʜᴀʀᴇ' :
                       subCmd === 'contacts'? 'ᴏɴʟʏ ᴄᴏɴᴛᴀᴄᴛs ᴄᴀɴ ʀᴇsʜᴀʀᴇ' :
                       'ʀᴇsʜᴀʀɪɴɢ ᴅɪsᴀʙʟᴇᴅ'

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ʀᴇsʜᴀʀᴇ ᴘʀɪᴠᴀᴄʏ: ${subCmd}
┃➠ ${descText}
┃
┃➠ ᴀᴘᴘʟɪᴇs ᴛᴏ sᴛᴀᴛᴜs & ᴍsɢs
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

    // 3. EXCLUDE USERS - contacts_except, works with @tag or numbers
    if (subCmd === 'exclude') {
      let targets = mentioned.length > 0? mentioned : parseNumbers(1)

      if (targets.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴏʀ ᴘᴀss ɴᴜᴍʙᴇʀs
┃➠ ᴇx: ${prefix}reshare exclude @user
┃➠ ᴇx: ${prefix}reshare exclude 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let excludeList = JSON.parse(await db.get('reshare_exclude') || '[]')
        excludeList = [...new Set([...excludeList,...targets])]

        await sock.updateProfileSettings({
          reshare: 'contacts_except',
          reshare_except: excludeList
        })
        await db.set('privacy_reshare', 'contacts_except')
        await db.set('reshare_exclude', JSON.stringify(excludeList))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ʀᴇsʜᴀʀᴇ: ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ
┃➠ ʙʟᴏᴄᴋᴇᴅ: ${excludeList.length} users
┃➠ ᴀᴅᴅᴇᴅ: ${targets.length} users
┃
┃➠ ᴛʜᴇʏ ᴄᴀɴ'ᴛ ғᴏʀᴡᴀʀᴅ ʏᴏᴜʀ sᴛᴜғ
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

    // 4. RESET - Clear exclude list
    if (subCmd === 'reset') {
      try {
        await sock.updateProfileSettings({ reshare: 'contacts' })
        await db.set('privacy_reshare', 'contacts')
        await db.set('reshare_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ʀᴇsʜᴀʀᴇ ᴘʀɪᴠᴀᴄʏ: ᴄᴏɴᴛᴀᴄᴛs
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
      text: `╔═〘 🔁ʀᴇsʜᴀʀᴇ 〙═╗
┃➠ ${prefix}reshare all - ᴀɴʏᴏɴᴇ ᴄᴀɴ ғᴏʀᴡᴀʀᴅ
┃➠ ${prefix}reshare contacts - sᴀᴠᴇᴅ ᴏɴʟʏ
┃➠ ${prefix}reshare nobody - ᴅɪsᴀʙʟᴇ ғᴏʀᴡᴀʀᴅ
┃➠ ${prefix}reshare exclude @user - ʙʟᴏᴄᴋ
┃➠ ${prefix}reshare exclude 2348012345678
┃➠ ${prefix}reshare status - ᴠɪᴇᴡ sᴇᴛᴛɪɴɢs
┃➠ ${prefix}reshare reset - ᴄʟᴇᴀʀ ʟɪsᴛ
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}