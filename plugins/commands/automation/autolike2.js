/**
 * SwiftBot - plugins/commands/automation/autolike2.js
 * Enable/Disable Auto Like Status per User
 * Uses db keys: autolike_enabled, autolike_${userJid}
 * All users can toggle - Supports enable/disable/status
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  name: 'autolike2',
  alias: ['likeauto', 'autoreact', 'statuslike', 'reactstatus'],
  desc: 'Enable/Disable auto like status feature',
  usage: '[on/off/status] [all/users]',
  category: 'Automation',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup, logger }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    const action = args[0]?.toLowerCase()
    const userJid = sender

    // ─── GLOBAL ENABLE ───
    if (action === 'on' || action === 'enable') {
      const globalEnabled = await db.get('autolike_enabled') || false
      const userEnabled = await db.get(`autolike_${userJid}`) !== null
        ? await db.get(`autolike_${userJid}`)
        : false

      // Enable globally if not already
      if (!globalEnabled) {
        await db.set('autolike_enabled', true)
      }

      // Enable for user
      await db.set(`autolike_${userJid}`, true)

      const userName = sender.split('@')[0]
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅sᴜᴄᴄᴇss 〙═╗
┃➠ ᴀᴜᴛᴏ ʟɪᴋᴇ sᴛᴀᴛᴜs
┃➠ ᴇɴᴀʙʟᴇᴅ
┃
┃➠ 👤 ᴜsᴇʀ: @${userName}
┃➠ 🎯 ᴇᴠᴇʀʏ sᴛᴀᴛᴜs
┃➠ ᴡɪʟʟ ʙᴇ ʟɪᴋᴇᴅ
┃
┃➠ 💰 ᴜsɪɴɢ ʀᴀɴᴅᴏᴍ
┃➠ 50 ᴅɪғғᴇʀᴇɴᴛ ʟɪᴋᴇ ᴇᴍᴏᴊɪs
╚═══════════════════╝`,
        mentions: [userJid]
      }, { quoted: m })
    }

    // ─── GLOBAL DISABLE ───
    if (action === 'off' || action === 'disable') {
      await db.set(`autolike_${userJid}`, false)

      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴅɪsᴀʙʟᴇᴅ 〙═╗
┃➠ ᴀᴜᴛᴏ ʟɪᴋᴇ sᴛᴀᴛᴜs
┃➠ ᴅɪsᴀʙʟᴇᴅ
┃
┃➠ 👤 ᴜsᴇʀ: @${sender.split('@')[0]}
┃➠ ʏᴏᴜʀ sᴛᴀᴛᴜs ᴡɪʟʟ
┃➠ ɴᴏ ʟᴏɴɢᴇʀ ʙᴇ ᴀᴜᴛᴏ ʟɪᴋᴇᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // ─── STATUS CHECK ───
    if (!action || action === 'status' || action === 'info' || action === 'check') {
      const globalEnabled = await db.get('autolike_enabled') || false
      const userEnabled = await db.get(`autolike_${userJid}`) || false

      const userName = sender.split('@')[0]
      return await sock.sendMessage(from, {
        text: `╔═〘 ⚙️ᴀᴜᴛᴏʟɪᴋᴇ sᴇᴛɪɴɢs 〙═╗
┃➠ 👤 ᴜsᴇʀ: @${userName}
┃
┃➠ ɢʟᴏʙᴀʟ: ${globalEnabled ? '🟢 ᴀᴄᴛɪᴠᴇ' : '🔴 ɪɴᴀᴄᴛɪᴠᴇ'}
┃➠ ᴘᴇʀsᴏɴᴀʟ: ${userEnabled ? '🟢 ᴇɴᴀʙʟᴇᴅ' : '🔴 ᴅɪsᴀʙʟᴇᴅ'}
┃
┃➠ 🎯 ᴀɪᴍ: ᴛᴀʀɢᴇᴛ ᴅɪғғᴇʀᴇɴᴛ
┃➠ sᴇɴᴅᴇʀs ᴀɴᴅ ɢʀᴏᴜᴘs
┃
┃➠ 📊 sᴛᴀᴛᴜs ᴛᴀʀɢᴇᴛs:
┃➠ • ᴄᴏɴᴛᴀᴄᴛ sᴛᴀᴛᴜs
┃➠ • ɢʀᴏᴜᴘ sᴛᴀᴛᴜs
┃➠ • ᴀʟʟ ᴛᴀɢs ᴡᴏʀᴋ
┃
┃➠ 🎨 ʟɪᴋᴇ ᴇᴍᴏᴊɪs: 50 ᴠᴀʀɪᴇᴛɪᴇs
╚═══════════════════╝

╭━━━━❮ ᴜsᴀɢᴇ ❯━⊷
┃➠ ${prefix}autolike2 on - Enable auto like
┃➠ ${prefix}autolike2 off - Disable auto like
┃➠ ${prefix}autolike2 status - Check settings
╰━━━━━━━━━━━━━━━━━⊷`,
        mentions: [userJid]
      }, { quoted: m })
    }

    // ─── INVALID COMMAND ───
    await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴄᴛɪᴏɴ
┃
┃➠ ᴜsᴇ: ${prefix}autolike2 on/off/status
╚═══════════════════╝`
    }, { quoted: m })
  }
}
