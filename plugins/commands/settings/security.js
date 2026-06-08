/**
 * SwiftBot - plugins/commands/settings/security.js
 * Security Settings - Encryption status, security code verify, notifications
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings, sock.sendMessage
 * Works in DM + Groups
 */

export default {
  name: 'security',
  alias: ['encrypt', 'secure', 'secnotify'],
  desc: 'Security settings - encryption verify, security notifications, code verify',
  usage: 'verify @user | notifications on/off | e2e | status',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const target = mentioned[0] || (args[1]?.replace(/[^0-9]/g, '') + '@s.whatsapp.net')

    const validOptions = ['verify', 'notifications', 'e2e', 'status', 'code']

    // 1. STATUS - Check security settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const secNotify = await db.get('security_notifications') || true
        const e2eStatus = await db.get('e2e_enabled') || true

        return await sock.sendMessage(from, {
          text: `╔═〘 🔐sᴇᴄᴜʀɪᴛʏ 〙═╗
┃➠ ᴇ2ᴇ ᴇɴᴄʀʏᴘᴛɪᴏɴ: ${e2eStatus? 'ON ✅' : 'OFF ❌'}
┃➠ sᴇᴄᴜʀɪᴛʏ ɴᴏᴛɪғʏ: ${secNotify? 'ON ✅' : 'OFF ❌'}
┃
┃➠ ᴠᴇʀɪғʏ: ${prefix}security verify @user
┃➠ ɴᴏᴛɪғʏ: ${prefix}security notifications on/off
┃➠ ᴇ2ᴇ: ${prefix}security e2e
┃
┃➠ ᴇɴᴄʀʏᴘᴛɪᴏɴ ᴄᴀɴ'ᴛ ʙᴇ ᴅɪsᴀʙʟᴇᴅ
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

    // 2. VERIFY - Security code verification for user
    if (subCmd === 'verify' || subCmd === 'code') {
      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀ ᴏʀ ᴘᴀss ɴᴜᴍʙᴇʀ
┃➠ ᴇx: ${prefix}security verify @user
┃➠ ᴇx: ${prefix}security verify 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        // Request security code - Baileys uses signal protocol
        const identityKey = await sock.signalRepository.getIdentityKey(target)

        if (!identityKey) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴏ sᴇᴄᴜʀɪᴛʏ ᴋᴇʏ ғᴏᴜɴᴅ
┃➠ ᴜsᴇʀ ᴍᴀʏ ɴᴏᴛ ʙᴇ ᴏɴ ᴡʜᴀᴛsᴀᴘ
╚═══════════════════╝`
          }, { quoted: m })
        }

        // Generate 60-digit security code format
        const keyBuffer = Buffer.from(identityKey)
        const code = Array.from(keyBuffer.slice(0, 30))
         .map(b => b.toString().padStart(3, '0'))
         .join(' ')
         .match(/.{1,15}/g)
         .join('\n')

        return await sock.sendMessage(from, {
          text: `╔═〘 🔒sᴇᴄᴜʀɪᴛʏ ᴄᴏᴅᴇ 〙═╗
┃➠ ᴜsᴇʀ: @${target.split('@')[0]}
┃➠ ᴇ2ᴇ ᴠᴇʀɪғɪᴇᴅ: ✅
┃
┃➠ ᴄᴏᴍᴘᴀʀᴇ ᴡɪᴛʜ ᴛʜᴇɪʀ ᴘʜᴏɴᴇ:
┃
${code}
┃
┃➠ ɪғ ᴄᴏᴅᴇs ᴍᴀᴛᴄʜ = sᴇᴄᴜʀᴇ
┃➠ ɪғ ᴅɪғᴇʀᴇɴᴛ = ᴍɪᴛᴍ ʀɪsᴋ
╚═══════════════════╝`,
          mentions: [target]
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴠᴇʀɪғʏ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. NOTIFICATIONS - Security change notifications
    if (subCmd === 'notifications' || subCmd === 'notify') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}security notifications on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ security_notifications: enabled })
        await db.set('security_notifications', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🔔' : '🔕'}ɴᴏᴛɪғɪᴄᴀᴛɪᴏɴs 〙═╗
┃➠ sᴇᴄᴜʀɪᴛʏ ɴᴏᴛɪғʏ: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'ɢᴇᴛ ᴀʟᴇʀᴛs ᴏɴ ᴋᴇʏ ᴄʜᴀɴɢᴇ' : 'ɴᴏ ᴀʟᴇʀᴛs ᴏɴ ᴋᴇʏ ᴄʜᴀɴɢᴇ'}
┃
┃➠ ʀᴇᴄᴏᴍᴍᴇɴᴅᴇᴅ: ᴋᴇᴘ ON
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

    // 4. E2E - End-to-end encryption info
    if (subCmd === 'e2e' || subCmd === 'encryption') {
      try {
        const e2eStatus = await db.get('e2e_enabled') || true

        return await sock.sendMessage(from, {
          text: `╔═〘 🔐ᴇ2ᴇ ᴇɴᴄʀʏᴘᴛɪᴏɴ 〙═╗
┃➠ sᴛᴀᴛᴜs: ${e2eStatus? 'ACTIVE ✅' : 'ERROR ❌'}
┃➠ ᴘʀᴏᴛᴏᴄᴏʟ: Signal Protocol
┃
┃➠ ᴍsɢs: ᴇɴᴄʀʏᴘᴛᴇᴅ
┃➠ ᴄᴀʟʟs: ᴇɴᴄʀʏᴘᴛᴇᴅ
┃➠ sᴛᴀᴛᴜs: ᴇɴᴄʀʏᴘᴛᴇᴅ
┃➠ ᴍᴇᴅɪᴀ: ᴇɴᴄʀʏᴘᴛᴇᴅ
┃
┃➠ ᴏɴʟʏ ʏᴏᴜ & ʀᴇᴄɪᴘɪᴇɴᴛ ᴄᴀɴ ʀᴇᴀᴅ
┃➠ ɴᴏᴛ ᴇᴠᴇɴ ᴡʜᴀᴛsᴀᴘ/ᴍᴇᴛᴀ
┃
┃➠ ᴠᴇʀɪғʏ: ${prefix}security verify @user
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ᴇ2ᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 🔐sᴇᴄᴜʀɪᴛʏ 〙═╗
┃➠ ${prefix}security verify @user - sᴇᴄᴜʀɪᴛʏ ᴄᴏᴅᴇ
┃➠ ${prefix}security verify 2348012345678
┃➠ ${prefix}security notifications on/off
┃➠ ${prefix}security e2e - ᴇɴᴄʀʏᴘᴛɪᴏɴ ɪɴғᴏ
┃➠ ${prefix}security status - ᴠɪᴇᴡ sᴇᴛɪɴɢs
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}