/**
 * SwiftBot - plugins/commands/economy/profile.js
 * Dynamic Profile Card - 30 Backgrounds with GLOW SVG + Full Stats
 * Uses Sharp + Jimp - Shows PFP, Name, Balance, Level, Marriage, Gang, Bank Tier
 */

import sharp from 'sharp'
import Jimp from 'jimp'
import fetch from 'node-fetch'

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const calculateLevel = (xp) => {
  return Math.floor(Math.sqrt(xp / 100))
}

const calculateXpToNext = (xp) => {
  const level = calculateLevel(xp)
  const nextLevelXp = Math.pow(level + 1, 2) * 100
  return nextLevelXp - xp
}

const calculateXpProgress = (xp) => {
  const level = calculateLevel(xp)
  const currentLevelXp = Math.pow(level, 2) * 100
  const nextLevelXp = Math.pow(level + 1, 2) * 100
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
  return Math.floor(progress)
}

// 30 BACKGROUNDS - SAME NAMES + PRICES - BRIGHTER COLORS + GLOW SVG
const BACKGROUNDS = {
  'default': { name: 'Hacker', color: '#0d2818', pattern: 'matrix', glow: '#00ff00', price: 0 },
  'cyber': { name: 'Cyber', color: '#2d0a4d', pattern: 'grid', glow: '#9600ff', price: 5000 },
  'neon': { name: 'Neon', color: '#003333', pattern: 'lines', glow: '#00ffff', price: 5000 },
  'sunset': { name: 'Sunset', color: '#4d1a1a', pattern: 'gradient', glow: '#ff6600', price: 8000 },
  'ocean': { name: 'Ocean', color: '#0d2d4d', pattern: 'waves', glow: '#00b4ff', price: 8000 },
  'forest': { name: 'Forest', color: '#1a330d', pattern: 'dots', glow: '#00ff64', price: 8000 },
  'galaxy': { name: 'Galaxy', color: '#1a0d33', pattern: 'stars', glow: '#aa00ff', price: 15000 },
  'fire': { name: 'Fire', color: '#4d1500', pattern: 'flame', glow: '#ff3200', price: 10000 },
  'ice': { name: 'Ice', color: '#0d334d', pattern: 'crystal', glow: '#00d4ff', price: 10000 },
  'gold': { name: 'Gold', color: '#332600', pattern: 'luxury', glow: '#ffd700', price: 25000 },
  'silver': { name: 'Silver', color: '#333333', pattern: 'metal', glow: '#e0e0e0', price: 20000 },
  'purple': { name: 'Purple', color: '#33004d', pattern: 'royal', glow: '#c800ff', price: 12000 },
  'red': { name: 'Red', color: '#4d0000', pattern: 'blood', glow: '#ff0000', price: 10000 },
  'blue': { name: 'Blue', color: '#00004d', pattern: 'deep', glow: '#0064ff', price: 10000 },
  'green': { name: 'Green', color: '#004d00', pattern: 'nature', glow: '#00ff00', price: 10000 },
  'pink': { name: 'Pink', color: '#4d004d', pattern: 'cute', glow: '#ff00ff', price: 12000 },
  'orange': { name: 'Orange', color: '#4d2600', pattern: 'warm', glow: '#ff9600', price: 10000 },
  'teal': { name: 'Teal', color: '#004d4d', pattern: 'calm', glow: '#00ffc8', price: 10000 },
  'void': { name: 'Void', color: '#1a1a1a', pattern: 'black', glow: '#ff00ff', price: 30000 },
  'light': { name: 'Light', color: '#333333', pattern: 'minimal', glow: '#ffffff', price: 15000 },
  'rainbow': { name: 'Rainbow', color: '#2d2d2d', pattern: 'colorful', glow: '#ff00ff', price: 20000 },
  'carbon': { name: 'Carbon', color: '#1a1a1a', pattern: 'fiber', glow: '#00ffaa', price: 18000 },
  'diamond': { name: 'Diamond', color: '#2d2d4d', pattern: 'gems', glow: '#b4ffff', price: 50000 },
  'emerald': { name: 'Emerald', color: '#0d3320', pattern: 'jewel', glow: '#00ff96', price: 40000 },
  'ruby': { name: 'Ruby', color: '#330d0d', pattern: 'stone', glow: '#ff0064', price: 40000 },
  'sapphire': { name: 'Sapphire', color: '#0d0d33', pattern: 'crystal', glow: '#0064ff', price: 40000 },
  'cosmic': { name: 'Cosmic', color: '#1a0d4d', pattern: 'space', glow: '#aa00ff', price: 35000 },
  'toxic': { name: 'Toxic', color: '#2d4d00', pattern: 'poison', glow: '#96ff00', price: 15000 },
  'vintage': { name: 'Vintage', color: '#332200', pattern: 'retro', glow: '#ffb400', price: 12000 },
  'future': { name: 'Future', color: '#0d2d4d', pattern: 'tech', glow: '#00c8ff', price: 30000 }
}

