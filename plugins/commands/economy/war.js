/**
 * SwiftBot - plugins/commands/economy/war.js
 * Gang War System - Steal from enemy gangs
 * Gang bonuses: +10% per armory level, +5% per turf level
 * Live fight edits + bracket-style messages
 * Uses db keys: eco_${groupJid}_gang_${name}_*, eco_${groupJid}_user_gang_${user}
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_PATH = path.join(__dirname, 'assets.js')

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return hours > 0? `${hours}h ${minutes}m` : minutes > 0? `${minutes}m ${seconds}s` : `${seconds}s`
}

// Load theme glow from assets.js
const loadThemeGlow = async (groupId, db) => {
  try {
    if (fs.existsSync(ASSETS_PATH)) {
      const { default: ASSETS } = await import(`./assets.js?update=${Date.now()}`)
      const activeBg = await db.get(`eco_${groupId}_bg_${groupId}`) || 'default'
      return ASSETS[activeBg]?.glow || '#ff0000'
    }
  } catch {}
  return '#ff0000'
}

export default {
  name: 'war',
  alias: ['gangwar', 'attack', 'raid'],
  desc: 'Declare war on enemy gang - steal 20% if you win',
  usage: '@user',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED
    if (isGroup) {
      const ecoEnabled = await db.getGroupKey(from, 'eco_enabled')
      if (!ecoEnabled) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴅɪsᴀʙʟᴇᴅ
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    const groupId = isGroup? from : 'global'
    const userGangKey = `eco_${groupId}_user_gang_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`
    const now = Date.now()

    // 2. FETCH DATA
    const [userGang, jailTime, currency] = await Promise.all([
      db.get(userGangKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currencySymbol = currency || '$'
    const glow = await loadThemeGlow(groupId, db)

    // 3. CHECK JAIL - No war in jail
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴡᴀʀ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. CHECK GANG
    if (!userGang) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ
┃➠ ᴜsᴇ ${prefix}gang create <name>
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK OWNER
    const owner = await db.get(`eco_${groupId}_gang_${userGang}_owner`)
    if (owner!== sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴏɴʟʏ ᴏᴡɴᴇʀ ᴄᴀɴ ᴅᴇᴄʟᴀʀᴇ ᴡᴀʀ
┃➠ ᴀsᴋ ʏᴏᴜʀ ʟᴇᴀᴅᴇʀ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. GET TARGET
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!mentioned) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴛᴀɢ ᴀ ᴜsᴇʀ ᴛᴏ ᴀᴛᴛᴀᴄᴋ
┃➠ ᴜsᴀɢᴇ: ${prefix}war @user
╚═══════════════════╝`
      }, { quoted: m })
    }

    const targetGangKey = `eco_${groupId}_user_gang_${mentioned}`
    const targetGang = await db.get(targetGangKey)

    if (!targetGang) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (targetGang === userGang) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ᴀᴛᴛᴀᴄᴋ ʏᴏᴜʀ ᴏᴡɴ ɢᴀɴɢ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. WAR COOLDOWN - 1h
    const warCooldownKey = `eco_${groupId}_gang_${userGang}_lastwar`
    const lastWar = await db.get(warCooldownKey)
    const cooldown = 60 * 60 * 1000
    if (lastWar && now - lastWar < cooldown) {
      const timeLeft = cooldown - (now - lastWar)
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ɢᴀɴɢ ʀᴇɢʀᴏᴜᴘɪɴɢ
┃➠ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. FETCH GANG STATS
    const [
      attackerBank, attackerArmory, attackerTurf, attackerMembers,
      defenderBank, defenderArmory, defenderTurf, defenderMembers,
      attackerOwner, defenderOwner
    ] = await Promise.all([
      db.get(`eco_${groupId}_gang_${userGang}_bank`),
      db.get(`eco_${groupId}_gang_${userGang}_armory`),
      db.get(`eco_${groupId}_gang_${userGang}_turf`),
      db.get(`eco_${groupId}_gang_${userGang}_members`),
      db.get(`eco_${groupId}_gang_${targetGang}_bank`),
      db.get(`eco_${groupId}_gang_${targetGang}_armory`),
      db.get(`eco_${groupId}_gang_${targetGang}_turf`),
      db.get(`eco_${groupId}_gang_${targetGang}_members`),
      db.get(`eco_${groupId}_gang_${userGang}_owner`),
      db.get(`eco_${groupId}_gang_${targetGang}_owner`)
    ])

    const attackerMemberCount = JSON.parse(attackerMembers || '[]').length
    const defenderMemberCount = JSON.parse(defenderMembers || '[]').length

    // 9. CALCULATE POWER: members*10 + armory*15 + turf*5 + RNG
    let attackerPower = (attackerMemberCount * 10) + ((attackerArmory || 0) * 15) + ((attackerTurf || 0) * 5) + Math.floor(Math.random() * 50)
    let defenderPower = (defenderMemberCount * 10) + ((defenderArmory || 0) * 15) + ((defenderTurf || 0) * 5) + Math.floor(Math.random() * 50)

    // Send initial war declaration
    const warMsg = await sock.sendMessage(from, {
      text: `╔═〘 ⚔️ᴡᴀʀ ᴅᴇᴄʟᴀʀᴇᴅ 〙═╗
┃➠ ᴀᴛᴀᴄᴋᴇʀ: ${userGang} 🏴
┃➠ ᴅᴇғᴇɴᴅᴇʀ: ${targetGang} 🏴
┃
┃➠ 👥 ᴍᴇᴍʙᴇʀs: ${attackerMemberCount} vs ${defenderMemberCount}
┃➠ 🔫 ᴀʀᴍᴏʀʏ: LV${attackerArmory || 0} vs LV${defenderArmory || 0}
┃➠ 🌆 ᴛᴜʀғ: LV${attackerTurf || 0} vs LV${defenderTurf || 0}
┃
┃➠ 💪 ᴄᴀʟᴄᴜʟᴀᴛɪɴɢ ᴘᴏᴡᴇʀ...
╚═══════════════════╝`,
      mentions: [sender, mentioned]
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 2000))

    // Edit with power reveal
    await sock.sendMessage(from, {
      text: `╔═〘 ⚔️ᴡᴀʀ ᴅᴇᴄʟᴀʀᴇᴅ 〙═╗
┃➠ ᴀᴛᴀᴄᴋᴇʀ: ${userGang} 🏴
┃➠ ᴅᴇғᴇɴᴅᴇʀ: ${targetGang} 🏴
┃
┃➠ 💪 ᴘᴏᴡᴇʀ: ${attackerPower} vs ${defenderPower}
┃➠ ⚡ ғɪɢʜᴛɪɴɢ...
╚═══════════════════╝`,
      edit: { remoteJid: from, id: warMsg.key.id },
      mentions: [sender, mentioned]
    })

    await new Promise(r => setTimeout(r, 3000))

    const win = attackerPower > defenderPower
    const stolenPercent = 0.20
    const stolenAmount = win? Math.floor((defenderBank || 0) * stolenPercent) : Math.floor((attackerBank || 0) * stolenPercent)

    // 10. EXECUTE WAR
    if (win) {
      await Promise.all([
        db.set(`eco_${groupId}_gang_${userGang}_bank`, (attackerBank || 0) + stolenAmount),
        db.set(`eco_${groupId}_gang_${targetGang}_bank`, (defenderBank || 0) - stolenAmount),
        db.set(warCooldownKey, now)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ⚔️ᴡᴀʀ ᴠɪᴄᴛᴏʀʏ 〙═╗
┃➠ ᴀᴛᴛᴀᴄᴋᴇʀ: ${userGang} 🏴
┃➠ ᴅᴇғᴇɴᴅᴇʀ: ${targetGang} 🏴
┃➠ 💪 ᴘᴏᴡᴇʀ: ${attackerPower} vs ${defenderPower}
┃➠ 🏆 ʀᴇsᴜʟᴛ: ʏᴏᴜ ᴡᴏɴ
┃➠ 💰 sᴛᴏʟᴇɴ: ${currencySymbol}${formatCash(stolenAmount)}
┃➠ 🏦 ɢᴀɴɢ ʙᴀɴᴋ: ${currencySymbol}${formatCash((attackerBank || 0) + stolenAmount)}
┃
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 1ʜ
╚═══════════════════╝`,
        edit: { remoteJid: from, id: warMsg.key.id },
        mentions: [sender, mentioned]
      }, { quoted: m })

    } else {
      await Promise.all([
        db.set(`eco_${groupId}_gang_${userGang}_bank`, (attackerBank || 0) - stolenAmount),
        db.set(`eco_${groupId}_gang_${targetGang}_bank`, (defenderBank || 0) + stolenAmount),
        db.set(warCooldownKey, now)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 💀ᴡᴀʀ ᴅᴇғᴇᴀᴛ 〙═╗
┃➠ ᴀᴛᴛᴀᴄᴋᴇʀ: ${userGang} 🏴
┃➠ ᴅᴇғᴇɴᴅᴇʀ: ${targetGang} 🏴
┃
┃➠ 💪 ᴘᴏᴡᴇʀ: ${attackerPower} vs ${defenderPower}
┃➠ 🚨 ʀᴇsᴜʟᴛ: ʏᴏᴜ ʟᴏsᴛ
┃➠ 💸 ʟᴏsᴛ: ${currencySymbol}${formatCash(stolenAmount)}
┃➠ 🏦 ɢᴀɴɢ ʙᴀɴᴋ: ${currencySymbol}${formatCash((attackerBank || 0) - stolenAmount)}
┃
┃➠ ⏰ ᴄᴏʟᴅᴏᴡɴ: 1ʜ
╚═══════════════════╝`,
        edit: { remoteJid: from, id: warMsg.key.id },
        mentions: [sender, mentioned]
      }, { quoted: m })
    }
  }
}