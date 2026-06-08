/**
 * SwiftBot - plugins/commands/economy/bank.js
 * Group-Based Economy Balance System + Bank Upgrades
 * Shows cash, bank, level, XP + upgrades bank limit
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_bank_${user}
 */

import sharp from 'sharp'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = path.join(__dirname, 'assets')

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

const escapeXml = (str) => {
  return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&apos;')
}

const getUserPfp = async (sock, jid) => {
  try {
    const pfpUrl = await sock.profilePictureUrl(jid, 'image')
    const res = await axios.get(pfpUrl, { responseType: 'arraybuffer', timeout: 5000 })
    return Buffer.from(res.data)
  } catch {
    return await sharp({
      create: { width: 120, height: 120, channels: 4, background: { r: 50, g: 100, b: 200, alpha: 1 } }
    }).png().toBuffer()
  }
}

const generateBankCard = async (sock, userJid, data, bgKey = 'default') => {
  const pfpBuffer = await getUserPfp(sock, userJid)
  const pfpCircle = await sharp(pfpBuffer)
 .resize(120, 120)
 .composite([{ input: Buffer.from(`<svg><circle cx="60" cy="60" r="60"/></svg>`), blend: 'dest-in' }])
 .png().toBuffer()

  // Load background
  let bgBuffer = null
  const bgPath = path.join(ASSETS_DIR, `${bgKey}.png`)
  const bgFramePath = path.join(ASSETS_DIR, `${bgKey}_frame.png`)

  if (fs.existsSync(bgFramePath)) {
    bgBuffer = await sharp(bgFramePath).resize(800, 500, { fit: 'cover' }).png().toBuffer()
  } else if (fs.existsSync(bgPath)) {
    bgBuffer = await sharp(bgPath).resize(800, 500, { fit: 'cover' }).png().toBuffer()
  }

  const glow = data.tierColor || '#00E676'
  const svg = `
<svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.8" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="800" height="500" fill="url(#overlay)"/>

  <!-- Title -->
  <text x="400" y="60" font-family="Arial Black" font-size="42" fill="#fff" text-anchor="middle" filter="url(#glow)">💳 BANK CARD</text>

  <!-- Name -->
  <text x="280" y="180" font-family="Arial Black" font-size="28" fill="#fff">${escapeXml(data.name)}</text>
  <text x="280" y="210" font-family="Arial" font-size="18" fill="${glow}">LV ${data.level} • ${data.job}</text>

  <!-- Cash -->
  <rect x="50" y="250" width="330" height="90" rx="15" fill="#1e1e2e" stroke="${glow}" stroke-width="2" opacity="0.9"/>
  <text x="70" y="280" font-family="Arial" font-size="16" fill="#888">CASH</text>
  <text x="70" y="315" font-family="Arial Black" font-size="28" fill="#fff">💰 ${data.currency}${formatCash(data.cash)}</text>

  <!-- Bank -->
  <rect x="420" y="250" width="330" height="90" rx="15" fill="#1e1e2e" stroke="${glow}" stroke-width="2" opacity="0.9"/>
  <text x="440" y="280" font-family="Arial" font-size="16" fill="#888">BANK • ${data.tierName}</text>
  <text x="440" y="315" font-family="Arial Black" font-size="24" fill="#fff">🏦 ${data.currency}${formatCash(data.bank)}</text>
  <text x="720" y="315" font-family="Arial" font-size="14" fill="#666" text-anchor="end">/${formatCash(data.bankLimit)}</text>

  <!-- Net Worth -->
  <rect x="50" y="360" width="700" height="60" rx="15" fill="${glow}" opacity="0.2"/>
  <text x="400" y="395" font-family="Arial Black" font-size="24" fill="${glow}" text-anchor="middle">💎 NET WORTH: ${data.currency}${formatCash(data.netWorth)}</text>

  <!-- XP Bar -->
  <rect x="50" y="440" width="700" height="30" rx="15" fill="#1e1e2e"/>
  <rect x="50" y="440" width="${(data.xpProgress / data.xpRequired) * 700}" height="30" rx="15" fill="${glow}" opacity="0.8"/>
  <text x="400" y="460" font-family="Arial" font-size="14" fill="#fff" text-anchor="middle">XP: ${formatCash(data.xpProgress)}/${formatCash(data.xpRequired)}</text>
</svg>`

  let composite = [
    { input: Buffer.from(svg), top: 0, left: 0 },
    { input: pfpCircle, top: 130, left: 130 }
  ]

  if (bgBuffer) {
    composite.unshift({ input: bgBuffer, top: 0, left: 0 })
  }

  return await sharp({
    create: { width: 800, height: 500, channels: 4, background: '#0f0f1e' }
  })
.composite(composite)
.png()
.toBuffer()
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
    const bgKey = `eco_${groupId}_bg_${target}`

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
      startBonus,
      bgTheme
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(bankKey),
      db.get(xpKey),
      db.get(jobKey),
      db.get(streakKey),
      db.get(jailKey),
      db.get(bankUpgradeKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.getGroupKey(groupId, 'eco_startbonus'),
      db.get(bgKey)
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

    // 10. GENERATE BANK CARD IMAGE WITH BACKGROUND
    try {
      const cardData = {
        name: targetName === 'You'? 'You' : targetName.replace('@', ''),
        level: level,
        job: job || 'Unemployed',
        currency: currencySymbol,
        cash: currentCash || 0,
        bank: currentBank || 0,
        bankLimit: bankLimit,
        tierName: BANK_UPGRADES[currentBankLevel].name,
        tierColor: '#00E676',
        netWorth: netWorth,
        xpProgress: xpProgress,
        xpRequired: xpRequired
      }

      const cardImage = await generateBankCard(sock, target, cardData, bgTheme || 'default')

      const textMsg = `╔═〘 💳ᴇᴄᴏɴᴏᴍʏ 〙═╗
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
╰━━━━━━━━━━━━━━━━━⊷`

      await sock.sendMessage(from, {
        image: cardImage,
        caption: textMsg,
        mentions: target!== sender? [target] : []
      }, { quoted: m })

    } catch (e) {
      // Fallback to text if image fails - YOUR ORIGINAL TEXT
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
}