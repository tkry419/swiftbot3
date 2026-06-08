/**
 * SwiftBot - plugins/commands/economy/rob.js
 * Group-Based Rob System with Generated Images
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_jail_${user}
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

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

// WORKING IMAGE URLS FROM YOUR LIST
const SUCCESS_IMG_URL = 'https://i.ibb.co/qYq2nJgM/images-2.jpg' // steal_success
const JAIL_IMG_URL = 'https://i.ibb.co/pBdkbvrq/sddefault.jpg' // jail_caught

const getUserPfp = async (sock, jid) => {
  try {
    const pfpUrl = await sock.profilePictureUrl(jid, 'image')
    const res = await axios.get(pfpUrl, { 
      responseType: 'arraybuffer',
      timeout: 10000 
    })
    return Buffer.from(res.data)
  } catch {
    // Fallback colored circle
    return await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 100, g: 50, b: 200, alpha: 1 }
      }
    }).png().toBuffer()
  }
}

const generateRobImage = async (sock, sender, target, type, amount = 0, fine = 0, jailHours = 0) => {
  const [senderPfp, targetPfp] = await Promise.all([
    getUserPfp(sock, sender),
    getUserPfp(sock, target)
  ])

  const senderCircle = await sharp(senderPfp)
   .resize(100, 100)
   .composite([{ input: Buffer.from(`<svg><circle cx="50" cy="50" r="50"/></svg>`), blend: 'dest-in' }])
   .png().toBuffer()

  const targetCircle = await sharp(targetPfp)
   .resize(100, 100)
   .composite([{ input: Buffer.from(`<svg><circle cx="50" cy="50" r="50"/></svg>`), blend: 'dest-in' }])
   .png().toBuffer()

  let bgColor, title, mainText, bgImageUrl = null
  if (type === 'success') {
    bgColor = '#0a4d0a'
    title = 'ROB SUCCESS'
    mainText = `STOLE $${formatCash(amount)}`
    bgImageUrl = SUCCESS_IMG_URL // Use your ibb.co image
  } else if (type === 'fail') {
    bgColor = '#4d0a0a'
    title = 'CAUGHT'
    mainText = `JAIL ${jailHours}H | FINE $${formatCash(fine)}`
    bgImageUrl = JAIL_IMG_URL // Use your ibb.co image
  } else {
    bgColor = '#1a1a1a'
    title = 'IN JAIL'
    mainText = `RELEASE IN ${jailHours}M`
    // Use local jail_bars.png if exists
    const jailBarsPath = path.join(ASSETS_DIR, 'jail_bars.png')
    if (fs.existsSync(jailBarsPath)) {
      bgImageUrl = jailBarsPath
    }
  }

  // Download background image if URL
  let bgBuffer = null
  if (bgImageUrl) {
    try {
      if (bgImageUrl.startsWith('http')) {
        const res = await axios.get(bgImageUrl, { responseType: 'arraybuffer', timeout: 10000 })
        bgBuffer = await sharp(Buffer.from(res.data)).resize(800, 400, { fit: 'cover' }).png().toBuffer()
      } else if (fs.existsSync(bgImageUrl)) {
        bgBuffer = await sharp(bgImageUrl).resize(800, 400, { fit: 'cover' }).png().toBuffer()
      }
    } catch (e) {
      console.error('BG image load failed:', e.message)
    }
  }

  const svg = `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${bgColor};stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.95" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="800" height="400" fill="url(#bg)"/>

  <!-- Title -->
  <text x="400" y="60" font-family="Arial Black" font-size="42" fill="#fff" text-anchor="middle" filter="url(#glow)">${title}</text>

  <!-- Main Text -->
  <text x="400" y="320" font-family="Arial Black" font-size="32" fill="#ffcc00" text-anchor="middle">${mainText}</text>

  <!-- VS Text -->
  <text x="400" y="200" font-family="Arial Black" font-size="48" fill="#fff" text-anchor="middle" opacity="0.8">VS</text>
</svg>`

  const composite = [
    { input: Buffer.from(svg), top: 0, left: 0 },
    { input: senderCircle, top: 150, left: 150 },
    { input: targetCircle, top: 150, left: 550 }
  ]

  if (bgBuffer) {
    composite.unshift({ input: bgBuffer, top: 0, left: 0 })
  }

  return await sharp({
    create: { width: 800, height: 400, channels: 4, background: bgColor }
  })
  .composite(composite)
  .png()
  .toBuffer()
}

export default {
  name: 'rob',
  alias: ['steal', 'heist'],
  desc: 'Rob another user - 45% success chance, risk jail',
  usage: '@user',
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

    // 2. CHECK TARGET
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const replied = m.message?.extendedTextMessage?.contextInfo?.participant
    const target = mentioned || replied

    if (!target) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴛᴀʀɢᴇᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}rob @user
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}rob @user
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (target === sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ʀᴏʙ ʏᴏᴜʀsᴇʟғ
┃
┃➠ ᴛʀʏ ʀᴏʙʙɪɴɢ sᴏᴍᴇᴏɴᴇ ᴇʟsᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const senderBalanceKey = `eco_${groupId}_balance_${sender}`
    const targetBalanceKey = `eco_${groupId}_balance_${target}`
    const senderJailKey = `eco_${groupId}_jail_${sender}`
    const targetJailKey = `eco_${groupId}_jail_${target}`
    const lastRobKey = `eco_${groupId}_lastrob_${sender}`
    const robCountKey = `eco_${groupId}_robcount_${sender}`

    // 4. FETCH DATA FROM DB
    const [
      senderBalance,
      targetBalance,
      senderJail,
      targetJail,
      lastRob,
      robCount,
      currency
    ] = await Promise.all([
      db.get(senderBalanceKey),
      db.get(targetBalanceKey),
      db.get(senderJailKey),
      db.get(targetJailKey),
      db.get(lastRobKey),
      db.get(robCountKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currentSenderBalance = senderBalance || 0
    const currentTargetBalance = targetBalance || 0
    const currencySymbol = currency || '$'

    // 5. CHECK IF SENDER IN JAIL
    if (senderJail && Date.now() < senderJail) {
      const remaining = Math.ceil((senderJail - Date.now()) / 60000)
      try {
        const jailImg = await generateRobImage(sock, sender, target, 'jail', 0, 0, remaining)
        return await sock.sendMessage(from, {
          image: jailImg,
          caption: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ᴀʟʀᴇᴀᴅʏ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ᴄᴀɴ'ᴛ ʀᴏʙ ғʀᴏᴍ ᴊᴀɪʟ
╚═══════════════════╝`
        }, { quoted: m })
      } catch {
        return await sock.sendMessage(from, {
          text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ᴀʟʀᴇᴀᴅʏ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 6. CHECK IF TARGET IN JAIL
    if (targetJail && Date.now() < targetJail) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ɪɴ ᴊᴀɪʟ
┃
┃➠ ᴄᴀɴ'ᴛ ʀᴏʙ ᴘᴇᴏᴘʟᴇ ɪɴ ᴊᴀɪʟ
┃➠ ᴛʜᴇʏ'ʀᴇ ᴀʟʀᴇᴀᴅʏ ʙʀᴏᴋᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. CHECK ROB COOLDOWN - 1 HOUR
    const now = Date.now()
    const cooldown = 60 * 60 * 1000 // 1hr
    const timeLeft = lastRob? (lastRob + cooldown) - now : 0

    if (lastRob && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ᴄᴏᴘs ᴀʀᴇ ᴡᴀᴛᴄʜɪɴɢ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ 🦹 ʀᴏʙs ᴅᴏɴᴇ: ${robCount || 0}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. CHECK IF TARGET HAS MONEY
    if (currentTargetBalance < 500) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ᴛᴏᴏ ʙʀᴏᴋᴇ
┃
┃➠ 💰 ᴛʜᴇʏ ʜᴀᴠᴇ: ${currencySymbol}${formatCash(currentTargetBalance)}
┃➠ ᴍɪɴ ᴛᴏ ʀᴏʙ: ${currencySymbol}500
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 9. ROB LOGIC - 45% SUCCESS
    const success = Math.random() < 0.45
    const newRobCount = (robCount || 0) + 1

    if (success) {
      // SUCCESS - STEAL 10-40% OF TARGET CASH
      const stealPercent = Math.random() * 0.3 + 0.1 // 10-40%
      const stolenAmount = Math.floor(currentTargetBalance * stealPercent)
      const newSenderBalance = currentSenderBalance + stolenAmount
      const newTargetBalance = currentTargetBalance - stolenAmount

      await Promise.all([
        db.set(senderBalanceKey, newSenderBalance),
        db.set(targetBalanceKey, newTargetBalance),
        db.set(lastRobKey, now),
        db.set(robCountKey, newRobCount)
      ])

      try {
        const successImg = await generateRobImage(sock, sender, target, 'success', stolenAmount)
        await sock.sendMessage(from, {
          image: successImg,
          caption: `╔═〘 🦹ʀᴏʙ sᴜᴄᴄᴇss 〙═╗
┃➠ ʏᴏᴜ ʀᴏʙʙᴇᴅ @${target.split('@')[0]}
┃
┃➠ 💰 sᴛᴏʟᴇɴ: ${currencySymbol}${formatCash(stolenAmount)}
┃➠ 💰 ʏᴏᴜʀ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
┃
┃➠ 🦹 ᴛᴏᴛᴀʟ ʀᴏʙs: ${newRobCount}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 1ʜ
╚═══════════════════╝`,
          mentions: [sender, target]
        }, { quoted: m })
      } catch (e) {
        await sock.sendMessage(from, {
          text: `╔═〘 🦹ʀᴏʙ sᴜᴄᴄᴇss 〙═╗
┃➠ 💰 sᴛᴏʟᴇɴ: ${currencySymbol}${formatCash(stolenAmount)}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
╚═══════════════════╝`,
          mentions: [sender, target]
        }, { quoted: m })
      }

    } else {
      // FAIL - GO TO JAIL 2-6 HOURS + FINE
      const jailHours = Math.floor(Math.random() * 4 + 2) // 2-6hrs
      const jailTime = now + (jailHours * 60 * 60 * 1000)
      const fine = Math.floor(currentSenderBalance * 0.1) // 10% fine
      const newSenderBalance = Math.max(0, currentSenderBalance - fine)

      await Promise.all([
        db.set(senderJailKey, jailTime),
        db.set(senderBalanceKey, newSenderBalance),
        db.set(lastRobKey, now),
        db.set(robCountKey, newRobCount)
      ])

      try {
        const failImg = await generateRobImage(sock, sender, target, 'fail', 0, fine, jailHours)
        await sock.sendMessage(from, {
          image: failImg,
          caption: `╔═〘 🚨ᴄᴀᴜɢʜᴛ 〙═╗
┃➠ ʏᴏᴜ ғᴀɪʟᴇᴅ ᴛʜᴇ ʀᴏʙ
┃
┃➠ 👮 ᴄᴏᴘs ᴄᴀᴜɢʜᴛ ʏᴏᴜ
┃➠ 🚨 ᴊᴀɪʟ ᴛɪᴍᴇ: ${jailHours}ʜ
┃➠ 💸 ғɪɴᴇ: ${currencySymbol}${formatCash(fine)}
┃
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
╚═══════════════════╝`,
          mentions: [sender, target]
        }, { quoted: m })
      } catch (e) {
        await sock.sendMessage(from, {
          text: `╔═〘 🚨ᴄᴀᴜɢʜᴛ 〙═╗
┃➠ ᴊᴀɪʟ ᴛɪᴍᴇ: ${jailHours}ʜ
┃➠ ғɪɴᴇ: ${currencySymbol}${formatCash(fine)}
┃➠ ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
╚═══════════════════╝`,
          mentions: [sender, target]
        }, { quoted: m })
      }
    }
  }
}