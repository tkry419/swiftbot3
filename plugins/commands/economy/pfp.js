/**
 * SwiftBot - plugins/commands/economy/profile.js
 * Dynamic Profile Card - Backgrounds Sold in Shop
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

// 30 BACKGROUNDS - ALL SOLD IN SHOP
const BACKGROUNDS = {
  'default': { name: 'Hacker', color: '#0a0a0a', pattern: 'matrix', price: 0 },
  'cyber': { name: 'Cyber', color: '#1a0033', pattern: 'grid', price: 5000 },
  'neon': { name: 'Neon', color: '#001a1a', pattern: 'lines', price: 5000 },
  'sunset': { name: 'Sunset', color: '#330011', pattern: 'gradient', price: 8000 },
  'ocean': { name: 'Ocean', color: '#001a33', pattern: 'waves', price: 8000 },
  'forest': { name: 'Forest', color: '#0d1a0d', pattern: 'dots', price: 8000 },
  'galaxy': { name: 'Galaxy', color: '#0a001a', pattern: 'stars', price: 15000 },
  'fire': { name: 'Fire', color: '#330a00', pattern: 'flame', price: 10000 },
  'ice': { name: 'Ice', color: '#001a33', pattern: 'crystal', price: 10000 },
  'gold': { name: 'Gold', color: '#1a1500', pattern: 'luxury', price: 25000 },
  'silver': { name: 'Silver', color: '#1a1a1a', pattern: 'metal', price: 20000 },
  'purple': { name: 'Purple', color: '#1a0033', pattern: 'royal', price: 12000 },
  'red': { name: 'Red', color: '#330000', pattern: 'blood', price: 10000 },
  'blue': { name: 'Blue', color: '#000033', pattern: 'deep', price: 10000 },
  'green': { name: 'Green', color: '#003300', pattern: 'nature', price: 10000 },
  'pink': { name: 'Pink', color: '#330033', pattern: 'cute', price: 12000 },
  'orange': { name: 'Orange', color: '#331a00', pattern: 'warm', price: 10000 },
  'teal': { name: 'Teal', color: '#003333', pattern: 'calm', price: 10000 },
  'void': { name: 'Void', color: '#000000', pattern: 'black', price: 30000 },
  'light': { name: 'Light', color: '#1a1a1a', pattern: 'minimal', price: 15000 },
  'rainbow': { name: 'Rainbow', color: '#1a1a1a', pattern: 'colorful', price: 20000 },
  'carbon': { name: 'Carbon', color: '#0d0d0d', pattern: 'fiber', price: 18000 },
  'diamond': { name: 'Diamond', color: '#1a1a33', pattern: 'gems', price: 50000 },
  'emerald': { name: 'Emerald', color: '#001a0d', pattern: 'jewel', price: 40000 },
  'ruby': { name: 'Ruby', color: '#1a0000', pattern: 'stone', price: 40000 },
  'sapphire': { name: 'Sapphire', color: '#00001a', pattern: 'crystal', price: 40000 },
  'cosmic': { name: 'Cosmic', color: '#0a001a', pattern: 'space', price: 35000 },
  'toxic': { name: 'Toxic', color: '#1a3300', pattern: 'poison', price: 15000 },
  'vintage': { name: 'Vintage', color: '#1a1200', pattern: 'retro', price: 12000 },
  'future': { name: 'Future', color: '#001a33', pattern: 'tech', price: 30000 }
}

async function generateBackground(theme) {
  const bg = BACKGROUNDS[theme] || BACKGROUNDS.default
  const width = 1200, height = 630
  const image = await Jimp.create(width, height, bg.color)

  // Dynamic patterns
  if (bg.pattern === 'matrix') {
    for (let i = 0; i < 150; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(0, 255, 0, Math.random() * 100), x, y)
    }
  } else if (bg.pattern === 'grid') {
    for (let x = 0; x < width; x += 50) {
      for (let y = 0; y < height; y++) {
        image.setPixelColor(Jimp.rgbaToInt(100, 0, 255, 40), x, y)
      }
    }
    for (let y = 0; y < height; y += 50) {
      for (let x = 0; x < width; x++) {
        image.setPixelColor(Jimp.rgbaToInt(100, 0, 255, 40), x, y)
      }
    }
  } else if (bg.pattern === 'stars') {
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, Math.random() * 255), x, y)
    }
  } else if (bg.pattern === 'waves') {
    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin(x / 30) * 50
      for (let dy = 0; dy < 3; dy++) {
        image.setPixelColor(Jimp.rgbaToInt(0, 150, 255, 100), x, y + dy)
      }
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
          <stop offset="0%" style="stop-color:#000;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#000;stop-opacity:0.4" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect width="1200" height="630" fill="url(#grad)"/>

      <text x="380" y="70" font-family="Arial Black" font-size="52" fill="#fff" filter="url(#glow)">${userName.toUpperCase()}</text>
      <text x="380" y="115" font-family="Arial" font-size="28" fill="#00ff88">Level ${level} | ${formatCash(currentXp)} XP</text>
      <text x="380" y="145" font-family="Arial" font-size="22" fill="#888">Next: ${formatCash(xpToNext)} XP</text>

      <rect x="380" y="170" width="700" height="2" fill="#fff" opacity="0.3"/>

      <text x="380" y="220" font-family="Arial Black" font-size="38" fill="#00ff00">💰 ${currencySymbol}${formatCash(currentBalance)}</text>
      <text x="380" y="270" font-family="Arial" font-size="32" fill="#0099ff">🏦 ${currencySymbol}${formatCash(currentBank)}</text>
      <text x="380" y="320" font-family="Arial Black" font-size="36" fill="#ffaa00">💎 ${currencySymbol}${formatCash(totalWealth)}</text>

      <rect x="380" y="350" width="700" height="2" fill="#fff" opacity="0.3"/>

      <text x="380" y="400" font-family="Arial" font-size="26" fill="#ff6600">🔥 Streak: ${streak || 0} days</text>
      <text x="680" y="400" font-family="Arial" font-size="26" fill="#ff0000">🦹 Crimes: ${crimeCount || 0}</text>
      <text x="380" y="440" font-family="Arial" font-size="26" fill="#aa00ff">🎨 Theme: ${BACKGROUNDS[bgTheme]?.name || 'Hacker'}</text>
      <text x="680" y="440" font-family="Arial" font-size="26" fill="${isJailed? '#ff0000' : '#00ff00'}">${isJailed? '🚨 IN JAIL' : '✅ ACTIVE'}</text>

      <text x="380" y="550" font-family="Arial" font-size="20" fill="#666">SwiftBot Economy | ${groupId === 'global'? 'Global' : 'Group'} Profile</text>
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