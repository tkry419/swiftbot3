/**
 * SwiftBot - plugins/commands/settings/archive.js
 * Archive Settings - Auto-archive, keep chats archived, bulk archive/unarchive
 * Category: settings
 * Uses Baileys: sock.chatModify, sock.updateProfileSettings
 * Works in DM + Groups
 */

export default {
  name: 'archive',
  alias: ['keepchats', 'autoarchive', 'unarchive'],
  desc: 'Archive settings - keep chats archived, auto-archive, bulk archive chats',
  usage: 'keep on/off | auto on/off | all | unread | groups | chat @user | unarchive all | status',
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

    // 1. STATUS - Check current settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const keepArchived = await db.get('archive_keep') || false
        const autoArchive = await db.get('archive_auto') || false

        return await sock.sendMessage(from, {
          text: `╔═〘 📦ᴀʀᴄʜɪᴠᴇ 〙═╗
┃➠ ᴋᴇᴇᴘ ᴀʀᴄʜɪᴠᴇᴅ: ${keepArchived? 'ON ✅' : 'OFF ❌'}
┃➠ ᴀᴜᴛᴏ-ᴀʀᴄʜɪᴠᴇ: ${autoArchive? 'ON ✅' : 'OFF ❌'}
┃
┃➠ ᴋᴇᴇᴘ: ${prefix}archive keep on
┃➠ ᴀᴜᴛᴏ: ${prefix}archive auto on
┃➠ ᴀʀᴄʜɪᴠᴇ: ${prefix}archive all
┃➠ ᴄʜᴀᴛ: ${prefix}archive chat @user
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

    // 2. KEEP - Keep chats archived when new message arrives
    if (subCmd === 'keep') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}archive keep on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ keep_archived: enabled })
        await db.set('archive_keep', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '📌' : '📭'}ᴋᴇᴇᴘ ᴀʀᴄʜɪᴠᴇᴅ 〙═╗
┃➠ sᴛᴀᴛᴜs: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'Aʀᴄʜɪᴠᴇᴅ ᴄʜᴀᴛs sᴛᴀʏ ᴀʀᴄʜɪᴠᴇᴅ' : 'Nᴇᴡ ᴍsɢs ᴜɴᴀʀᴄʜɪᴠᴇ ᴄʜᴀᴛs'}
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

    // 3. AUTO - Auto-archive new chats from unknown numbers
    if (subCmd === 'auto') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}archive auto on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ auto_archive: enabled })
        await db.set('archive_auto', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🤖' : '🚫'}ᴀᴜᴛᴏ-ᴀʀᴄʜɪᴠᴇ 〙═╗
┃➠ sᴛᴀᴛᴜs: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'Nᴇᴡ ᴄʜᴀᴛs ғʀᴏᴍ ᴜɴᴋɴᴏᴡɴ ᴀᴜᴛᴏ-ᴀʀᴄʜɪᴠᴇᴅ' : 'Nᴇᴡ ᴄʜᴀᴛs sᴛᴀʏ ɪɴ ɪɴʙᴏx'}
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

    // 4. ALL - Archive all chats
    if (subCmd === 'all') {
      try {
        const chats = await sock.groupFetchAllParticipating()
        const chatIds = Object.keys(chats)

        if (chatIds.length === 0) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ℹ️ɪɴғᴏ 〙═╗
┃➠ ɴᴏ ᴄʜᴀᴛs ᴛᴏ ᴀʀᴄʜɪᴠᴇ
╚═══════════════════╝`
          }, { quoted: m })
        }

        for (const id of chatIds) {
          await sock.chatModify({ archive: true }, id)
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴀʀᴄʜɪᴠᴇᴅ 〙═╗
┃➠ ᴀʀᴄʜɪᴠᴇᴅ: ${chatIds.length} ᴄʜᴀᴛs
┃➠ ᴀʟʟ ᴄʜᴀᴛs ᴍᴏᴠᴇᴅ ᴛᴏ ᴀʀᴄʜɪᴠᴇ
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴀʀᴄʜɪᴠᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 5. UNREAD - Archive all unread chats
    if (subCmd === 'unread') {
      try {
        const chats = await sock.groupFetchAllParticipating()
        const unreadChats = Object.keys(chats).filter(id => chats[id].unreadCount > 0)

        if (unreadChats.length === 0) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ℹ️ɪɴғᴏ 〙═╗
┃➠ ɴᴏ ᴜɴʀᴇᴀᴅ ᴄʜᴀᴛs ᴛᴏ ᴀʀᴄʜɪᴠᴇ
╚═══════════════════╝`
          }, { quoted: m })
        }

        for (const id of unreadChats) {
          await sock.chatModify({ archive: true }, id)
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴀʀᴄʜɪᴠᴇᴅ 〙═╗
┃➠ ᴀʀᴄʜɪᴠᴇᴅ: ${unreadChats.length} ᴜɴʀᴇᴀᴅ ᴄʜᴀᴛs
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴀʀᴄʜɪᴠᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 6. GROUPS - Archive all groups
    if (subCmd === 'groups' || subCmd === 'group') {
      try {
        const groups = await sock.groupFetchAllParticipating()
        const groupIds = Object.keys(groups)

        if (groupIds.length === 0) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ℹ️ɪɴғᴏ 〙═╗
┃➠ ɴᴏ ɢʀᴏᴜᴘs ᴛᴏ ᴀʀᴄʜɪᴠᴇ
╚═══════════════════╝`
          }, { quoted: m })
        }

        for (const id of groupIds) {
          await sock.chatModify({ archive: true }, id)
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴀʀᴄʜɪᴠᴇᴅ 〙═╗
┃➠ ᴀʀᴄʜɪᴠᴇᴅ: ${groupIds.length} ɢʀᴏᴜᴘs
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴀʀᴄʜɪᴠᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 7. CHAT - Archive specific chat
    if (subCmd === 'chat') {
      let targets = mentioned.length > 0? mentioned : parseNumbers(1)

      if (targets.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴏʀ ᴘᴀss ɴᴜᴍʙᴇʀs
┃➠ ᴇx: ${prefix}archive chat @user
┃➠ ᴇx: ${prefix}archive chat 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        for (const id of targets) {
          await sock.chatModify({ archive: true }, id)
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴀʀᴄʜɪᴠᴇᴅ 〙═╗
┃➠ ᴀʀᴄʜɪᴠᴇᴅ: ${targets.length} ᴄʜᴀᴛs
╚═══════════════════╝`,
          mentions: targets
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴀʀᴄʜɪᴠᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 8. UNARCHIVE - Unarchive all chats
    if (subCmd === 'unarchive') {
      try {
        const chats = await sock.groupFetchAllParticipating()
        const chatIds = Object.keys(chats)

        for (const id of chatIds) {
          await sock.chatModify({ archive: false }, id)
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜɴᴀʀᴄʜɪᴠᴇᴅ 〙═╗
┃➠ ᴜɴᴀʀᴄʜɪᴠᴇᴅ: ${chatIds.length} ᴄʜᴀᴛs
┃➠ ᴀʟʟ ᴄʜᴀᴛs ʙᴀᴄᴋ ᴛᴏ ɪɴʙᴏx
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴜɴᴀʀᴄʜɪᴠᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 📦ᴀʀᴄʜɪᴠᴇ 〙═╗
┃➠ ${prefix}archive keep on/off - ᴋᴇᴇᴘ ᴀʀᴄʜɪᴠᴇᴅ
┃➠ ${prefix}archive auto on/off - ᴀᴜᴛᴏ-ᴀʀᴄʜɪᴠᴇ
┃➠ ${prefix}archive all - ᴀʀᴄʜɪᴠᴇ ᴀʟʟ ᴄʜᴀᴛs
┃➠ ${prefix}archive unread - ᴀʀᴄʜɪᴠᴇ ᴜɴʀᴇᴀᴅ
┃➠ ${prefix}archive groups - ᴀʀᴄʜɪᴠᴇ ᴀʟ ɢʀᴏᴜᴘs
┃➠ ${prefix}archive chat @user - ᴀʀᴄʜɪᴠᴇ sᴘᴇᴄɪғɪᴄ
┃➠ ${prefix}archive unarchive - ᴜɴᴀʀᴄʜɪᴠᴇ ᴀʟ
┃➠ ${prefix}archive status - ᴠɪᴇᴡ sᴇᴛɪɴɢs
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}