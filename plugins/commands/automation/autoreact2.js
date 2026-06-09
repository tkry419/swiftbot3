/**
 * SwiftBot - plugins/commands/automation/autoreact2.js
 * Enable/Disable Auto React Messages per User
 * Uses db keys: autoreact_enabled, autoreact_${userJid}
 * All users can toggle - Supports enable/disable/status
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default {
  name: 'autoreact2',
  alias: ['reactauto', 'autoresponse', 'messagereact', 'reactmessage'],
  desc: 'Enable/Disable auto react messages feature',
  usage: '[on/off/status]',
  category: 'Automation',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup, logger }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    const action = args[0]?.toLowerCase()
    const userJid = sender

    // ─── GLOBAL ENABLE ───
    if (action === 'on' || action === 'enable') {
      const globalEnabled = await db.get('autoreact_enabled') || false
      const userEnabled = await db.get(`autoreact_${userJid}`) !== null
        ? await db.get(`autoreact_${userJid}`)
        : false

      // Enable globally if not already
      if (!globalEnabled) {
        await db.set('autoreact_enabled', true)
      }

      // Enable for user
      await db.set(`autoreact_${userJid}`, true)

      const userName = sender.split('@')[0]
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅sᴜᴄᴄᴇss 〙═╗
┃➠ ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ ᴍᴇssᴀɢᴇs
┃➠ ᴇɴᴀʙʟᴇᴅ
┃
┃➠ 👤 ᴜsᴇʀ: @${userName}
┃➠ 💬 ᴇᴠᴇʀʏ ᴍᴇssᴀɢᴇ
┃➠ ᴡɪʟʟ ʙᴇ ʀᴇᴀᴄᴛᴇᴅ
┃
┃➠ 😊 ᴜsɪɴɢ ʀᴀɴᴅᴏᴍ
┃➠ 50 ᴅɪғғᴇʀᴇɴᴛ ʀᴇᴀᴄᴛ ᴇᴍᴏᴊɪs
╚═══════════════════╝`,
        mentions: [userJid]
      }, { quoted: m })
    }

    // ─── GLOBAL DISABLE ───
    if (action === 'off' || action === 'disable') {
      await db.set(`autoreact_${userJid}`, false)

      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴅɪsᴀʙʟᴇᴅ 〙═╗
┃➠ ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ ᴍᴇssᴀɢᴇs
┃➠ ᴅɪsᴀʙʟᴇᴅ
┃
┃➠ 👤 ᴜsᴇʀ: @${sender.split('@')[0]}
┃➠ ᴍᴇssᴀɢᴇs ᴡɪʟʟ ɴᴏ
┃➠ ʟᴏɴɢᴇʀ ʙᴇ ᴀᴜᴛᴏ ʀᴇᴀᴄᴛᴇᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // ─── STATUS CHECK ───
    if (!action || action === 'status' || action === 'info' || action === 'check') {
      const globalEnabled = await db.get('autoreact_enabled') || false
      const userEnabled = await db.get(`autoreact_${userJid}`) || false

      const userName = sender.split('@')[0]
      return await sock.sendMessage(from, {
        text: `╔═〘 ⚙️ᴀᴜᴛᴏʀᴇᴀᴄᴛ sᴇᴛɪɴɢs 〙═╗
┃➠ 👤 ᴜsᴇʀ: @${userName}
┃
┃➠ ɢʟᴏʙᴀʟ: ${globalEnabled ? '🟢 ᴀᴄᴛɪᴠᴇ' : '🔴 ɪɴᴀᴄᴛɪᴠᴇ'}
┃➠ ᴘᴇʀsᴏɴᴀʟ: ${userEnabled ? '🟢 ᴇɴᴀʙʟᴇᴅ' : '🔴 ᴅɪsᴀʙʟᴇᴅ'}
┃
┃➠ 💬 ᴀɪᴍ: ʀᴇᴀᴄᴛ ᴛᴏ ᴀʟʟ
┃➠ ɪɴᴄᴏᴍɪɴɢ ᴍᴇssᴀɢᴇs
┃
┃➠ 📊 ᴍᴇssᴀɢᴇ ᴛᴀʀɢᴇᴛs:
┃➠ • ᴛᴇxᴛ ᴍᴇssᴀɢᴇs
┃➠ • ɪᴍᴀɢᴇ ᴄᴀᴘᴛɪᴏɴs
┃➠ • ᴠɪᴅᴇᴏ ᴄᴀᴘᴛɪᴏɴs
┃
┃➠ 😊 ʀᴇᴀᴄᴛ ᴇᴍᴏᴊɪs: 50 ᴠᴀʀɪᴇᴛɪᴇs
╚═══════════════════╝

╭━━━━❮ ᴜsᴀɢᴇ ❯━⊷
┃➠ ${prefix}autoreact2 on - Enable auto react
┃➠ ${prefix}autoreact2 off - Disable auto react
┃➠ ${prefix}autoreact2 status - Check settings
╰━━━━━━━━━━━━━━━━━⊷`,
        mentions: [userJid]
      }, { quoted: m })
    }

    // ─── INVALID COMMAND ───
    await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴄᴛɪᴏɴ
┃
┃➠ ᴜsᴇ: ${prefix}autoreact2 on/off/status
╚═══════════════════╝`
    }, { quoted: m })
  }
}
