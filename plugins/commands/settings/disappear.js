/**
 * SwiftBot - plugins/commands/settings/disappear.js
 * Personal Disappearing Messages Settings - For user's own chats
 * Category: settings
 * Uses Baileys: sock.sendMessage with ephemeral expiration
 */

export default {
  name: 'disappear',
  alias: ['ephemeral', 'dmsg', 'vanish'],
  desc: 'Set disappearing messages for your personal chats',
  usage: 'on/off | 24h | 7d | 90d | status',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()

    const durations = {
      'off': 0,
      '24h': 86400,
      '7d': 604800,
      '90d': 7776000,
      'on': 604800 // default 7 days
    }

    // 1. STATUS - Check current setting for this chat
    if (subCmd === 'status') {
      const current = await db.get(`disappear_${from}`) || 0
      const statusText = current === 0? 'OFF ❌' : `ON ✅`
      const durationText = current === 86400? '24 Hours' : current === 604800? '7 Days' : current === 7776000? '90 Days' : 'OFF'

      return await sock.sendMessage(from, {
        text: `╔═〘 👻ᴅɪsᴀᴘᴇᴀʀ 〙═╗
┃➠ sᴛᴀᴛᴜs: ${statusText}
┃➠ ᴅᴜʀᴀᴛɪᴏɴ: ${durationText}
┃➠ ᴄʜᴀᴛ: Personal
┃
┃➠ ${prefix}disappear on - 7 days
┃➠ ${prefix}disappear 24h/7d/90d
┃➠ ${prefix}disappear off
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 2. SET DURATION FOR THIS CHAT
    if (subCmd in durations) {
      const duration = durations[subCmd]

      // Set ephemeral setting for this chat
      await sock.sendMessage(from, {
        disappearingMessagesInChat: duration
      })

      // Save to DB
      await db.set(`disappear_${from}`, duration)

      const durationText = duration === 0? 'OFF' : duration === 86400? '24 Hours' : duration === 604800? '7 Days' : '90 Days'
      const statusIcon = duration === 0? '❌' : '✅'

      return await sock.sendMessage(from, {
        text: `╔═〘 ${statusIcon}ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ ᴅɪsᴀᴘᴇᴀʀ: ${durationText}
┃➠ ᴄʜᴀᴛ: This chat
┃➠ ᴍsɢs ᴡɪʟ ᴅᴇʟᴇᴛᴇ ᴀғᴛᴇʀ: ${durationText}
┃
┃➠ ᴄʜᴀɴɢᴇ: ${prefix}disappear 24h/7d/90d/off
╚═══════════════════╝`
      }, { quoted: m })
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 👻ᴅɪsᴀᴘᴇᴀʀ 〙═╗
┃➠ sᴇᴛ ᴅɪsᴀᴘᴇᴀʀɪɴɢ ᴍsɢs ғᴏʀ ᴛʜɪs ᴄʜᴀᴛ
┃
┃➠ ${prefix}disappear on - ᴇɴᴀʙʟᴇ 7ᴅ
┃➠ ${prefix}disappear 24h - 24 ʜᴏᴜʀs
┃➠ ${prefix}disappear 7d - 7 ᴅᴀʏs
┃➠ ${prefix}disappear 90d - 90 ᴅᴀʏs
┃➠ ${prefix}disappear off - ᴅɪsᴀʙʟᴇ
┃➠ ${prefix}disappear status - ᴄʜᴇᴄᴋ
╚═══════════════════╝`
    }, { quoted: m })
  }
}