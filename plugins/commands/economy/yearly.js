/**
 * SwiftBot - plugins/commands/economy/yearly.js
 * Group-Based Yearly Reward System with Ultimate Bonus
 * Uses db keys: eco_${groupJid}_lastyearly_${user}
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
  name: 'yearly',
  alias: ['year', 'yearlyclaim'],
  desc: 'Claim your yearly reward for this group - ultimate bonus',
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
    const lastYearlyKey = `eco_${groupId}_lastyearly_${sender}`
    const xpKey = `eco_${groupId}_xp_${sender}`
    const streakKey = `eco_${groupId}_streak_${sender}`

    // 3. FETCH DATA FROM DB
    const [
      balance,
      lastYearly,
      streak,
      currency,
      dailyAmount,
      jailTime
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(lastYearlyKey),
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
┃➠ ɴᴏ ʏᴇᴀʀʟʏ ᴄʟᴀɪᴍ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK COOLDOWN - 365 DAYS
    const now = Date.now()
    const cooldown = 365 * 24 * 60 * 60 * 1000 // 365 days
    const timeLeft = lastYearly? (lastYearly + cooldown) - now : 0

    if (lastYearly && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ʏᴏᴜ ᴀʟʀᴇᴀᴅʏ ᴄʟᴀɪᴍᴇᴅ
┃
┃➠ ⏳ ᴄᴏᴍᴇ ʙᴀᴄᴋ ɪɴ: ${formatDays(timeLeft)}
┃➠ 🔥 sᴛʀᴇᴀᴋ: ${streak || 0} ᴅᴀʏs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CALCULATE REWARD - 365X DAILY + 200% BONUS
    const baseDaily = dailyAmount || 1000
    const baseAmount = baseDaily * 365 // 365x daily
    const yearlyBonus = Math.floor(baseAmount * 2.0) // 200% bonus
    const totalReward = baseAmount + yearlyBonus
    const xpReward = 10000 + ((streak || 0) * 100) // Ultimate XP for yearly
    const currencySymbol = currency || '$'

    // 7. UPDATE DB
    const newBalance = (balance || 0) + totalReward
    const newXp = (await db.get(xpKey) || 0) + xpReward

    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(lastYearlyKey, now),
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
      text: `╔═〘 🎆ʏᴇᴀʀʟʏ 〙═╗
┃➠ ᴄʟᴀɪᴍᴇᴅ sᴜᴄᴇssғᴜʟʏ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💰 ʙᴀsᴇ ʀᴇᴡᴀʀᴅ: ${currencySymbol}${formatCash(baseAmount)}
┃➠ 🎉 ʏᴇᴀʀʟʏ ʙᴏɴᴜs: +${currencySymbol}${formatCash(yearlyBonus)}
┃➠ 💎 ᴛᴏᴛᴀʟ ᴡᴏɴ : ${currencySymbol}${formatCash(totalReward)}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ : +${xpReward}
┃
┃➠ 🔥 sᴛʀᴇᴀᴋ : ${streak || 0} ᴅᴀʏs
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ ⏰ ɴᴇxᴛ ᴄʟᴀɪᴍ : 365ᴅ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ᴄʟᴀɪᴍ ᴇᴠᴇʀʏ ʏᴇᴀʀ ғᴏʀ ᴜʟᴛɪᴍᴀᴛᴇ ʙᴏɴᴜs
┃➠ ʏᴇᴀʀʟʏ ɢɪᴠᴇs 200% ʙᴏɴᴜs
┃➠ ${prefix}bank - Check balance
┃➠ ${prefix}daily - Daily reward
┃➠ ${prefix}weekly - Weekly reward
┃➠ ${prefix}monthly - Monthly reward
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}