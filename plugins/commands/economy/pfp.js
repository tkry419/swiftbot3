/**
 * SwiftBot - plugins/commands/economy/profile.js
 * Dynamic Profile Card - Auto-reads from assets.js
 * Uses Sharp + Jimp - Shows PFP, Name, Balance, Level, Marriage, Gang, Bank Tier
 */

import sharp from 'sharp'
import Jimp from 'jimp'
import fetch from 'node-fetch'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import axios from 'axios'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_PATH = path.join(__dirname, 'assets.js')
const ASSETS_DIR = path.join(__dirname, 'assets')

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const calculateLevel = (xp) => {
  return Math.floor(Math.sqrt(xp / 100)) + 1
}

const calculateXpToNext = (xp) => {
  const level = calculateLevel(xp) - 1
  const nextLevelXp = Math.pow(level + 1, 2) * 100
  return nextLevelXp - xp
}

const calculateXpProgress = (xp) => {
  const level = calculateLevel(xp) - 1
  const currentLevelXp = Math.pow(level, 2) * 100
  const nextLevelXp = Math.pow(level + 1, 2) * 100
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100
  return Math.floor(progress)
}

const escapeXml = (str) => {
  return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&apos;')
}

// FALLBACK IF assets.js FAILS
const FALLBACK_BACKGROUNDS = {
  'default': {
    id: 'default',
    name: 'Default',
    price: 0,
    tier: 'common',
    glow: '#ffffff',
    type: 'static'
  }
}

// AUTO-LOAD FROM assets.js
const loadBackgrounds = async () => {
  try {
    if (fs.existsSync(ASSETS_PATH)) {
      const { default: ASSETS } = await import(`./assets.js?update=${Date.now()}`)
      const bgs = {...ASSETS }
      delete bgs.overlays
      if (!bgs.default) {
        bgs.default = FALLBACK_BACKGROUNDS.default
      }
      return bgs
    }
  } catch (e) {
    console.error('Failed to load assets.js:', e.message)
  }
  return FALLBACK_BACKGROUNDS
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

async function generateBackground(theme, bgData) {
  const width = 1200, height = 630

  // Try to load actual PNG from assets/
  const bgPath = path.join(ASSETS_DIR, `${theme}.png`)
  const bgFramePath = path.join(ASSETS_DIR, `${theme}_frame.png`)

  let bgBuffer = null
  if (fs.existsSync(bgFramePath)) {
    bgBuffer = await sharp(bgFramePath).resize(width, height, { fit: 'cover' }).png().toBuffer()
  } else if (fs.existsSync(bgPath)) {
    bgBuffer = await sharp(bgPath).resize(width, height, { fit: 'cover' }).png().toBuffer()
  }

  if (bgBuffer) return bgBuffer

  // Fallback to generated pattern if PNG missing
  const image = await Jimp.create(width, height, bgData.glow || '#1a1a2e')

  // Simple fallback pattern
  for (let i = 0; i < 200; i++) {
    const x = Math.random() * width
    const y = Math.random() * height
    image.setPixelColor(Jimp.rgbaToInt(255, 255, 255, 80), x, y)
  }

  return await image.getBufferAsync(Jimp.MIME_PNG)
}

async function getUserPfp(sock, jid) {
  try {
    const pfpUrl = await sock.profilePictureUrl(jid, 'image')
    const res = await axios.get(pfpUrl, { responseType: 'arraybuffer', timeout: 5000 })
    return Buffer.from(res.data)
  } catch {
    return await sharp({
      create: { width: 280, height: 280, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } }
    }).png().toBuffer()
  }
}

async function createRoundPfp(imageBuffer) {
  return await sharp(imageBuffer)
  .resize(280, 280)
  .composite([{
      input: Buffer.from(`<svg><circle cx="140" cy="140" r="140"/></svg>`),
      blend: 'dest-in'
    }])
  .png()
  .toBuffer()
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
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴅɪsᴀʙʟᴇᴅ
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    const groupId = isGroup? from : 'global'

    // LOAD BACKGROUNDS FROM assets.js
    const BACKGROUNDS = await loadBackgrounds()

    // FETCH ALL USER DATA
    const [
      balance, bank, xp, streak, crimeCount, jailTime,
      activeBg, pushName, currency, married, gangId,
      bankLevel, workCount, robCount, gambleTotal, job
    ] = await Promise.all([
      db.get(`eco_${groupId}_balance_${target}`),
      db.get(`eco_${groupId}_bank_${target}`),
      db.get(`eco_${groupId}_xp_${target}`),
      db.get(`eco_${groupId}_streak_${target}`),
      db.get(`eco_${groupId}_crimecount_${target}`),
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

    // GENERATE CARD
    try {
      const bgBuffer = await generateBackground(bgTheme, bgData)
      const pfpRaw = await getUserPfp(sock, target)
      const pfpBuffer = await createRoundPfp(pfpRaw)

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
        <text x="380" y="70" font-family="Arial Black" font-size="54" fill="#fff" filter="url(#textglow)">${escapeXml(userName.toUpperCase())}</text>
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
        <text x="820" y="375" font-family="Arial" font-size="24" fill="#aa00ff" filter="url(#shadow)">💼 Job: ${escapeXml(job || 'None')}</text>

        <!-- STATS ROW 2 -->
        <text x="380" y="410" font-family="Arial" font-size="24" fill="#00ff88" filter="url(#shadow)">⚒️ Work: ${workCount || 0}</text>
        <text x="600" y="410" font-family="Arial" font-size="24" fill="#ff00ff" filter="url(#shadow)">🎲 Gamble: ${currencySymbol}${formatCash(gambleTotal || 0)}</text>
        <text x="820" y="410" font-family="Arial" font-size="24" fill="#00c8ff" filter="url(#shadow)">🔓 Bank: ${bankTierName}</text>

        <!-- STATS ROW 3 -->
        <text x="380" y="445" font-family="Arial" font-size="24" fill="#ff69b4" filter="url(#shadow)">💍 ${marriedTo? `Married: ${escapeXml(marriedTo)}` : 'Single'}</text>
        <text x="680" y="445" font-family="Arial" font-size="24" fill="#00ff00" filter="url(#shadow)">🏴 ${escapeXml(gangName || 'No Gang')}</text>

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

    } catch (e) {
      console.error('Profile generation failed:', e)
      // Fallback to text
      await sock.sendMessage(from, {
        text: `╔═〘 👤ᴘʀᴏғɪʟᴇ 〙═╗
┃➠ @${target.split('@')[0]}
┃➠ ʟᴇᴠᴇʟ ${level} | ${formatCash(currentXp)} xᴘ
┃➠ ᴛʜᴇᴍᴇ: ${bgData.name}
┃
┃➠ 💰 ᴄᴀsʜ: ${currencySymbol}${formatCash(currentBalance)}
┃➠ 🏦 ʙᴀɴᴋ: ${currencySymbol}${formatCash(currentBank)}
┃➠ 💎 ɴᴇᴛ: ${currencySymbol}${formatCash(totalWealth)}
╚═══════════════════╝`,
        mentions: [target]
      }, { quoted: m })
    }
  }
}