/**
 * SwiftBot - plugins/commands/economy/bank.js
 * Group-Based Economy Balance System + Bank Upgrades
 * Shows cash, bank, level, XP + upgrades bank limit
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

// BANK UPGRADE TIERS - exponential cost
const BANK_UPGRADES = [
  { level: 0, limit: 50000, cost: 0, name: 'Basic Wallet' },
  { level: 1, limit: 250000, cost: 10000, name: 'Savings Account' },
  { level: 2, limit: 1000000, cost: 50000, name: 'Gold Vault' },
  { level: 3, limit: 5000000, cost: 200000, name: 'Diamond Safe' },
  { level: 4, limit: 25000000, cost: 1000000, name: 'Offshore Account' },
  { level: 5, limit: 100000000, cost: 5000000, name: 'Swiss Bank' },
  { level: 6, limit: 500000000, cost: 25000000, name: 'Central Reserve' }
]

const getBankLimit = (upgradeLevel) => {
  const upgrade = BANK_UPGRADES[upgradeLevel] || BANK_UPGRADES[0]
  return upgrade.limit
}

export default {
  name: 'bank',
  alias: ['balance', 'bal', 'money', 'wallet'],
  desc: 'Check balance or upgrade bank limit',
  usage: '[@user] | upgrade',
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

    const groupId = isGroup? from : 'global'
    const subCmd = args[0]?.toLowerCase()

    // 2. HANDLE UPGRADE SUBCOMMAND
    if (subCmd === 'upgrade') {
      const balanceKey = `eco_${groupId}_balance_${sender}`
      const bankUpgradeKey = `eco_${groupId}_bank_level_${sender}`
      const jailKey = `eco_${groupId}_jail_${sender}`

      const [balance, bankLevel, jailTime, currency] = await Promise.all([
        db.get(balanceKey),
        db.get(bankUpgradeKey),
        db.get(jailKey),
        db.getGroupKey(groupId, 'eco_currency')
      ])

      const currencySymbol = currency || '$'
      const currentLevel = bankLevel || 0

      // Check jail
      if (jailTime && Date.now() < jailTime) {
        const remaining = Math.ceil((jailTime - Date.now()) / 60000)
        return await sock.sendMessage(from, {
          text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴜᴘɢʀᴀᴅᴇs ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Check max level
      if (currentLevel >= BANK_UPGRADES.length - 1) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴍᴀx ʟᴇᴠᴇʟ 〙═╗
┃➠ ʙᴀɴᴋ ᴀʟʀᴇᴀᴅʏ ᴍᴀx
┃➠ ᴛɪᴇʀ: ${BANK_UPGRADES[currentLevel].name}
┃➠ ʟɪᴍɪᴛ: ${currencySymbol}${formatCash(BANK_UPGRADES[currentLevel].limit)}
╚═══════════════════╝`
        }, { quoted: m })
      }

      const nextUpgrade = BANK_UPGRADES[currentLevel + 1]

      // Check cash
      if (!balance || balance < nextUpgrade.cost) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴄᴀsʜ
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(nextUpgrade.cost)}
┃➠ ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance || 0)}
┃
┃➠ ɴᴇxᴛ ᴛɪᴇʀ: ${nextUpgrade.name}
┃➠ ɴᴇᴡ ʟɪᴍɪᴛ: ${currencySymbol}${formatCash(nextUpgrade.limit)}
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Upgrade bank
      await Promise.all([
        db.set(balanceKey, balance - nextUpgrade.cost),
        db.set(bankUpgradeKey, currentLevel + 1)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ⬆️ᴜᴘɢʀᴀᴅᴇᴅ 〙═╗
┃➠ ᴛɪᴇʀ: ${BANK_UPGRADES[currentLevel].name} → ${nextUpgrade.name}
┃➠ ʟᴇᴠᴇʟ: ${currentLevel} → ${currentLevel + 1}
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(nextUpgrade.cost)}
┃
┃➠ 🔒 ᴏʟᴅ ʟɪᴍɪᴛ: ${currencySymbol}${formatCash(BANK_UPGRADES[currentLevel].limit)}
┃➠ 🔓 ɴᴇᴡ ʟɪᴍɪᴛ: ${currencySymbol}${formatCash(nextUpgrade.limit)}
┃➠ 💰 ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance - nextUpgrade.cost)}
┃
┃➠ ʀᴏʙᴇʀs ᴄᴀɴ'ᴛ sᴛᴇᴀʟ ғʀᴏᴍ ʙᴀɴᴋ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. GET TARGET USER - mention or self
    let target = sender
    if (args[0] && args[0]!== 'upgrade') {
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      const replied = m.message?.extendedTextMessage?.contextInfo?.participant
      target = mentioned || replied || args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    }

    const targetName = target === sender? 'You' : `@${target.split('@')[0]}`

    // 4. DB KEYS - GROUP ISOLATED
    const balanceKey = `eco_${groupId}_balance_${target}`
    const bankKey = `eco_${groupId}_bank_${target}`
    const xpKey = `eco_${groupId}_xp_${target}`
    const levelKey = `eco_${groupId}_level_${target}`
    const jobKey = `eco_${groupId}_job_${target}`
    const streakKey = `eco_${groupId}_streak_${target}`
    const jailKey = `eco_${groupId}_jail_${target}`
    const bankUpgradeKey = `eco_${groupId}_bank_level_${target}`

    // 5. FETCH ALL DATA FROM DB
    const [
      cash,
      bank,
      xp,
      job,
      streak,
      jailTime,
      bankLevel,
      currency,
      startBonus
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(bankKey),
      db.get(xpKey),
      db.get(jobKey),
      db.get(streakKey),
      db.get(jailKey),
      db.get(bankUpgradeKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.getGroupKey(groupId, 'eco_startbonus')
    ])

    // 6. INITIALIZE NEW USER WITH START BONUS
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
        db.set(levelKey, 1),
        db.set(bankUpgradeKey, 0)
      ])
    }

    // 7. CALCULATE LEVEL & STATS
    const currentXp = xp || 0
    const level = calculateLevel(currentXp)
    const xpNeeded = calculateXpNeeded(level)
    const xpForNext = calculateXpNeeded(level + 1)
    const xpProgress = currentXp - xpNeeded
    const xpRequired = xpForNext - xpNeeded
    const netWorth = (currentCash || 0) + (currentBank || 0)
    const currencySymbol = currency || '$'
    const currentBankLevel = bankLevel || 0
    const bankLimit = getBankLimit(currentBankLevel)

    // 8. CHECK JAIL STATUS
    let jailStatus = ''
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      jailStatus = `┃➠ 🚨 ɪɴ ᴊᴀɪʟ: ${remaining}ᴍ ʟᴇғᴛ\n┃\n`
    }

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

    // 10. SEND BALANCE BOX - WITH BANK TIER
    await sock.sendMessage(from, {
      text: `╔═〘 💳ᴇᴄᴏɴᴏᴍʏ 〙═╗
┃➠ ᴜsᴇʀ : ${targetName}
┃➠ ɢʀᴏᴜᴘ : ${groupName}
${jailStatus}┃
┃➠ 💰 ᴄᴀsʜ : ${currencySymbol}${formatCash(currentCash)}
┃➠ 🏦 ʙᴀɴᴋ : ${currencySymbol}${formatCash(currentBank)} / ${currencySymbol}${formatCash(bankLimit)}
┃➠ 🔒 ᴛɪᴇʀ : ${BANK_UPGRADES[currentBankLevel].name} LV${currentBankLevel}
┃➠ 💎 ɴᴇᴛ ᴡᴏʀᴛʜ : ${currencySymbol}${formatCash(netWorth)}
┃
┃➠ 📈 ʟᴇᴠᴇʟ : ${level}
┃➠ ⭐ xᴘ : ${formatCash(xpProgress)}/${formatCash(xpRequired)}
┃➠ 🔥 sᴛʀᴇᴀᴋ : ${streak || 0} ᴅᴀʏs
┃➠ 💼 ᴊᴏʙ : ${job || 'Unemployed'}
╚═══════════════════╝

╭━━━━❮ ᴄᴏᴍᴍᴀɴᴅs ❯━⊷
┃➠ ${prefix}daily - Claim daily reward
┃➠ ${prefix}work - Earn money
┃➠ ${prefix}deposit <amount> - Bank cash
┃➠ ${prefix}withdraw <amount> - Get cash
┃➠ ${prefix}bank upgrade - Increase limit
┃➠ ${prefix}pay @user <amount> - Send money
╰━━━━━━━━━━━━━━━━━⊷`,
      mentions: target!== sender? [target] : []
    }, { quoted: m })
  }
}