/**
 * SwiftBot - plugins/commands/economy/crime.js
 * Group-Based Crime System - High Risk High Reward
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_jail_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// CRIME SCENARIOS - 40% success rate
const CRIMES = [
  {
    name: 'Bank Heist',
    emoji: '🏦',
    min: 5000,
    max: 25000,
    fine: 0.15, // 15% fine if caught
    jail: { min: 3, max: 8 }, // hours
    success: ['You hacked the bank vault', 'Guard was sleeping on duty', 'Inside job went perfect'],
    fail: ['Alarm triggered by accident', 'Cops surrounded the bank', 'Got caught on camera']
  },
  {
    name: 'Museum Theft',
    emoji: '🖼️',
    min: 3000,
    max: 18000,
    fine: 0.12,
    jail: { min: 2, max: 6 },
    success: ['Stole the diamond necklace', 'Swapped painting with fake', 'Security system disabled'],
    fail: ['Laser alarms went off', 'Night guard caught you', 'Dropped artifact while running']
  },
  {
    name: 'Drug Deal',
    emoji: '💊',
    min: 2000,
    max: 12000,
    fine: 0.20,
    jail: { min: 4, max: 10 },
    success: ['Deal went smooth in alley', 'Client paid double', 'Police were busy elsewhere'],
    fail: ['Undercover cop busted you', 'Deal was a setup', 'Rival gang attacked']
  },
  {
    name: 'Car Jacking',
    emoji: '🚗',
    min: 4000,
    max: 20000,
    fine: 0.18,
    jail: { min: 3, max: 7 },
    success: ['Hotwired Ferrari successfully', 'Owner left keys inside', 'Chop shop paid premium'],
    fail: ['Car had GPS tracker', 'Owner fought back', 'Crashed during escape']
  },
  {
    name: 'Casino Robbery',
    emoji: '🎰',
    min: 6000,
    max: 30000,
    fine: 0.25,
    jail: { min: 5, max: 12 },
    success: ['Cracked the safe combination', 'Security was distracted', 'Inside man helped you'],
    fail: ['Casino guards had guns', 'Silent alarm called SWAT', 'Vault was time-locked']
  }
]

export default {
  name: 'crime',
  alias: ['heist', 'illegal'],
  desc: 'Commit a crime - 40% success, big rewards or jail',
  usage: '',
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
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴅɪsᴀʙʟᴇᴅ
┃
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 2. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`
    const lastCrimeKey = `eco_${groupId}_lastcrime_${sender}`
    const crimeCountKey = `eco_${groupId}_crimecount_${sender}`

    // 3. FETCH DATA
    const [
      balance,
      jailTime,
      lastCrime,
      crimeCount,
      currency
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(jailKey),
      db.get(lastCrimeKey),
      db.get(crimeCountKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currentBalance = balance || 0
    const currencySymbol = currency || '$'

    // 4. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ᴀʟʀᴇᴀᴅʏ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ᴄᴀɴ'ᴛ ᴅᴏ ᴄʀɪᴍᴇ ғʀᴏᴍ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK COOLDOWN - 2 HOURS
    const now = Date.now()
    const cooldown = 2 * 60 * 60 * 1000 // 2hr
    const timeLeft = lastCrime? (lastCrime + cooldown) - now : 0

    if (lastCrime && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ᴄᴏᴘs sᴛɪʟ ɪɴᴠᴇsᴛɪɢᴀᴛɪɴɢ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ 🦹 ᴄʀɪᴍᴇs ᴅᴏɴᴇ: ${crimeCount || 0}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. PICK RANDOM CRIME
    const crime = CRIMES[Math.floor(Math.random() * CRIMES.length)]
    const success = Math.random() < 0.4 // 40% success
    const newCrimeCount = (crimeCount || 0) + 1

    // 7. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    if (success) {
      // SUCCESS - BIG MONEY
      const earned = Math.floor(Math.random() * (crime.max - crime.min + 1)) + crime.min
      const newBalance = currentBalance + earned
      const successMsg = crime.success[Math.floor(Math.random() * crime.success.length)]

      await Promise.all([
        db.set(balanceKey, newBalance),
        db.set(lastCrimeKey, now),
        db.set(crimeCountKey, newCrimeCount)
      ])

      await sock.sendMessage(from, {
        text: `╔═〘 ${crime.emoji}ᴄʀɪᴍᴇ sᴜᴄᴄᴇss 〙═╗
┃➠ ᴄʀɪᴍᴇ: ${crime.name}
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 📝 ${successMsg}
┃➠ 💰 sᴛᴏʟᴇɴ: ${currencySymbol}${formatCash(earned)}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ 🦹 ᴛᴏᴛᴀʟ ᴄʀɪᴍᴇs: ${newCrimeCount}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 2ʜ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ 40% sᴜᴄᴇss ʀᴀᴛᴇ
┃➠ ʜɪɢʜ ʀɪsᴋ ʜɪɢʜ ʀᴇᴡᴀʀᴅ
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })

    } else {
      // FAIL - JAIL + FINE
      const jailHours = Math.floor(Math.random() * (crime.jail.max - crime.jail.min + 1)) + crime.jail.min
      const jailTime = now + (jailHours * 60 * 60 * 1000)
      const fine = Math.floor(currentBalance * crime.fine)
      const newBalance = Math.max(0, currentBalance - fine)
      const failMsg = crime.fail[Math.floor(Math.random() * crime.fail.length)]

      await Promise.all([
        db.set(jailKey, jailTime),
        db.set(balanceKey, newBalance),
        db.set(lastCrimeKey, now),
        db.set(crimeCountKey, newCrimeCount)
      ])

      await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴄᴀᴜɢʜᴛ 〙═╗
┃➠ ᴄʀɪᴍᴇ: ${crime.name}
┃➠ sᴛᴀᴛᴜs: ғᴀɪʟᴇᴅ
┃
┃➠ 📝 ${failMsg}
┃➠ 👮 ᴄᴏᴘs ᴄᴀᴜɢʜᴛ ʏᴏᴜ
┃➠ 🚨 ᴊᴀɪʟ ᴛɪᴍᴇ: ${jailHours}ʜ
┃➠ 💸 ғɪɴᴇ: ${currencySymbol}${formatCash(fine)}
┃
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
╚═══════════════════╝

╭━━━━❮ ᴡᴀʀɴɪɴɢ ❯━⊷
┃➠ ᴄʀɪᴍᴇ ᴅᴏᴇsɴ'ᴛ ᴘᴀʏ
┃➠ 40% sᴜᴄᴄᴇss ᴏɴʟʏ
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }
  }
}