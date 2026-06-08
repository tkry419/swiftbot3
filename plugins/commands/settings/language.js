/**
 * SwiftBot - plugins/commands/settings/language.js
 * Language Settings - App language, translate messages, keyboard language
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings
 * Works in DM + Groups
 */

export default {
  name: 'language',
  alias: ['lang', 'translate', 'keyboard'],
  desc: 'Language settings - app language, auto-translate, keyboard language',
  usage: 'app en/es/ar/fr/hi/pt | auto on/off | keyboard en/es/ar | list | status | reset',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const option = args[1]?.toLowerCase()

    const supportedLangs = {
      'en': 'Eɴɢʟɪsʜ',
      'es': 'Espanol',
      'ar': 'العربية',
      'fr': 'Fʀᴀɴᴄᴀɪs',
      'hi': 'हिंदी',
      'pt': 'Pᴏʀᴛᴜɢᴜᴇs',
      'de': 'Dᴇᴜᴛsᴄʜ',
      'it': 'Iᴛᴀʟɪᴀɴᴏ',
      'ru': 'Pусский',
      'ja': '日本語',
      'ko': '한국어',
      'zh': '中文',
      'tr': 'Tᴜʀᴋᴄᴇ',
      'id': 'Bᴀʜᴀsᴀ',
      'sw': 'Kɪsᴡᴀʜɪʟɪ',
      'yo': 'Yᴏʀᴜʙᴀ',
      'ha': 'Hᴀᴜsᴀ',
      'ig': 'Iɢʙᴏ'
    }

    // 1. STATUS - Check current settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const appLang = await db.get('lang_app') || 'en'
        const autoTranslate = await db.get('lang_auto_translate') || false
        const keyboardLang = await db.get('lang_keyboard') || 'en'

        return await sock.sendMessage(from, {
          text: `╔═〘 🌐ʟᴀɴɢᴜᴀɢᴇ 〙═╗
┃➠ ᴀᴘᴘ ʟᴀɴɢᴜᴀɢᴇ: ${supportedLangs[appLang] || appLang}
┃➠ ᴀᴜᴛᴏ-ᴛʀᴀɴsʟᴀᴛᴇ: ${autoTranslate? 'ON ✅' : 'OFF ❌'}
┃➠ ᴋᴇʏʙᴏᴀʀᴅ: ${supportedLangs[keyboardLang] || keyboardLang}
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}language app es
┃➠ ʟɪsᴛ: ${prefix}language list
┃➠ ᴛʀᴀɴsʟᴀᴛᴇ: ${prefix}language auto on
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

    // 2. APP - Change app language
    if (subCmd === 'app') {
      if (!option ||!supportedLangs[option]) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}language app <code>
┃➠ ᴇx: ${prefix}language app es
┃➠ ʟɪsᴛ: ${prefix}language list
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ language: option })
        await db.set('lang_app', option)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ᴀᴘᴘ ʟᴀɴɢᴜᴀɢᴇ: ${supportedLangs[option]}
┃➠ ᴡʜᴀᴛsᴀᴘ ᴡɪʟ ᴜsᴇ ${supportedLangs[option]}
┃
┃➠ ʀᴇsᴛᴀʀᴛ ᴀᴘᴘ ɪғ ɴᴇᴅᴇᴅ
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

    // 3. AUTO - Auto-translate incoming messages
    if (subCmd === 'auto') {
      if (!['on', 'off', 'enable', 'disable'].includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}language auto on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(option)

      try {
        await sock.updateProfileSettings({ auto_translate: enabled })
        await db.set('lang_auto_translate', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🔄' : '🚫'}ᴀᴜᴛᴏ-ᴛʀᴀɴsʟᴀᴛᴇ 〙═╗
┃➠ sᴛᴀᴛᴜs: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'Iɴᴄᴏᴍɪɴɢ ᴍsɢs ᴡɪʟ ᴛʀᴀɴsʟᴀᴛᴇ' : 'Mᴇssᴀɢᴇs sᴛᴀʏ ᴏʀɪɢɪɴᴀʟ'}
┃
┃➠ ᴛʀᴀɴsʟᴀᴛᴇs ᴛᴏ ʏᴏᴜʀ ᴀᴘᴘ ʟᴀɴɢ
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

    // 4. KEYBOARD - Keyboard language
    if (subCmd === 'keyboard' || subCmd === 'key') {
      if (!option ||!supportedLangs[option]) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}language keyboard <code>
┃➠ ᴇx: ${prefix}language keyboard ar
┃➠ ʟɪsᴛ: ${prefix}language list
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ keyboard_language: option })
        await db.set('lang_keyboard', option)

        return await sock.sendMessage(from, {
          text: `╔═〘 ⌨️ᴋᴇʏʙᴏᴀʀᴅ 〙═╗
┃➠ ʟᴀɴɢᴜᴀɢᴇ: ${supportedLangs[option]}
┃➠ ᴋᴇʏʙᴏᴀʀᴅ ᴡɪʟ ᴜsᴇ ${supportedLangs[option]}
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

    // 5. LIST - Show all supported languages
    if (subCmd === 'list') {
      const langList = Object.entries(supportedLangs)
       .map(([code, name]) => `┃➠ ${code} - ${name}`)
       .join('\n')

      return await sock.sendMessage(from, {
        text: `╔═〘 🌐sᴜᴘᴏʀᴛᴇᴅ ʟᴀɴɢs 〙═╗
${langList}
┃
┃➠ ᴜsᴇ: ${prefix}language app <code>
┃➠ ᴇx: ${prefix}language app es
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. RESET - Default language settings
    if (subCmd === 'reset') {
      try {
        const defaults = {
          language: 'en',
          auto_translate: false,
          keyboard_language: 'en'
        }

        await sock.updateProfileSettings(defaults)
        await db.set('lang_app', 'en')
        await db.set('lang_auto_translate', false)
        await db.set('lang_keyboard', 'en')

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ʟᴀɴɢᴜᴀɢᴇ: ᴅᴇғᴀᴜʟᴛ
┃
┃➠ ᴀᴘᴘ: Eɴɢʟɪsʜ
┃➠ ᴀᴜᴛᴏ-ᴛʀᴀɴsʟᴀᴛᴇ: OFF
┃➠ ᴋᴇʏʙᴏᴀʀᴅ: Eɴɢʟɪsʜ
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
      text: `╔═〘 🌐ʟᴀɴɢᴜᴀɢᴇ 〙═╗
┃➠ ${prefix}language app <code> - ᴀᴘᴘ ʟᴀɴɢ
┃➠ ${prefix}language auto on/off - ᴀᴜᴛᴏ-ᴛʀᴀɴsʟᴀᴛᴇ
┃➠ ${prefix}language keyboard <code> - ᴋᴇʏʙᴏᴀʀᴅ
┃➠ ${prefix}language list - sᴇ ᴀʟʟ ʟᴀɴɢs
┃➠ ${prefix}language status - ᴠɪᴇᴡ sᴇᴛɪɴɢs
┃➠ ${prefix}language reset - ᴅᴇғᴀᴜʟᴛs
┃
┃➠ ᴇx: ${prefix}language app es
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}