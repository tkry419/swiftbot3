/**
 * SwiftBot - plugins/commands/economy/bank.js
 * Group-Based Economy Balance System
 * Shows cash, bank, level, XP for current group only
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_bank_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const calculateLevel = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

const calculateXpNeeded = (level) => {
  return Math.pow(level, 2) * 100
}

export default {
  name: 'bank',
  alias: ['balance', 'bal', 'money', 'wallet'],
  desc: 'Check your economy balance for this group',
  usage: '[@user]',
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

    // 2. GET TARGET USER - mention or self
    let target = sender
    if (args[0]) {
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      const replied = m.message?.extendedTextMessage?.contextInfo?.participant
      target = mentioned || replied || args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    }

    const targetName = target === sender? 'You' : `@${target.split('@')[0]}`
    
    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${target}`
    const bankKey = `eco_${groupId}_bank_${target}`
    const xpKey = `eco_${groupId}_xp_${target}`
    const levelKey = `eco_${groupId}_level_${target}`
    const jobKey = `eco_${groupId}_job_${target}`
    const streakKey = `eco_${groupId}_streak_${target}`
    const jailKey = `eco_${groupId}_jail_${target}`

    // 4. FETCH ALL DATA FROM DB
    const [
      cash,
      bank,
      xp,
      job,
      streak,
      jailTime,
      currency,
      startBonus
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(bankKey),
      db.get(xpKey),
      db.get(jobKey),
      db.get(streakKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.getGroupKey(groupId, 'eco_startbonus')
    ])

    // 5. INITIALIZE NEW USER WITH START BONUS
    let currentCash = cash
    let currentBank = bank
    
    if (cash === null && bank === null) {
      const bonus = startBonus || 500
      currentCash = bonus
      currentBank = 0
      await Promise.all([
        db.set(balanceKey, bonus),
        db.set(bankKey, 0),
        db.set(xpKey, 0),
        db.set(levelKey, 1)
      ])
    }

    // 6. CALCULATE LEVEL & STATS
    const currentXp = xp || 0
    const level = calculateLevel(currentXp)
    const xpNeeded = calculateXpNeeded(level)
    const xpForNext = calculateXpNeeded(level + 1)
    const xpProgress = currentXp - xpNeeded
    const xpRequired = xpForNext - xpNeeded
    const netWorth = (currentCash || 0) + (currentBank || 0)
    const currencySymbol = currency || '$'
    
    // 7. CHECK JAIL STATUS
    let jailStatus = ''
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      jailStatus = `┃➠ 🚨 ɪɴ ᴊᴀɪʟ: ${remaining}ᴍ ʟᴇғᴛ\n┃\n`
    }

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

    // 9. SEND BALANCE BOX
    await sock.sendMessage(from, {
      text: `╔═〘 💳ᴇᴄᴏɴᴏᴍʏ 〙═╗
┃➠ ᴜsᴇʀ       : ${targetName}
┃➠ ɢʀᴏᴜᴘ      : ${groupName}
${jailStatus}┃
┃➠ 💰 ᴄᴀsʜ     : ${currencySymbol}${formatCash(currentCash)}
┃➠ 🏦 ʙᴀɴᴋ     : ${currencySymbol}${formatCash(currentBank)}
┃➠ 💎 ɴᴇᴛ ᴡᴏʀᴛʜ : ${currencySymbol}${formatCash(netWorth)}
┃
┃➠ 📈 ʟᴇᴠᴇʟ    : ${level}
┃➠ ⭐ xᴘ       : ${formatCash(xpProgress)}/${formatCash(xpRequired)}
┃➠ 🔥 sᴛʀᴇᴀᴋ   : ${streak || 0} ᴅᴀʏs
┃➠ 💼 ᴊᴏʙ      : ${job || 'Unemployed'}
╚═══════════════════╝

╭━━━━❮ ᴄᴏᴍᴍᴀɴᴅs ❯━⊷
┃➠ ${prefix}daily - Claim daily reward
┃➠ ${prefix}work - Earn money
┃➠ ${prefix}deposit <amount> - Bank cash
┃➠ ${prefix}withdraw <amount> - Get cash
┃➠ ${prefix}pay @user <amount> - Send money
╰━━━━━━━━━━━━━━━━━⊷

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ ᴛᴇᴄʜ*`,
      mentions: target!== sender? [target] : []
    }, { quoted: m })
  }
}