/**
 * SwiftBot - plugins/commands/economy/leaderboard.js
 * Group-Based SVG Leaderboard with Profile Pictures - Using SHARP
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_bank_${user}
 */

import sharp from 'sharp'
import Jimp from 'jimp'
import axios from 'axios'

const formatCash = (num) => {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B'
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
  return Number(num || 0).toLocaleString('en-US')
}

const getGlowColor = (rank) => {
  const colors = ['#FFD700', '#C0C0C0', '#CD7F32', '#4FC3F7', '#AB47BC']
  return colors[rank] || '#00E676'
}

const downloadAndRoundPfp = async (url) => {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' })
    const buffer = Buffer.from(response.data)
    const image = await Jimp.read(buffer)
    image.resize(56, 56)
    image.circle()
    return await image.getBufferAsync(Jimp.MIME_PNG)
  } catch {
    // Default avatar if fail
    const image = await Jimp.read('https://i.imgur.com/2wOJD6K.png')
    image.resize(56, 56)
    image.circle()
    return await image.getBufferAsync(Jimp.MIME_PNG)
  }
}

const generateLeaderboardSVG = (users, groupName, currency) => {
  const width = 800
  const height = 600
  const topUsers = users.slice(0, 5)

  let svgContent = `
<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bgGlow" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#1a1a2e" />
      <stop offset="100%" stop-color="#0f0f1e" />
    </radialGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="100%" height="100%" fill="url(#bgGlow)"/>
  <circle cx="100" cy="100" r="150" fill="#00E676" opacity="0.05"/>
  <circle cx="700" cy="500" r="200" fill="#4FC3F7" opacity="0.05"/>

  <text x="400" y="60" font-family="Arial Black" font-size="36" fill="#fff" text-anchor="middle">🏆 LEADERBOARD 🏆</text>
  <text x="400" y="90" font-family="Arial" font-size="18" fill="#00E676" text-anchor="middle">${groupName}</text>`

  topUsers.forEach((user, index) => {
    const y = 140 + index * 90
    const glowColor = getGlowColor(index)
    const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index]

    svgContent += `
  <rect x="50" y="${y}" width="700" height="75" rx="15" fill="#1e1e2e" stroke="${glowColor}" stroke-width="2" opacity="0.9"/>
  <text x="90" y="${y + 48}" font-family="Arial Black" font-size="32" fill="${glowColor}">${medal}</text>
  <circle cx="170" cy="${y + 37}" r="30" fill="${glowColor}" opacity="0.3"/>
  <circle cx="170" cy="${y + 37}" r="28" fill="none" stroke="${glowColor}" stroke-width="2"/>
  <text x="220" y="${y + 32}" font-family="Arial" font-size="22" fill="#fff" font-weight="bold">${user.name.slice(0, 20)}</text>
  <text x="220" y="${y + 58}" font-family="Arial" font-size="16" fill="${glowColor}">💰 ${currency}${formatCash(user.total)}</text>
  <text x="550" y="${y + 32}" font-family="Arial" font-size="14" fill="#888" text-anchor="end">Cash: ${currency}${formatCash(user.balance)}</text>
  <text x="550" y="${y + 58}" font-family="Arial" font-size="14" fill="#888" text-anchor="end">Bank: ${currency}${formatCash(user.bank)}</text>
  <rect x="680" y="${y + 20}" width="50" height="35" rx="10" fill="${glowColor}" opacity="0.2"/>
  <text x="705" y="${y + 43}" font-family="Arial Black" font-size="20" fill="${glowColor}" text-anchor="middle">#${index + 1}</text>`
  })

  svgContent += `
  <text x="400" y="580" font-family="Arial" font-size="12" fill="#555" text-anchor="middle">Swift Tech Economy System</text>
</svg>`

  return svgContent
}

export default {
  name: 'leaderboard',
  alias: ['lb', 'top', 'rich', 'ranks'],
  desc: 'Show top 5 richest users with SVG leaderboard',
  usage: '',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED
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
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 2. GET ALL USERS DATA
    let groupName = 'Global'
    let participants = []

    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
        participants = groupMetadata.participants.map(p => p.id)
      } catch {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ɢʀᴏᴜᴘ ᴅᴀᴛᴀ
╚═══════════════════╝`
        }, { quoted: m })
      }
    } else {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛʜɪs ᴄᴏᴍᴀɴᴅ ᴡᴏʀᴋs
┃➠ ɪɴ ɢʀᴏᴜᴘs ᴏɴʟʏ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. FETCH ALL BALANCES & BANK
    const userPromises = participants.map(async (userJid) => {
      const [balance, bank, pushname] = await Promise.all([
        db.get(`eco_${groupId}_balance_${userJid}`),
        db.get(`eco_${groupId}_bank_${userJid}`),
        db.get(`pushname_${userJid}`)
      ])

      const total = (balance || 0) + (bank || 0)

      // Get profile picture
      let pfp = 'https://i.imgur.com/2wOJD6K.png'
      try {
        pfp = await sock.profilePictureUrl(userJid, 'image')
      } catch {}

      return {
        jid: userJid,
        name: pushname || userJid.split('@')[0],
        balance: balance || 0,
        bank: bank || 0,
        total,
        pfp
      }
    })

    const allUsers = await Promise.all(userPromises)

    // 4. SORT BY TOTAL WEALTH
    const sortedUsers = allUsers
    .filter(u => u.total > 0)
    .sort((a, b) => b.total - a.total)

    if (sortedUsers.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 📊ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ 〙═╗
┃➠ ɴᴏ ᴅᴀᴛᴀ ʏᴇᴛ
┃
┃➠ ɴᴏʙᴏᴅʏ ʜᴀs ᴍᴏɴᴇʏ
┃➠ ᴜsᴇ ${prefix}work ᴛᴏ sᴛᴀʀᴛ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. GENERATE BASE SVG
    const top5 = sortedUsers.slice(0, 5)
    const svg = generateLeaderboardSVG(top5, groupName, currency)

    // 6. CONVERT SVG TO PNG USING SHARP
    let buffer = await sharp(Buffer.from(svg)).png().toBuffer()

    // 7. OVERLAY PROFILE PICTURES USING SHARP COMPOSITE
    const compositeOps = []
    for (let i = 0; i < top5.length; i++) {
      const user = top5[i]
      const y = 140 + i * 90
      try {
        const pfpBuffer = await downloadAndRoundPfp(user.pfp)
        compositeOps.push({
          input: pfpBuffer,
          top: y + 9,
          left: 142
        })
      } catch {}
    }

    if (compositeOps.length > 0) {
      buffer = await sharp(buffer)
      .composite(compositeOps)
      .png()
      .toBuffer()
    }

    // 8. SEND IMAGE + TEXT
    let textLB = `╔═〘 🏆ʟᴇᴀᴅᴇʀʙᴏᴀʀᴅ 〙═╗
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
`

    top5.forEach((user, i) => {
      const medal = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i]
      const name = user.name.length > 15? user.name.slice(0, 15) + '...' : user.name
      textLB += `┃➠ ${medal} ${name}\n┃➠ 💰 ${currency}${formatCash(user.total)}\n┃\n`
    })

    textLB += `╚═══════════════════╝`

    await sock.sendMessage(from, {
      image: buffer,
      caption: textLB,
      mentions: top5.map(u => u.jid)
    }, { quoted: m })
  }
}