const BANK_UPGRADES = [
  { level: 0, limit: 50000, name: 'Basic Wallet' },
  { level: 1, limit: 250000, name: 'Savings Account' },
  { level: 2, limit: 1000000, name: 'Gold Vault' },
  { level: 3, limit: 5000000, name: 'Diamond Safe' },
  { level: 4, limit: 25000000, name: 'Offshore Account' },
  { level: 5, limit: 100000000, name: 'Swiss Bank' },
  { level: 6, limit: 500000000, name: 'Central Reserve' }
]

async function generateBackground(theme) {
  const bg = BACKGROUNDS[theme] || BACKGROUNDS.default
  const width = 1200, height = 630
  const image = await Jimp.create(width, height, bg.color)

  // Enhanced patterns with GLOW
  if (bg.pattern === 'matrix') {
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(0, 255, 0, Math.random() * 200 + 100), x, y)
    }
  } else if (bg.pattern === 'grid') {
    for (let x = 0; x < width; x += 30) {
      for (let y = 0; y < height; y++) {
        image.setPixelColor(Jimp.rgbaToInt(150, 0, 255, 150), x, y)
      }
    }
    for (let y = 0; y < height; y += 30) {
      for (let x = 0; x < width; x++) {
        image.setPixelColor(Jimp.rgbaToInt(150, 0, 255, 150), x, y)
      }
    }
  } else if (bg.pattern === 'stars') {
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, Math.random() * 255), x, y)
    }
  } else if (bg.pattern === 'waves') {
    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x / 25) * 80
      for (let dy = 0; dy < 8; dy++) {
        image.setPixelColor(Jimp.rgbaToInt(0, 200, 255, 180), x, y + dy)
      }
    }
  } else if (bg.pattern === 'gradient') {
    image.scan(0, 0, width, height, function (x, y, idx) {
      const ratio = y / height
      this.bitmap.data[idx + 0] = Math.floor(255 * ratio)
      this.bitmap.data[idx + 1] = Math.floor(120 * (1 - ratio))
      this.bitmap.data[idx + 2] = Math.floor(180 * ratio)
    })
  } else if (bg.pattern === 'flame') {
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width
      const y = height - Math.random() * 200
      image.setPixelColor(Jimp.rgbaToInt(255, Math.random() * 150, 0, 200), x, y)
    }
  } else if (bg.pattern === 'crystal') {
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      for (let s = 0; s < 20; s++) {
        image.setPixelColor(Jimp.rgbaToInt(200, 240, 255, 150), x + s, y + s)
        image.setPixelColor(Jimp.rgbaToInt(200, 240, 255, 150), x - s, y + s)
      }
    }
  } else if (bg.pattern === 'luxury') {
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(255, 215, 0, 180), x, y)
    }
  } else {
    // Dots pattern for others
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 80), x, y)
    }
  }

  return await image.getBufferAsync(Jimp.MIME_PNG)
}

async function createRoundPfp(imageUrl) {
  try {
    const response = await fetch(imageUrl)
    const buffer = await response.buffer()
    return await sharp(buffer)
     .resize(280, 280)
     .composite([{
        input: Buffer.from(`<svg><circle cx="140" cy="140" r="140"/></svg>`),
        blend: 'dest-in'
      }])
     .png()
     .toBuffer()
  } catch {
    return await sharp({
      create: { width: 280, height: 280, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } }
    }).png().toBuffer()
  }
}

