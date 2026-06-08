/**
 * SwiftBot - plugins/commands/settings/forward.js
 * Forward Privacy - Control forward limits, frequently forwarded tag, who can forward your msgs
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 * Works in DM + Groups, accepts @tag or raw numbers
 */

export default {
  name: 'forward',
  alias: ['fwd', 'forwardprivacy', 'freqfwd'],
  desc: 'Control message forwarding - limits, frequently forwarded tag, who can forward your msgs',
  usage: 'limit 1-5 | tag on/off | allow all/contacts/nobody | exclude @user | status | reset',
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

    const validOptions = ['limit', 'tag', 'allow', 'exclude', 'status', 'reset']

    // 1. STATUS - Check current settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const fwdLimit = await db.get('fwd_limit') || 5
        const freqTag = await db.get('fwd_freq_tag') || true
        const excludeList = JSON.parse(await db.get('fwd_exclude') || '[]')

        let detailText = ''
        if (settings.forward === 'contacts_except' && excludeList.length > 0) {
          detailText = `\n┃➠ ʙʟᴏᴄᴋᴇᴅ: ${excludeList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 ➡️ғᴏʀᴡᴀʀᴅ 〙═╗
┃➠ ғᴏʀᴡᴀʀᴅ ʟɪᴍɪᴛ: ${fwdLimit} ᴄʜᴀᴛs
┃➠ ғʀᴇǫ ᴛᴀɢ: ${freqTag? 'ON ✅' : 'OFF ❌'}
┃➠ ᴡʜᴏ ᴄᴀɴ ғᴡᴅ: ${settings.forward || 'all'}${detailText}
┃
┃➠ ʟɪᴍɪᴛ: ${prefix}forward limit 3
┃➠ ᴛᴀɢ: ${prefix}forward tag off
┃➠ ʙʟᴏᴄᴋ: ${prefix}forward exclude @user
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

    // 2. FORWARD LIMIT - Set max chats per forward 1-5
    if (subCmd === 'limit') {
      const limit = parseInt(args[1])

      if (isNaN(limit) || limit < 1 || limit > 5) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ʟɪᴍɪᴛ
┃➠ ᴜsᴀɢᴇ: ${prefix}forward limit 3
┃➠ ʀᴀɴɢᴇ: 1-5 ᴄʜᴀᴛs
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ forward_limit: limit })
        await db.set('fwd_limit', limit)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ғᴏʀᴡᴀʀᴅ ʟɪᴍɪᴛ: ${limit} ᴄʜᴀᴛs
┃➠ ᴍsɢs ᴄᴀɴ ʙᴇ ғᴡᴅ ᴛᴏ ᴍᴀx ${limit}
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ sᴇᴛ ʟɪᴍɪᴛ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. FREQUENTLY FORWARDED TAG
    if (subCmd === 'tag') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}forward tag on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ forward_freq_tag: enabled })
        await db.set('fwd_freq_tag', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🏷️' : '🚫'}ғʀᴇǫ ᴛᴀɢ 〙═╗
┃➠ ғʀᴇǫ ғᴏʀᴡᴀʀᴅᴇᴅ ᴛᴀɢ: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'ᴍsɢs sʜᴏᴡ "ғʀᴇǫ ғᴏʀᴡᴀʀᴅᴇᴅ"' : 'ᴍsɢs ᴡᴏɴ\'ᴛ sʜᴏᴡ ᴛᴀɢ'}
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

    // 4. ALLOW - Who can forward your messages
    if (subCmd === 'allow') {
      const option = args[1]?.toLowerCase()

      if (!['all', 'contacts', 'nobody'].includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}forward allow <all/contacts/nobody>
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ forward: option })
        await db.set('privacy_forward', option)
        await db.set('fwd_exclude', null)

        let descText = option === 'all'? 'ᴀɴʏᴏɴᴇ ᴄᴀɴ ғᴏʀᴡᴀʀᴅ' :
                       option === 'contacts'? 'ᴏɴʟʏ ᴄᴏɴᴛᴀᴄᴛs ᴄᴀɴ ғᴏʀᴡᴀʀᴅ' :
                       'ɴᴏ ᴏɴᴇ ᴄᴀɴ ғᴏʀᴡᴀʀᴅ ʏᴏᴜʀ ᴍsɢs'

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ғᴏʀᴡᴀʀᴅ ᴘʀɪᴠᴀᴄʏ: ${option}
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
┃➠ ᴇx: ${prefix}forward exclude @user
┃➠ ᴇx: ${prefix}forward exclude 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let excludeList = JSON.parse(await db.get('fwd_exclude') || '[]')
        excludeList = [...new Set([...excludeList,...targets])]

        await sock.updateProfileSettings({
          forward: 'contacts_except',
          forward_except: excludeList
        })
        await db.set('privacy_forward', 'contacts_except')
        await db.set('fwd_exclude', JSON.stringify(excludeList))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ғᴏʀᴡᴀʀᴅ: ᴄᴏɴᴛᴀᴄᴛs ᴇxᴄᴇᴘᴛ
┃➠ ʙʟᴏᴄᴋᴇᴅ: ${excludeList.length} users
┃➠ ᴀᴅᴅᴇᴅ: ${targets.length} users
┃
┃➠ ᴛʜᴇʏ ᴄᴀɴ'ᴛ ғᴏʀᴡᴀʀᴅ ʏᴏᴜʀ ᴍsɢs
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
          forward_limit: 5,
          forward_freq_tag: true,
          forward: 'all'
        })
        await db.set('fwd_limit', 5)
        await db.set('fwd_freq_tag', true)
        await db.set('privacy_forward', 'all')
        await db.set('fwd_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ғᴏʀᴡᴀʀᴅ ʟɪᴍɪᴛ: 5
┃➠ ғʀᴇǫ ᴛᴀɢ: ON
┃➠ ғᴏʀᴡᴀʀᴅ ᴘʀɪᴠᴀᴄʏ: ᴀʟʟ
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
      text: `╔═〘 ➡️ғᴏʀᴡᴀʀᴅ 〙═╗
┃➠ ${prefix}forward limit 1-5 - sᴇᴛ ᴍᴀx
┃➠ ${prefix}forward tag on/off - ғʀᴇǫ ᴛᴀɢ
┃➠ ${prefix}forward allow all/contacts/nobody
┃➠ ${prefix}forward exclude @user - ʙʟᴏᴄᴋ
┃➠ ${prefix}forward exclude 2348012345678
┃➠ ${prefix}forward status - ᴠɪᴇᴡ sᴇᴛɪɴɢs
┃➠ ${prefix}forward reset - ᴄʟᴇᴀʀ ᴀʟ
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}