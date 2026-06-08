/**
 * SwiftBot - plugins/commands/settings/theme.js
 * Theme Settings - Dark mode, chat wallpaper, app theme, bubble style
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings
 * Works in DM + Groups
 */

export default {
  name: 'theme',
  alias: ['appearance', 'darkmode', 'wallpaper'],
  desc: 'Theme settings - dark mode, chat wallpaper, bubble style, font size',
  usage: 'dark on/off/auto | wallpaper <url/default> | bubbles classic/modern | font small/normal/large | status | reset',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const option = args[1]?.toLowerCase()

    const validOptions = ['dark', 'wallpaper', 'bubbles', 'font', 'status', 'reset']
    const bubbleStyles = ['classic', 'modern']
    const fontSizes = ['small', 'normal', 'large']
    const darkModes = ['on', 'off', 'auto']

    // 1. STATUS - Check current settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const darkMode = await db.get('theme_dark') || 'auto'
        const wallpaper = await db.get('theme_wallpaper') || 'default'
        const bubbleStyle = await db.get('theme_bubbles') || 'classic'
        const fontSize = await db.get('theme_font') || 'normal'

        return await sock.sendMessage(from, {
          text: `╔═〘 🎨ᴛʜᴇᴍᴇ 〙═╗
┃➠ ᴅᴀʀᴋ ᴍᴏᴅᴇ: ${darkMode}
┃➠ ᴡᴀʟʟᴘᴀᴘᴇʀ: ${wallpaper === 'default'? 'Dᴇғᴀᴜʟᴛ' : 'Cᴜsᴛᴏᴍ'}
┃➠ ʙᴜʙʟᴇ sᴛʏʟᴇ: ${bubbleStyle}
┃➠ ғᴏɴᴛ sɪᴢᴇ: ${fontSize}
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}theme dark on
┃➠ ᴡᴀʟʟ: ${prefix}theme wallpaper <url>
┃➠ sᴛʏʟᴇ: ${prefix}theme bubbles modern
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

    // 2. DARK MODE - on/off/auto
    if (subCmd === 'dark') {
      if (!darkModes.includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}theme dark <on/off/auto>
┃➠ ᴀᴜᴛᴏ = ғᴏʟᴏᴡs sʏsᴛᴇᴍ
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ theme_dark: option })
        await db.set('theme_dark', option)

        let descText = option === 'on'? 'Dᴀʀᴋ ᴍᴏᴅᴇ ᴀʟᴡᴀʏs' :
                       option === 'off'? 'Lɪɢʜᴛ ᴍᴏᴅᴇ ᴀʟᴡᴀʏs' :
                       'Fᴏʟᴏᴡs sʏsᴛᴇᴍ sᴇᴛᴛɪɴɢ'

        return await sock.sendMessage(from, {
          text: `╔═〘 ${option === 'on'? '🌙' : option === 'off'? '☀️' : '🔄'}ᴅᴀʀᴋ ᴍᴏᴅᴇ 〙═╗
┃➠ sᴛᴀᴛᴜs: ${option.toUpperCase()}
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

    // 3. WALLPAPER - Set custom or default
    if (subCmd === 'wallpaper' || subCmd === 'wall') {
      const url = args[1]

      if (!url) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}theme wallpaper <url>
┃➠ ᴜsᴀɢᴇ: ${prefix}theme wallpaper default
┃➠ ᴇx: ${prefix}theme wallpaper https://imgur.com/xyz.jpg
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        if (url === 'default') {
          await sock.updateProfileSettings({ theme_wallpaper: null })
          await db.set('theme_wallpaper', 'default')

          return await sock.sendMessage(from, {
            text: `╔═〘 🖼️ᴡᴀʟʟᴘᴀᴘᴇʀ 〙═╗
┃➠ ʀᴇsᴇᴛ ᴛᴏ ᴅᴇғᴀᴜʟᴛ
╚═══════════════════╝`
          }, { quoted: m })
        }

        // Basic URL validation
        if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp)$/i)) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ɪᴍᴀɢᴇ ᴜʀʟ
┃➠ ᴜsᴇ:.jpg,.png,.webp
╚═══════════════════╝`
          }, { quoted: m })
        }

        await sock.updateProfileSettings({ theme_wallpaper: url })
        await db.set('theme_wallpaper', url)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴡᴀʟʟᴘᴀᴘᴇʀ 〙═╗
┃➠ ᴄᴜsᴛᴏᴍ ᴡᴀʟʟᴘᴀᴘᴇʀ sᴇᴛ
┃➠ ᴄʜᴀᴛs ᴡɪʟ ᴜsᴇ ɴᴇᴡ ʙɢ
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ sᴇᴛ ᴡᴀʟʟᴘᴀᴘᴇʀ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 4. BUBBLES - Chat bubble style
    if (subCmd === 'bubbles' || subCmd === 'bubble') {
      if (!bubbleStyles.includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}theme bubbles <classic/modern>
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ theme_bubbles: option })
        await db.set('theme_bubbles', option)

        let descText = option === 'classic'? 'Oʟᴅ sᴄʜᴏᴏʟ ʀᴏᴜɴᴅᴇᴅ' : 'Nᴇᴡ ғʟᴀᴛ ᴅᴇsɪɢɴ'

        return await sock.sendMessage(from, {
          text: `╔═〘 💬ʙᴜʙʙʟᴇs 〙═╗
┃➠ sᴛʏʟᴇ: ${option}
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

    // 5. FONT - Font size
    if (subCmd === 'font' || subCmd === 'fontsize') {
      if (!fontSizes.includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}theme font <small/normal/large>
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ theme_font: option })
        await db.set('theme_font', option)

        return await sock.sendMessage(from, {
          text: `╔═〘 🔤ғᴏɴᴛ 〙═╗
┃➠ sɪᴢᴇ: ${option}
┃➠ ᴄʜᴀᴛ ᴛᴇxᴛ ᴡɪʟ ᴜsᴇ ${option}
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

    // 6. RESET - Default theme
    if (subCmd === 'reset') {
      try {
        const defaults = {
          theme_dark: 'auto',
          theme_wallpaper: 'default',
          theme_bubbles: 'classic',
          theme_font: 'normal'
        }

        await sock.updateProfileSettings(defaults)
        await db.set('theme_dark', 'auto')
        await db.set('theme_wallpaper', 'default')
        await db.set('theme_bubbles', 'classic')
        await db.set('theme_font', 'normal')

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ᴛʜᴇᴍᴇ: ᴅᴇғᴀᴜʟᴛ
┃
┃➠ ᴅᴀʀᴋ: ᴀᴜᴛᴏ
┃➠ ᴡᴀʟᴘᴀᴘᴇʀ: ᴅᴇғᴀᴜʟᴛ
┃➠ ʙᴜʙʙʟᴇs: ᴄʟᴀssɪᴄ
┃➠ ғᴏɴᴛ: ɴᴏʀᴍᴀʟ
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
      text: `╔═〘 🎨ᴛʜᴇᴍᴇ 〙═╗
┃➠ ${prefix}theme dark on/off/auto
┃➠ ${prefix}theme wallpaper <url/default>
┃➠ ${prefix}theme bubbles classic/modern
┃➠ ${prefix}theme font small/normal/large
┃➠ ${prefix}theme status - ᴠɪᴇᴡ sᴇᴛɪɴɢs
┃➠ ${prefix}theme reset - ᴅᴇғᴀᴜʟᴛs
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}