export default {
  name: 'profile',
  alias: ['pfp', 'me', 'card', 'stats'],
  desc: 'Generate your profile card with full stats',
  usage: '[@user]',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const replied = m.message?.extendedTextMessage?.contextInfo?.participant
    const target = mentioned || replied || sender

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

    // FETCH ALL USER DATA - EXPANDED
    const [
      balance, bank, xp, streak, crimeCount, jailTime,
      activeBg, pushName, currency, married, gangId,
      bankLevel, workCount, robCount, gambleTotal, job
    ] = await Promise.all([
      db.get(`eco_${groupId}_balance_${target}`),
      db.get(`eco_${groupId}_bank_${target}`),
      db.get(`eco_${groupId}_xp_${target}`),
      db.get(`eco_${groupId}_streak_${target}`),
      db.get(`eco_${groupId}_crime_count_${target}`),
      db.get(`eco_${groupId}_jail_${target}`),
      db.get(`eco_${groupId}_bg_${target}`),
      db.get(`pushname_${target}`),
      db.getGroupKey(groupId, 'eco_currency'),
      db.get(`eco_${groupId}_married_${target}`),
      db.get(`eco_${groupId}_user_gang_${target}`),
      db.get(`eco_${groupId}_bank_level_${target}`),
      db.get(`eco_${groupId}_work_count_${target}`),
      db.get(`eco_${groupId}_rob_count_${target}`),
      db.get(`eco_${groupId}_gamble_total_${target}`),
      db.get(`eco_${groupId}_job_${target}`)
    ])

    const gangName = gangId? await db.get(`eco_${groupId}_gang_${gangId}_name`) : null
    const marriedTo = married? await db.get(`pushname_${married}`) || married.split('@')[0] : null

    const currentBalance = balance || 0
    const currentBank = bank || 0
    const totalWealth = currentBalance + currentBank
    const currentXp = xp || 0
    const level = calculateLevel(currentXp)
    const xpToNext = calculateXpToNext(currentXp)
    const xpProgress = calculateXpProgress(currentXp)
    const currencySymbol = currency || '$'
    const userName = pushName || target.split('@')[0]
    const isJailed = jailTime && Date.now() < jailTime
    const bgTheme = activeBg || 'default'
    const bgData = BACKGROUNDS[bgTheme] || BACKGROUNDS.default
    const currentBankLevel = bankLevel || 0
    const bankLimit = BANK_UPGRADES[currentBankLevel]?.limit || 50000
    const bankTierName = BANK_UPGRADES[currentBankLevel]?.name || 'Basic Wallet'

    // GET PFP
    let pfpUrl
    try {
      pfpUrl = await sock.profilePictureUrl(target, 'image')
    } catch {
      pfpUrl = 'https://i.imgur.com/wXqHNNJ.png'
    }

    // GENERATE CARD
    const bgBuffer = await generateBackground(bgTheme)
    const pfpBuffer = await createRoundPfp(pfpUrl)

    const svgText = `
    <svg width="1200" height="630">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#000;stop-opacity:0.6" />
          <stop offset="100%" style="stop-color:#000;stop-opacity:0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="shadow">
          <feDropShadow dx="0" dy="0" stdDeviation="10" flood-color="${bgData.glow}" flood-opacity="0.8"/>
        </filter>
        <filter id="textglow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)"/>

      <!-- PFP GLOW -->
      <circle cx="200" cy="315" r="145" fill="${bgData.glow}" opacity="0.3" filter="url(#glow)"/>

      <!-- NAME & LEVEL -->
      <text x="380" y="70" font-family="Arial Black" font-size="54" fill="#fff" filter="url(#textglow)">${userName.toUpperCase()}</text>
      <text x="380" y="110" font-family="Arial" font-size="30" fill="${bgData.glow}" filter="url(#textglow)">Level ${level} • ${formatCash(currentXp)} XP</text>

      <!-- XP BAR -->
      <rect x="380" y="125" width="700" height="20" rx="10" fill="#333" opacity="0.8"/>
      <rect x="380" y="125" width="${xpProgress * 7}" height="20" rx="10" fill="${bgData.glow}" filter="url(#glow)"/>
      <text x="380" y="165" font-family="Arial" font-size="18" fill="#ccc">Next: ${formatCash(xpToNext)} XP (${xpProgress}%)</text>

      <!-- MONEY -->
      <text x="380" y="220" font-family="Arial Black" font-size="42" fill="#00ff00" filter="url(#shadow)">💰 ${currencySymbol}${formatCash(currentBalance)}</text>
      <text x="380" y="265" font-family="Arial" font-size="34" fill="#0099ff" filter="url(#shadow)">🏦 ${currencySymbol}${formatCash(currentBank)} / ${currencySymbol}${formatCash(bankLimit)}</text>
      <text x="380" y="310" font-family="Arial Black" font-size="38" fill="#ffaa00" filter="url(#shadow)">💎 ${currencySymbol}${formatCash(totalWealth)}</text>

      <!-- DIVIDER -->
      <rect x="380" y="335" width="700" height="2" fill="${bgData.glow}" opacity="0.6"/>

      <!-- STATS ROW 1 -->
      <text x="380" y="375" font-family="Arial" font-size="24" fill="#ff6600" filter="url(#shadow)">🔥 Streak: ${streak || 0}d</text>
      <text x="600" y="375" font-family="Arial" font-size="24" fill="#ff0000" filter="url(#shadow)">🦹 Crimes: ${crimeCount || 0}</text>
      <text x="820" y="375" font-family="Arial" font-size="24" fill="#aa00ff" filter="url(#shadow)">💼 Job: ${job || 'None'}</text>

      <!-- STATS ROW 2 -->
      <text x="380" y="410" font-family="Arial" font-size="24" fill="#00ff88" filter="url(#shadow)">⚒️ Work: ${workCount || 0}</text>
      <text x="600" y="410" font-family="Arial" font-size="24" fill="#ff00ff" filter="url(#shadow)">🎲 Gamble: ${currencySymbol}${formatCash(gambleTotal || 0)}</text>
      <text x="820" y="410" font-family="Arial" font-size="24" fill="#00c8ff" filter="url(#shadow)">🔓 Bank: ${bankTierName}</text>

      <!-- STATS ROW 3 -->
      <text x="380" y="445" font-family="Arial" font-size="24" fill="#ff69b4" filter="url(#shadow)">💍 ${marriedTo? `Married: ${marriedTo}` : 'Single'}</text>
      <text x="680" y="445" font-family="Arial" font-size="24" fill="#00ff00" filter="url(#shadow)">🏴 ${gangName || 'No Gang'}</text>

      <!-- STATUS -->
      <text x="380" y="485" font-family="Arial Black" font-size="28" fill="${isJailed? '#ff0000' : '#00ff00'}" filter="url(#glow)">${isJailed? '🚨 IN JAIL' : '✅ ACTIVE'}</text>
      <text x="650" y="485" font-family="Arial" font-size="24" fill="${bgData.glow}" filter="url(#textglow)">🎨 ${bgData.name}</text>

      <!-- FOOTER -->
      <text x="380" y="570" font-family="Arial" font-size="18" fill="#aaa">SwiftBot Economy • ${groupId === 'global'? 'Global' : 'Group'} Profile • ${new Date().toLocaleDateString()}</text>
    </svg>
    `

    const finalImage = await sharp(bgBuffer)
     .composite([
        { input: pfpBuffer, top: 175, left: 60 },
        { input: Buffer.from(svgText), top: 0, left: 0 }
      ])
     .jpeg({ quality: 95 })
     .toBuffer()

    await sock.sendMessage(from, {
      image: finalImage,
      caption: `╔═〘 👤ᴘʀᴏғɪʟᴇ 〙═╗
┃➠ @${target.split('@')[0]}
┃➠ ʟᴇᴠᴇʟ ${level} | ${formatCash(currentXp)} xᴘ
┃➠ ᴛʜᴇᴍᴇ: ${bgData.name}
╚═══════════════════╝`,
      mentions: [target]
    }, { quoted: m })
  }
}