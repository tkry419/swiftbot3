/**
 * SwiftBot - plugins/commands/economy/weekly.js
 * Group-Based Weekly Reward System with Bonus
 * Uses db keys: eco_${groupJid}_lastweekly_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatDays = (ms) => {
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  return `${days}d ${hours}h`
}

export default {
  name: 'weekly',
  alias: ['week', 'weeklyclaim'],
  desc: 'Claim your weekly reward for this group - bigger bonus',
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
    const lastWeeklyKey = `eco_${groupId}_lastweekly_${sender}`
    const xpKey = `eco_${groupId}_xp_${sender}`
    const streakKey = `eco_${groupId}_streak_${sender}`

    // 3. FETCH DATA FROM DB
    const [
      balance,
      lastWeekly,
      streak,
      currency,
      dailyAmount,
      jailTime
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(lastWeeklyKey),
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
┃➠ ɴᴏ ᴡᴇᴇᴋʟʏ ᴄʟᴀɪᴍ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK COOLDOWN - 7 DAYS
    const now = Date.now()
    const cooldown = 7 * 24 * 60 * 60 * 1000 // 7 days
    const timeLeft = lastWeekly? (lastWeekly + cooldown) - now : 0

    if (lastWeekly && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ᴄʟᴀɪᴍᴇᴅ
┃
┃➠ ⏳ ᴄᴏᴍᴇ ʙᴀᴄᴋ ɪɴ: ${formatDays(timeLeft)}
┃➠ 🔥 sᴛʀᴇᴀᴋ: ${streak || 0} ᴅᴀʏs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CALCULATE REWARD - 8X DAILY + 50% BONUS
    const baseDaily = dailyAmount || 1000
    const baseAmount = baseDaily * 8 // 8x daily
    const weeklyBonus = Math.floor(baseAmount * 0.5) // 50% bonus
    const totalReward = baseAmount + weeklyBonus
    const xpReward = 400 + ((streak || 0) * 10) // Bigger XP for weekly
    const currencySymbol = currency || '$'

    // 7. UPDATE DB
    const newBalance = (balance || 0) + totalReward
    const newXp = (await db.get(xpKey) || 0) + xpReward

    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(lastWeeklyKey, now),
      db.set(xpKey, newXp)
    ])

    // 8. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 9. SEND REWARD BOX - CLEAN
    await sock.sendMessage(from, {
      text: `╔═〘 📅ᴡᴇᴇᴋʟʏ 〙═╗
┃➠ ᴄʟᴀɪᴍᴇᴅ sᴜᴄᴄᴇssғᴜʟʏ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💰 ʙᴀsᴇ ʀᴇᴡᴀʀᴅ: ${currencySymbol}${formatCash(baseAmount)}
┃➠ 🎉 ᴡᴇᴇᴋʟʏ ʙᴏɴᴜs: +${currencySymbol}${formatCash(weeklyBonus)}
┃➠ 💎 ᴛᴏᴛᴀʟ ᴡᴏɴ : ${currencySymbol}${formatCash(totalReward)}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ : +${xpReward}
┃
┃➠ 🔥 sᴛʀᴇᴀᴋ : ${streak || 0} ᴅᴀʏs
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ ⏰ ɴᴇxᴛ ᴄʟᴀɪᴍ : 7ᴅ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ᴄʟᴀɪᴍ ᴇᴠᴇʀʏ ᴡᴇᴋ ғᴏʀ ʙɪɢ ʙᴏɴᴜs
┃➠ ᴡᴇᴇᴋʟʏ ɢɪᴠᴇs 50% ʙᴏɴᴜs
┃➠ ${prefix}bank - Check balance
┃➠ ${prefix}daily - Daily reward
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}