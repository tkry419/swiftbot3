/**
 * SwiftBot - plugins/commands/economy/profile.js
 * Dynamic Profile Card - so Backgrounds Sold in Shop
 * Uses Sharp + Jimp - Shows PFP, Name, Balance, Level, Stats
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

// 30 BACKGROUNDS - ALL SOLD IN SHOP - BRIGHTER COLORS
const BACKGROUNDS = {
  'default': { name: 'Hacker', color: '#0d2818', pattern: 'matrix', price: 0 },
  'cyber': { name: 'Cyber', color: '#2d0a4d', pattern: 'grid', price: 5000 },
  'neon': { name: 'Neon', color: '#003333', pattern: 'lines', price: 5000 },
  'sunset': { name: 'Sunset', color: '#4d1a1a', pattern: 'gradient', price: 8000 },
  'ocean': { name: 'Ocean', color: '#0d2d4d', pattern: 'waves', price: 8000 },
  'forest': { name: 'Forest', color: '#1a330d', pattern: 'dots', price: 8000 },
  'galaxy': { name: 'Galaxy', color: '#1a0d33', pattern: 'stars', price: 15000 },
  'fire': { name: 'Fire', color: '#4d1500', pattern: 'flame', price: 10000 },
  'ice': { name: 'Ice', color: '#0d334d', pattern: 'crystal', price: 10000 },
  'gold': { name: 'Gold', color: '#332600', pattern: 'luxury', price: 25000 },
  'silver': { name: 'Silver', color: '#333333', pattern: 'metal', price: 20000 },
  'purple': { name: 'Purple', color: '#33004d', pattern: 'royal', price: 12000 },
  'red': { name: 'Red', color: '#4d0000', pattern: 'blood', price: 10000 },
  'blue': { name: 'Blue', color: '#00004d', pattern: 'deep', price: 10000 },
  'green': { name: 'Green', color: '#004d00', pattern: 'nature', price: 10000 },
  'pink': { name: 'Pink', color: '#4d004d', pattern: 'cute', price: 12000 },
  'orange': { name: 'Orange', color: '#4d2600', pattern: 'warm', price: 10000 },
  'teal': { name: 'Teal', color: '#004d4d', pattern: 'calm', price: 10000 },
  'void': { name: 'Void', color: '#1a1a1a', pattern: 'black', price: 30000 },
  'light': { name: 'Light', color: '#333333', pattern: 'minimal', price: 15000 },
  'rainbow': { name: 'Rainbow', color: '#2d2d2d', pattern: 'colorful', price: 20000 },
  'carbon': { name: 'Carbon', color: '#1a1a1a', pattern: 'fiber', price: 18000 },
  'diamond': { name: 'Diamond', color: '#2d2d4d', pattern: 'gems', price: 50000 },
  'emerald': { name: 'Emerald', color: '#0d3320', pattern: 'jewel', price: 40000 },
  'ruby': { name: 'Ruby', color: '#330d0d', pattern: 'stone', price: 40000 },
  'sapphire': { name: 'Sapphire', color: '#0d0d33', pattern: 'crystal', price: 40000 },
  'cosmic': { name: 'Cosmic', color: '#1a0d4d', pattern: 'space', price: 35000 },
  'toxic': { name: 'Toxic', color: '#2d4d00', pattern: 'poison', price: 15000 },
  'vintage': { name: 'Vintage', color: '#332200', pattern: 'retro', price: 12000 },
  'future': { name: 'Future', color: '#0d2d4d', pattern: 'tech', price: 30000 }
}

async function generateBackground(theme) {
  const bg = BACKGROUNDS[theme] || BACKGROUNDS.default
  const width = 1200, height = 630
  const image = await Jimp.create(width, height, bg.color)

  // Dynamic patterns - MORE VISIBLE
  if (bg.pattern === 'matrix') {
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(0, 255, 0, Math.random() * 180 + 75), x, y)
    }
  } else if (bg.pattern === 'grid') {
    for (let x = 0; x < width; x += 40) {
      for (let y = 0; y < height; y++) {
        image.setPixelColor(Jimp.rgbaToInt(150, 50, 255, 120), x, y)
      }
    }
    for (let y = 0; y < height; y += 40) {
      for (let x = 0; x < width; x++) {
        image.setPixelColor(Jimp.rgbaToInt(150, 50, 255, 120), x, y)
      }
    }
  } else if (bg.pattern === 'stars') {
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const size = Math.random() * 2
      image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, Math.random() * 200 + 55), x, y)
    }
  } else if (bg.pattern === 'waves') {
    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x / 30) * 60
      for (let dy = 0; dy < 5; dy++) {
        image.setPixelColor(Jimp.rgbaToInt(0, 180, 255, 150), x, y + dy)
      }
    }
  } else if (bg.pattern === 'gradient') {
    image.scan(0, 0, width, height, function (x, y, idx) {
      const ratio = y / height
      this.bitmap.data[idx + 0] = Math.floor(255 * ratio) // R
      this.bitmap.data[idx + 1] = Math.floor(100 * (1 - ratio)) // G
      this.bitmap.data[idx + 2] = Math.floor(150 * ratio) // B
    })
  } else if (bg.pattern === 'dots') {
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(0, 255, 100, 100), x, y)
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
  alias: ['pfp', 'me', 'card'],
  desc: 'Generate your profile card with stats and background',
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

    // FETCH ALL USER DATA
    const [
      balance, bank, xp, streak, crimeCount, jailTime,
      activeBg, pushName, currency
    ] = await Promise.all([
      db.get(`eco_${groupId}_balance_${target}`),
      db.get(`eco_${groupId}_bank_${target}`),
      db.get(`eco_${groupId}_xp_${target}`),
      db.get(`eco_${groupId}_streak_${target}`),
      db.get(`eco_${groupId}_crimecount_${target}`),
      db.get(`eco_${groupId}_jail_${target}`),
      db.get(`eco_${groupId}_bg_${target}`),
      db.get(`pushname_${target}`),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currentBalance = balance || 0
    const currentBank = bank || 0
    const totalWealth = currentBalance + currentBank
    const currentXp = xp || 0
    const level = calculateLevel(currentXp)
    const xpToNext = calculateXpToNext(currentXp)
    const currencySymbol = currency || '$'
    const userName = pushName || target.split('@')[0]
    const isJailed = jailTime && Date.now() < jailTime
    const bgTheme = activeBg || 'default'

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
          <stop offset="0%" style="stop-color:#000;stop-opacity:0.4" />
          <stop offset="100%" style="stop-color:#000;stop-opacity:0.2" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="shadow">
          <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#000" flood-opacity="0.9"/>
        </filter>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)"/>

      <text x="380" y="70" font-family="Arial Black" font-size="52" fill="#fff" filter="url(#shadow)">${userName.toUpperCase()}</text>
      <text x="380" y="115" font-family="Arial" font-size="28" fill="#00ff88" filter="url(#shadow)">Level ${level} | ${formatCash(currentXp)} XP</text>
      <text x="380" y="145" font-family="Arial" font-size="22" fill="#ccc" filter="url(#shadow)">Next: ${formatCash(xpToNext)} XP</text>

      <rect x="380" y="170" width="700" height="2" fill="#fff" opacity="0.5"/>

      <text x="380" y="220" font-family="Arial Black" font-size="38" fill="#00ff00" filter="url(#shadow)">💰 ${currencySymbol}${formatCash(currentBalance)}</text>
      <text x="380" y="270" font-family="Arial" font-size="32" fill="#0099ff" filter="url(#shadow)">🏦 ${currencySymbol}${formatCash(currentBank)}</text>
      <text x="380" y="320" font-family="Arial Black" font-size="36" fill="#ffaa00" filter="url(#shadow)">💎 ${currencySymbol}${formatCash(totalWealth)}</text>

      <rect x="380" y="350" width="700" height="2" fill="#fff" opacity="0.5"/>

      <text x="380" y="400" font-family="Arial" font-size="26" fill="#ff6600" filter="url(#shadow)">🔥 Streak: ${streak || 0} days</text>
      <text x="680" y="400" font-family="Arial" font-size="26" fill="#ff0000" filter="url(#shadow)">🦹 Crimes: ${crimeCount || 0}</text>
      <text x="380" y="440" font-family="Arial" font-size="26" fill="#aa00ff" filter="url(#shadow)">🎨 Theme: ${BACKGROUNDS[bgTheme]?.name || 'Hacker'}</text>
      <text x="680" y="440" font-family="Arial" font-size="26" fill="${isJailed? '#ff0000' : '#00ff00'}" filter="url(#shadow)">${isJailed? '🚨 IN JAIL' : '✅ ACTIVE'}</text>

      <text x="380" y="550" font-family="Arial" font-size="20" fill="#aaa" filter="url(#shadow)">SwiftBot Economy | ${groupId === 'global'? 'Global' : 'Group'} Profile</text>
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
╚═══════════════════╝`,
      mentions: [target]
    }, { quoted: m })
  }
}