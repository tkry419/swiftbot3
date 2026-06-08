/**
 * SwiftBot - plugins/commands/settings/backup.js
 * Backup Settings - Google Drive/iCloud backup, frequency, include videos, manual backup
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchBackupSettings
 * Works in DM + Groups
 */

export default {
  name: 'backup',
  alias: ['chatbackup', 'gdrive', 'icloud'],
  desc: 'Chat backup settings - frequency, include videos, last backup, manual backup',
  usage: 'freq daily/weekly/monthly/off | videos on/off | network wifi/any | run | status | restore',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const option = args[1]?.toLowerCase()

    const freqOptions = ['daily', 'weekly', 'monthly', 'off']
    const networkOptions = ['wifi', 'any']

    // 1. STATUS - Check current backup settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchBackupSettings()
        const lastBackup = await db.get('backup_last') || 0
        const includeVideos = await db.get('backup_videos') || false
        const backupNetwork = await db.get('backup_network') || 'wifi'

        let lastText = 'Never'
        if (lastBackup > 0) {
          const date = new Date(lastBackup)
          lastText = `<t:${Math.floor(lastBackup/1000)}:R>`
        }

        const nextBackup = settings.frequency === 'daily'? 86400000 :
                           settings.frequency === 'weekly'? 604800000 :
                           settings.frequency === 'monthly'? 2592000000 : 0

        let nextText = 'Disabled'
        if (nextBackup > 0 && lastBackup > 0) {
          nextText = `<t:${Math.floor((lastBackup + nextBackup)/1000)}:R>`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 💾ʙᴀᴄᴋᴜᴘ 〙═╗
┃➠ ᴀᴜᴛᴏ ʙᴀᴄᴋᴜᴘ: ${settings.frequency || 'off'}
┃➠ ʟᴀsᴛ ʙᴀᴄᴋᴜᴘ: ${lastText}
┃➠ ɴᴇxᴛ ʙᴀᴄᴋᴜᴘ: ${nextText}
┃➠ ɪɴᴄʟᴜᴅᴇ ᴠɪᴅᴇᴏs: ${includeVideos? 'ON ✅' : 'OFF ❌'}
┃➠ ɴᴇᴛᴡᴏʀᴋ: ${backupNetwork}
┃➠ sɪᴢᴇ: ${settings.size || '0 MB'}
┃
┃➠ ғʀᴇǫ: ${prefix}backup freq daily
┃➠ ᴠɪᴅᴇᴏs: ${prefix}backup videos on
┃➠ ʀᴜɴ: ${prefix}backup run
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

    // 2. FREQUENCY - Set backup frequency
    if (subCmd === 'freq' || subCmd === 'frequency') {
      if (!freqOptions.includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}backup freq <daily/weekly/monthly/off>
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ backup_frequency: option })
        await db.set('backup_freq', option)

        let descText = option === 'off'? 'Aᴜᴛᴏ ʙᴀᴄᴋᴜᴘ ᴅɪsᴀʙʟᴇᴅ' :
                       `Bᴀᴄᴋᴜᴘ ᴇᴠᴇʀʏ ${option}`

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ғʀᴇǫᴜᴇɴᴄʏ: ${option}
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

    // 3. VIDEOS - Include videos in backup
    if (subCmd === 'videos' || subCmd === 'video') {
      if (!['on', 'off', 'enable', 'disable'].includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}backup videos on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(option)

      try {
        await sock.updateProfileSettings({ backup_include_videos: enabled })
        await db.set('backup_videos', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🎥' : '🚫'}ᴠɪᴅᴇᴏs 〙═╗
┃➠ ɪɴᴄʟᴜᴅᴇ ᴠɪᴅᴇᴏs: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'Vɪᴅᴇᴏs ᴡɪʟ ʙᴇ ʙᴀᴄᴋᴇᴅ ᴜᴘ' : 'Vɪᴅᴇᴏs ᴇxᴄʟᴜᴅᴇᴅ ғʀᴏᴍ ʙᴀᴄᴋᴜᴘ'}
┃
┃➠ ᴡᴀʀɴɪɴɢ: ɪɴᴄʀᴇᴀsᴇs ʙᴀᴄᴋᴜᴘ sɪᴢᴇ
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

    // 4. NETWORK - Backup network preference
    if (subCmd === 'network' || subCmd === 'net') {
      if (!networkOptions.includes(option)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}backup network <wifi/any>
┃➠ ᴀɴʏ = ᴡɪғɪ + ᴍᴏʙɪʟᴇ ᴅᴀᴛᴀ
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateProfileSettings({ backup_network: option })
        await db.set('backup_network', option)

        let descText = option === 'wifi'? 'Oɴʟʏ ᴏɴ ᴡɪ-ғɪ' : 'Wɪ-ғɪ ᴏʀ ᴍᴏʙɪʟᴇ ᴅᴀᴛᴀ'

        return await sock.sendMessage(from, {
          text: `╔═〘 📡ɴᴇᴛᴡᴏʀᴋ 〙═╗
┃➠ ʙᴀᴄᴋᴜᴘ ᴏᴠᴇʀ: ${option}
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

    // 5. RUN - Manual backup now
    if (subCmd === 'run' || subCmd === 'start' || subCmd === 'now') {
      try {
        await sock.sendMessage(from, {
          text: `╔═〘 ⏳ʙᴀᴄᴋᴜᴘ 〙═╗
┃➠ sᴛᴀʀᴛɪɴɢ ᴍᴀɴᴜᴀʟ ʙᴀᴄᴋᴜᴘ...
┃➠ ᴛʜɪs ᴍᴀʏ ᴛᴀᴋᴇ ᴀ ᴡʜɪʟᴇ
╚═══════════════════╝`
        }, { quoted: m })

        await sock.updateProfileSettings({ backup_run: true })
        const timestamp = Date.now()
        await db.set('backup_last', timestamp)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴄᴏᴍᴘʟᴇᴛᴇ 〙═╗
┃➠ ʙᴀᴄᴋᴜᴘ ғɪɴɪsʜᴇᴅ
┃➠ ᴛɪᴍᴇ: <t:${Math.floor(timestamp/1000)}:R>
┃
┃➠ sᴛᴀᴛᴜs: ${prefix}backup status
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ʙᴀᴄᴋᴜᴘ ғᴀɪʟᴇᴅ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 6. RESTORE - Restore from backup
    if (subCmd === 'restore') {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⚠️ʀᴇsᴛᴏʀᴇ 〙═╗
┃➠ ʀᴇsᴛᴏʀᴇ ᴏɴʟʏ ᴡᴏʀᴋs ᴏɴ ɴᴇᴡ ᴅᴇᴠɪᴄᴇ
┃➠ ᴏʀ ᴀғᴛᴇʀ ʀᴇɪɴsᴛᴀʟ
┃
┃➠ ᴜɴɪɴsᴛᴀʟʟ ᴀɴᴅ ʀᴇɪɴsᴛᴀʟ ᴡʜᴀᴛsᴀᴘ
┃➠ ᴠᴇʀɪғʏ ɴᴜᴍʙᴇʀ sᴀᴍᴇ ᴀs ʙᴀᴄᴋᴜᴘ
┃➠ ᴛᴀᴘ 'Rᴇsᴛᴏʀᴇ' ᴡʜᴇɴ ᴘʀᴏᴍᴘᴛᴇᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 💾ʙᴀᴄᴋᴜᴘ 〙═╗
┃➠ ${prefix}backup freq daily/weekly/monthly/off
┃➠ ${prefix}backup videos on/off
┃➠ ${prefix}backup network wifi/any
┃➠ ${prefix}backup run - ᴍᴀɴᴜᴀʟ ʙᴀᴄᴋᴜᴘ ɴᴏᴡ
┃➠ ${prefix}backup restore - ɪɴғᴏ
┃➠ ${prefix}backup status - ᴠɪᴇᴡ sᴇᴛɪɴɢs
┃
┃➠ ʙᴀᴄᴋᴜᴘs ᴛᴏ ɢᴏɢʟᴇ ᴅʀɪᴠᴇ/ɪᴄʟᴏᴜᴅ
╚═══════════════════╝`
    }, { quoted: m })
  }
}