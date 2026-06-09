/**
 * SwiftBot - plugins/commands/nsfw/nsfw.js
 * NSFW Control - Master toggle for 18+ commands per Group
 * Uses db keys: nsfw_enabled_${groupJid}, nsfw_banned_${groupJid}_${user}, nsfw_agegate_${groupJid}
 * Admin/Owner only - Supports tag + reply - No imports needed
 */

export default {
  name: 'nsfw',
  alias: ['18+', 'adult', 'hentai-on'],
  desc: 'Enable/Disable NSFW system for this group',
  usage: '[on/off/status/ban/unban/agegate/list] [@user]',
  category: 'NSFW',
  permission: 'admin',

  execute: async (sock, m, args, { db, prefix, isGroup, isAdmin, isOwner }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK IF GROUP
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛʜɪs ᴄᴏᴍᴀɴᴅ ᴡᴏʀᴋs
┃➠ ɪɴ ɢʀᴏᴜᴘs ᴏɴʟʏ
┃
┃➠ ʀᴇᴀsᴏɴ: sᴀғᴇᴛʏ + ᴘʀɪᴠᴀᴄʏ
╚═══════════════════╝`
      }, { quoted: m })
    }

    const action = args[0]?.toLowerCase()
    const groupId = from

    // 2. CHECK PERMISSION - ADMIN OR OWNER FOR on/off/ban/unban/agegate
    if (['on', 'off', 'enable', 'disable', 'ban', 'unban', 'agegate'].includes(action) &&!isAdmin &&!isOwner) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴀᴅᴍɪɴ ᴏɴʟʏ 〙═╗
┃➠ ᴏɴʟʏ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴs ᴄᴀɴ ᴜsᴇ
┃
┃➠ ᴜsᴇ: ${prefix}nsfw status
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, { text: `⏳` }, { quoted: m })

    // 3. BAN USER - SUPPORT TAG + REPLY
    if (action === 'ban') {
      const target = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.participant || args[1]

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ɴᴏ ᴛᴀʀɢᴇᴛ 〙═╗
┃➠ ᴛᴀɢ sᴏᴍᴇᴏɴᴇ ᴏʀ ʀᴇᴘʟʏ
┃➠ ᴜsᴀɢᴇ: ${prefix}nsfw ban @user
┃➠ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴍᴇssᴀɢᴇ
╚═══════════════════╝`,
          edit: sentMsg.key
        })
      }

      await db.set(`nsfw_banned_${groupId}_${target}`, true)
      const targetName = target.split('@')[0]

      return await sock.sendMessage(from, {
        text: `╔═〘 🚫ʙᴀɴɴᴇᴅ 〙═╗
┃➠ ᴜsᴇʀ ʙʟᴏᴄᴋᴇᴅ ғʀᴏᴍ ɴsғᴡ
┃
┃➠ @${targetName} ᴄᴀɴ'ᴛ ᴜsᴇ
┃➠ ɴsғᴡ ᴄᴏᴍᴍᴀɴᴅs ᴀɴʏᴍᴏʀᴇ
╚═══════════════════╝`,
        mentions: [target],
        edit: sentMsg.key
      })
    }

    // 4. UNBAN USER - SUPPORT TAG + REPLY
    if (action === 'unban') {
      const target = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.participant || args[1]

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ɴᴏ ᴛᴀʀɢᴇᴛ 〙═╗
┃➠ ᴛᴀɢ sᴏᴍᴇᴏɴᴇ ᴏʀ ʀᴇᴘʟʏ
┃➠ ᴜsᴀɢᴇ: ${prefix}nsfw unban @user
╚═══════════════════╝`,
          edit: sentMsg.key
        })
      }

      const isBanned = await db.get(`nsfw_banned_${groupId}_${target}`)
      if (!isBanned) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ℹ️ɪɴғᴏ 〙═╗
┃➠ ᴛʜɪs ᴜsᴇʀ ɪs ɴᴏᴛ ʙᴀɴɴᴇᴅ
╚═══════════════════╝`,
          edit: sentMsg.key
        })
      }

      await db.set(`nsfw_banned_${groupId}_${target}`, null)
      const targetName = target.split('@')[0]

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴜɴʙᴀɴɴᴇᴅ 〙═╗
┃➠ ᴜsᴇʀ ᴜɴʙʟᴏᴄᴋᴇᴅ
┃
┃➠ @${targetName} ᴄᴀɴ ᴜsᴇ
┃➠ ɴsғᴡ ᴄᴏᴍᴍᴀɴᴅs ᴀɢᴀɪɴ
┃➠ ᴀɢᴇ ᴠᴇʀɪғʏ sᴛɪʟ ʀᴇǫᴜɪʀᴇᴅ
╚═══════════════════╝`,
        mentions: [target],
        edit: sentMsg.key
      })
    }

    // 5. AGEGATE TOGGLE
    if (action === 'agegate') {
      const subAction = args[1]?.toLowerCase()
      if (!['on', 'off'].includes(subAction)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}nsfw agegate on/off
┃
┃➠ ᴏɴ = ᴀsᴋs 18+ ᴠᴇʀɪғʏ
┃➠ ᴏғ = ɴᴏ ᴀɢᴇ ᴄʜᴇᴄᴋ
╚═══════════════════╝`,
          edit: sentMsg.key
        })
      }

      await db.set(`nsfw_agegate_${groupId}`, subAction === 'on')
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ᴀɢᴇ ɢᴀᴛᴇ: ${subAction === 'on'? 'ᴇɴᴀʙʟᴇᴅ ✅' : 'ᴅɪsᴀʙʟᴇᴅ ❌'}
┃
┃➠ ${subAction === 'on'? 'ᴜsᴇʀs ᴍᴜsᴛ ᴠᴇʀɪғʏ 18+' : 'ɴᴏ ᴀɢᴇ ᴄʜᴇᴄᴋ ɴᴏᴡ'}
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    // 6. LIST BANNED USERS
    if (action === 'list' || action === 'banned') {
      const groupMetadata = await sock.groupMetadata(from)
      const participants = groupMetadata.participants.map(p => p.id)
      const bannedUsers = []

      await Promise.all(participants.map(async (user) => {
        const banned = await db.get(`nsfw_banned_${groupId}_${user}`)
        if (banned) bannedUsers.push(user)
      }))

      const bannedList = bannedUsers.length > 0
     ? bannedUsers.map(u => `┃➠ @${u.split('@')[0]}`).join('\n')
        : '┃➠ Nᴏɴᴇ'

      return await sock.sendMessage(from, {
        text: `╔═〘 🚫ʙᴀɴɴᴇᴅ ʟɪsᴛ 〙═╗
┃➠ ᴛᴏᴛᴀʟ: ${bannedUsers.length}
┃
${bannedList}
┃
╚═══════════════════╝`,
        mentions: bannedUsers,
        edit: sentMsg.key
      })
    }

    // 7. STATUS CHECK - DEFAULT
    if (!action || action === 'status' || action === 'info') {
      const [enabled, ageGate] = await Promise.all([
        db.get(`nsfw_enabled_${groupId}`),
        db.get(`nsfw_agegate_${groupId}`)
      ])

      // Count banned users
      const groupMetadata = await sock.groupMetadata(from)
      const participants = groupMetadata.participants.map(p => p.id)
      const bannedUsers = []

      await Promise.all(participants.map(async (user) => {
        const banned = await db.get(`nsfw_banned_${groupId}_${user}`)
        if (banned) bannedUsers.push(user)
      }))

      const bannedList = bannedUsers.length > 0
     ? bannedUsers.map(u => `@${u.split('@')[0]}`).join(', ')
        : 'Nᴏɴᴇ'

      return await sock.sendMessage(from, {
        text: `╔═〘 🔞ɴsғᴡ sᴇᴛɪɴɢs 〙═╗
┃➠ ɢʀᴏᴜᴘ: ${groupMetadata.subject}
┃
┃➠ sᴛᴀᴛᴜs: ${enabled? '🟢 ᴇɴᴀʙʟᴇᴅ' : '🔴 ᴅɪsᴀʙʟᴇᴅ'}
┃➠ ᴀɢᴇ ɢᴀᴛᴇ: ${ageGate!== false? '🟢 ᴏɴ' : '🔴 ᴏғ'}
┃➠ ʙᴀɴᴇᴅ ᴜsᴇʀs: ${bannedUsers.length}
┃
┃➠ ʙᴀɴᴇᴅ: ${bannedList}
╚═══════════════════╝

╭━━━━❮ ᴜsᴀɢᴇ ❯━⊷
┃➠ ${prefix}nsfw on - Enable NSFW
┃➠ ${prefix}nsfw off - Disable NSFW
┃➠ ${prefix}nsfw ban @user - Ban user
┃➠ ${prefix}nsfw unban @user - Unban user
┃➠ ${prefix}nsfw agegate on/off - Age verify
┃➠ ${prefix}nsfw list - Show banned
┃➠ ${prefix}nsfw status - Check settings
╰━━━━━━━━━━━━━━━━━⊷`,
        mentions: bannedUsers,
        edit: sentMsg.key
      })
    }

    // 8. ENABLE NSFW
    if (action === 'on' || action === 'enable') {
      await Promise.all([
        db.set(`nsfw_enabled_${groupId}`, true),
        db.set(`nsfw_agegate_${groupId}`, true)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅sᴜᴄᴄᴇss 〙═╗
┃➠ ɴsғᴡ ᴇɴᴀʙʟᴇᴅ
┃
┃➠ ⚠️ ᴜsᴇʀs ᴍᴜsᴛ ʙᴇ 18+
┃➠ 🔞 ᴀɢᴇ ᴠᴇʀɪғɪᴄᴀᴛɪᴏɴ ᴏɴ
┃
┃➠ ᴍᴇᴍʙᴇʀs ᴄᴀɴ ɴᴏᴡ ᴜsᴇ:
┃➠ ${prefix}hentai, ${prefix}porn, etc
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 9. DISABLE NSFW
    if (action === 'off' || action === 'disable') {
      await db.set(`nsfw_enabled_${groupId}`, false)
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴅɪsᴀʙʟᴇᴅ 〙═╗
┃➠ ɴsғᴡ ᴅɪsᴀʙʟᴇᴅ
┃
┃➠ ᴀʟ ɴsғᴡ ᴄᴏᴍᴍᴀɴᴅs ᴀʀᴇ
┃➠ ɴᴏᴡ ᴏғ ғᴏʀ ᴛʜɪs ɢʀᴏᴜᴘ
┃
┃➠ sᴇᴛᴛɪɴɢs sᴛɪʟ sᴀᴠᴇᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 10. INVALID COMMAND
    await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴄᴏᴍᴍᴀɴᴅ
┃
┃➠ ᴜsᴇ: ${prefix}nsfw on/off/status/ban/unban/agegate/list
╚═══════════════════╝`
    }, { quoted: m })
  }
}