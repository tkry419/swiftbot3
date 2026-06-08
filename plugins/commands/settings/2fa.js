/**
 * SwiftBot - plugins/commands/settings/2fa.js
 * Two-Factor Authentication - Enable/disable PIN, view status, change PIN
 * Category: settings
 * Uses Baileys: sock.update2faSettings
 */

export default {
  name: '2fa',
  alias: ['twofa', 'pin', '2step'],
  desc: 'Manage two-factor authentication - enable/disable PIN, change PIN, view status',
  usage: 'status | enable <pin> | disable | change <old> <new>',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()

    // 1. STATUS - Check 2FA status
    if (subCmd === 'status' ||!subCmd) {
      try {
        // Baileys doesn't have direct fetch for 2FA status, check DB
        const enabled = await db.get('2fa_enabled') || false
        const statusText = enabled? 'ON ✅' : 'OFF ❌'

        return await sock.sendMessage(from, {
          text: `╔═〘 🔐2FA 〙═╗
┃➠ sᴛᴀᴛᴜs: ${statusText}
┃➠ ᴘɪɴ: ${enabled? 'Sᴇᴛ' : 'Nᴏᴛ Sᴇᴛ'}
┃
┃➠ ᴇɴᴀʙʟᴇ: ${prefix}2fa enable 123456
┃➠ ᴅɪsᴀʙʟᴇ: ${prefix}2fa disable
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}2fa change <old> <new>
┃
┃➠ ɴᴏᴛᴇ: 6 ᴅɪɢɪᴛs ᴏɴʟʏ
╚═══════════════════╝`
        }, { quoted: m })
      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ sᴛᴀᴛᴜs
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 2. ENABLE 2FA
    if (subCmd === 'enable') {
      const pin = args[1]
      const enabled = await db.get('2fa_enabled')

      if (enabled) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ 2FA ᴀʟʀᴇᴀᴅʏ ᴇɴᴀʙʟᴇᴅ
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}2fa change <old> <new>
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (!pin ||!/^\d{6}$/.test(pin)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴘɪɴ
┃➠ ᴜsᴀɢᴇ: ${prefix}2fa enable 123456
┃➠ ᴘɪɴ ᴍᴜsᴛ ʙᴇ 6 ᴅɪɢɪᴛs
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.update2faSettings({ pin })
        await db.set('2fa_enabled', true)
        await db.set('2fa_pin', pin)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴇɴᴀʙʟᴇᴅ 〙═╗
┃➠ 2FA: ON
┃➠ ᴘɪɴ: Sᴇᴛ
┃➠ ᴡʜᴀᴛsᴀᴘ ᴡɪʟ ᴀsᴋ ᴘɪɴ ᴏɴ ʀᴇɢɪsᴛᴇʀ
┃
┃➠ ᴅᴏɴ'ᴛ ғᴏʀɢᴇᴛ ʏᴏᴜʀ ᴘɪɴ!
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}2fa change <old> <new>
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴇɴᴀʙʟᴇ 2FA
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. DISABLE 2FA
    if (subCmd === 'disable') {
      const enabled = await db.get('2fa_enabled')

      if (!enabled) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ 2FA ɴᴏᴛ ᴇɴᴀʙʟᴇᴅ
┃➠ ᴇɴᴀʙʟᴇ: ${prefix}2fa enable 123456
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.update2faSettings({ pin: null })
        await db.set('2fa_enabled', false)
        await db.set('2fa_pin', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴅɪsᴀʙʟᴇᴅ 〙═╗
┃➠ 2FA: OFF
┃➠ ᴘɪɴ: Rᴇᴍᴏᴠᴇᴅ
┃➠ ɴᴏ ᴘɪɴ ɴᴇᴇᴅᴇᴅ ᴏɴ ʀᴇɢɪsᴛᴇʀ
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

    // 4. CHANGE PIN
    if (subCmd === 'change') {
      const oldPin = args[1]
      const newPin = args[2]
      const enabled = await db.get('2fa_enabled')
      const storedPin = await db.get('2fa_pin')

      if (!enabled) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ 2FA ɴᴏᴛ ᴇɴᴀʙʟᴇᴅ
┃➠ ᴇɴᴀʙʟᴇ: ${prefix}2fa enable 123456
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (!oldPin ||!newPin) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴘɪɴ
┃➠ ᴜsᴀɢᴇ: ${prefix}2fa change 123456 654321
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (oldPin!== storedPin) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏʟᴅ ᴘɪɴ ᴡʀᴏɴɢ
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (!/^\d{6}$/.test(newPin)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴇᴡ ᴘɪɴ ᴍᴜsᴛ ʙᴇ 6 ᴅɪɢɪᴛs
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.update2faSettings({ pin: newPin })
        await db.set('2fa_pin', newPin)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴄʜᴀɴɢᴇᴅ 〙═╗
┃➠ 2FA ᴘɪɴ ᴜᴘᴅᴀᴛᴇᴅ
┃➠ ᴅᴏɴ'ᴛ ғᴏʀɢᴇᴛ ɴᴇᴡ ᴘɪɴ!
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴄʜᴀɴɢᴇ ᴘɪɴ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 🔐2FA 〙═╗
┃➠ ${prefix}2fa status - ᴄʜᴇᴄᴋ sᴛᴀᴛᴜs
┃➠ ${prefix}2fa enable 123456 - ᴇɴᴀʙʟᴇ
┃➠ ${prefix}2fa disable - ᴅɪsᴀʙʟᴇ
┃➠ ${prefix}2fa change <old> <new>
┃
┃➠ ᴘɪɴ: 6 ᴅɪɢɪᴛs ᴏɴʟʏ
╚═══════════════════╝`
    }, { quoted: m })
  }
}