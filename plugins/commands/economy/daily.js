/**
 * SwiftBot - plugins/commands/economy/daily.js
 * Group-Based Daily Reward System with Streak Bonus
 * Uses db keys: eco_${groupJid}_lastdaily_${user}, eco_${groupJid}_streak_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

export default {
  name: 'daily',
  alias: ['claim', 'dailyclaim', 'reward'],
  desc: 'Claim your daily reward for this group - streak bonus included',
  usage: '',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED FOR THIS GROUP
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
    const lastDailyKey = `eco_${groupId}_lastdaily_${sender}`
    const streakKey = `eco_${groupId}_streak_${sender}`
    const xpKey = `eco_${groupId}_xp_${sender}`

    // 3. FETCH DATA FROM DB
    const [
      balance,
      lastDaily,
      streak,
      currency,
      dailyAmount,
      jailTime
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(lastDailyKey),
      db.get(streakKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.getGroupKey(groupId, 'eco_daily_amount'),
      db.get(`eco_${groupId}_jail_${sender}`)
    ])

    // 4. CHECK JAIL STATUS
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴅᴀɪʟʏ ᴄʟᴀɪᴍ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK COOLDOWN - 24 HOURS
    const now = Date.now()
    const cooldown = 24 * 60 * 60 * 1000 // 24hr
    const timeLeft = lastDaily? (lastDaily + cooldown) - now : 0

    if (lastDaily && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ᴄʟᴀɪᴍᴇᴅ
┃
┃➠ ⏳ ᴄᴏᴍᴇ ʙᴀᴄᴋ ɪɴ: ${formatTime(timeLeft)}
┃➠ 🔥 sᴛʀᴇᴀᴋ: ${streak || 0} ᴅᴀʏs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CALCULATE STREAK
    const oneDayMs = 24 * 60 * 60 * 1000
    const twoDaysMs = 48 * 60 * 60 * 1000
    let currentStreak = streak || 0

    if (lastDaily) {
      const timeSinceLastClaim = now - lastDaily
      if (timeSinceLastClaim <= twoDaysMs) {
        // Within 48hrs - continue streak
        currentStreak += 1
      } else {
        // Missed a day - reset streak
        currentStreak = 1
      }
    } else {
      // First time claiming
      currentStreak = 1
    }

    // 7. CALCULATE REWARD - BASE + STREAK BONUS
    const baseAmount = dailyAmount || 1000
    const streakBonus = Math.min(currentStreak * 100, 5000) // Max 5k bonus
    const totalReward = baseAmount + streakBonus
    const xpReward = 50 + (currentStreak * 5) // XP bonus for streak
    const currencySymbol = currency || '$'

    // 8. UPDATE DB
    const newBalance = (balance || 0) + totalReward
    const newXp = (await db.get(xpKey) || 0) + xpReward

    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(lastDailyKey, now),
      db.set(streakKey, currentStreak),
      db.set(xpKey, newXp)
    ])

    // 9. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 10. SEND REWARD BOX - CLEAN
    await sock.sendMessage(from, {
      text: `╔═〘 🎁ᴅᴀɪʟʏ 〙═╗
┃➠ ᴄʟᴀɪᴍᴇᴅ sᴜᴄᴄᴇssғᴜʟʟʏ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💰 ʙᴀsᴇ ʀᴇᴡᴀʀᴅ: ${currencySymbol}${formatCash(baseAmount)}
┃➠ 🔥 sᴛʀᴇᴀᴋ ʙᴏɴᴜs: +${currencySymbol}${formatCash(streakBonus)}
┃➠ 💎 ᴛᴏᴛᴀʟ ᴡᴏɴ : ${currencySymbol}${formatCash(totalReward)}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ : +${xpReward}
┃
┃➠ 🔥 sᴛʀᴇᴀᴋ : ${currentStreak} ᴅᴀʏs
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ ⏰ ɴᴇxᴛ ᴄʟᴀɪᴍ : 24ʜ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ᴍᴀɪɴᴛᴀɪɴ sᴛʀᴇᴀᴋ ғᴏʀ ʙɪɢɢᴇʀ ʙᴏɴᴜs
┃➠ ᴍᴀx sᴛʀᴇᴀᴋ ʙᴏɴᴜs: ${currencySymbol}5,000
┃➠ ${prefix}bank - Check balance
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}