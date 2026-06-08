/**
 * SwiftBot - plugins/commands/economy/bg.js
 * Background Theme System - Auto-reads from assets.js
 * Uses db keys: eco_${groupJid}_bg_${user}, eco_${groupJid}_owned_bg_${user}_${bgKey}
 */

import sharp from 'sharp'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_PATH = path.join(__dirname, 'assets.js')
const ASSETS_DIR = path.join(__dirname, 'assets')

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// FALLBACK BACKGROUNDS IF assets.js FAILS
const FALLBACK_BACKGROUNDS = {
  'default': {
    id: 'default',
    name: 'Default',
    price: 0,
    tier: 'common',
    glow: '#ffffff',
    type: 'static'
  },
  'cyber': {
    id: 'cyber',
    name: 'Cyber',
    price: 5000,
    tier: 'rare',
    glow: '#00ffff',
    type: 'static'
  },
  'fire': {
    id: 'fire',
    name: 'Fire',
    price: 10000,
    tier: 'epic',
    glow: '#ff4500',
    type: 'static'
  }
}

const loadBackgrounds = async () => {
  try {
    if (fs.existsSync(ASSETS_PATH)) {
      const { default: ASSETS } = await import(`./assets.js?update=${Date.now()}`)
      // Filter only backgrounds, add default if missing
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

const generateBgPreview = async (sock, sender, bgKey, bgData, owned = false) => {
  let pfpBuffer
  try {
    const pfpUrl = await sock.profilePictureUrl(sender, 'image')
    const res = await axios.get(pfpUrl, { responseType: 'arraybuffer' })
    pfpBuffer = Buffer.from(res.data)
  } catch {
    pfpBuffer = await sharp({
      create: {
        width: 140,
        height: 140,
        channels: 4,
        background: { r: 80, g: 80, b: 200, alpha: 1 }
      }
    }).png().toBuffer()
  }

  const pfpCircle = await sharp(pfpBuffer)
  .resize(140, 140)
  .composite([{
      input: Buffer.from(`<svg><circle cx="70" cy="70" r="70"/></svg>`),
      blend: 'dest-in'
    }])
  .png()
  .toBuffer()

  // Try to load actual bg image if exists
  let bgLayer = null
  const bgPath = path.join(ASSETS_DIR, `${bgKey}.png`)
  const bgFramePath = path.join(ASSETS_DIR, `${bgKey}_frame.png`)

  if (fs.existsSync(bgFramePath)) {
    bgLayer = await sharp(bgFramePath).resize(800, 400).png().toBuffer()
  } else if (fs.existsSync(bgPath)) {
    bgLayer = await sharp(bgPath).resize(800, 400).png().toBuffer()
  }

  const glow = bgData.glow || '#ffffff'
  const svg = `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.3" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.7" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  ${bgLayer? '' : `<rect width="800" height="400" fill="#1a1a2e"/>`}
  <rect width="800" height="400" fill="url(#overlay)"/>

  <!-- Tier badge -->
  <rect x="20" y="20" width="120" height="40" rx="20" fill="${glow}" opacity="0.9"/>
  <text x="80" y="45" font-family="Arial Black" font-size="18" fill="#000" text-anchor="middle">${bgData.tier?.toUpperCase() || 'COMMON'}</text>

  <!-- Title -->
  <text x="400" y="60" font-family="Arial Black" font-size="42" fill="${glow}" text-anchor="middle" filter="url(#glow)">${bgData.name}</text>

  <!-- Price or Owned -->
  <text x="400" y="100" font-family="Arial" font-size="28" fill="#fff" text-anchor="middle">${owned? '✓ OWNED' : `$${formatCash(bgData.price)}`}</text>

  <!-- Type badge -->
  <text x="400" y="360" font-family="Arial" font-size="16" fill="#aaa" text-anchor="middle">${bgData.type === 'animated'? '🎬 ANIMATED' : '🖼️ STATIC'}</text>
</svg>`

  let composite = [{ input: Buffer.from(svg), top: 0, left: 0 }]

  if (bgLayer) {
    composite.unshift({ input: bgLayer, top: 0, left: 0 })
  }

  composite.push({ input: pfpCircle, top: 180, left: 330 })

  const final = await sharp({
    create: { width: 800, height: 400, channels: 4, background: '#1a1a2e' }
  })
  .composite(composite)
  .png()
  .toBuffer()

  return final
}

export default {
  name: 'bg',
  alias: ['background', 'theme'],
  desc: 'View, buy, or equip profile backgrounds',
  usage: '[list/buy/use] <bg_name>',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

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

    // 2. LOAD BACKGROUNDS FROM ASSETS.JS OR FALLBACK
    const BACKGROUNDS = await loadBackgrounds()

    // 3. GET USER DATA
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const currentBgKey = `eco_${groupId}_bg_${sender}`
    const [balance, currentBg] = await Promise.all([
      db.get(balanceKey),
      db.get(currentBgKey)
    ])
    const currentBalance = balance || 0
    const equippedBg = currentBg || 'default'

    // 4. LIST MODE
    if (!args[0] || args[0].toLowerCase() === 'list') {
      const ownedBgs = []
      for (const bgKey of Object.keys(BACKGROUNDS)) {
        const owned = await db.get(`eco_${groupId}_owned_bg_${sender}_${bgKey}`)
        if (owned || bgKey === 'default') ownedBgs.push(bgKey)
      }

      let listText = `╔═〘 🎨ʙᴀᴄᴋɢʀᴏᴜɴᴅs 〙═╗
┃➠ ᴇǫᴜɪᴘᴘᴇᴅ: ${BACKGROUNDS[equippedBg]?.name || 'Default'}
┃➠ 💰 ᴄᴀsʜ: ${currency}${formatCash(currentBalance)}
┃
`

      const tiers = {}
      Object.entries(BACKGROUNDS).forEach(([key, bg]) => {
        const tier = bg.tier || 'common'
        if (!tiers[tier]) tiers[tier] = []
        tiers[tier].push({ key,...bg, owned: ownedBgs.includes(key) })
      })

      const tierOrder = ['legendary', 'epic', 'rare', 'common']
      tierOrder.forEach(tier => {
        if (tiers[tier]) {
          listText += `┃➠ ━━━ ${tier.toUpperCase()} ━━━\n`
          tiers[tier].forEach(bg => {
            const status = bg.owned? '✅' : bg.price === 0? '🆓' : `💰${formatCash(bg.price)}`
            const equipped = bg.key === equippedBg? ' 👑' : ''
            listText += `┃➠ ${bg.name}${equipped}\n┃➠ ${status} | ${bg.type}\n┃\n`
          })
        }
      })

      listText += `╚═══════════════════╝

╭━━━━❮ ᴜsᴀɢᴇ ❯━⊷
┃➠ ${prefix}bg buy <name> - Buy theme
┃➠ ${prefix}bg use <name> - Equip theme
┃➠ ${prefix}bg view <name> - Preview
╰━━━━━━━━━━━━━━━━━⊷`

      return await sock.sendMessage(from, { text: listText }, { quoted: m })
    }

    const action = args[0].toLowerCase()
    const bgKey = args[1]?.toLowerCase()

    // 5. VIEW MODE - SHOW PREVIEW
    if (action === 'view') {
      if (!bgKey ||!BACKGROUNDS[bgKey]) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʙᴀᴄᴋɢʀᴏᴜɴᴅ ɴᴏᴛ ғᴏᴜɴᴅ
┃
┃➠ ᴜsᴇ ${prefix}bg list ᴛᴏ sᴇᴇ ᴀʟʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const bgData = BACKGROUNDS[bgKey]
      const owned = await db.get(`eco_${groupId}_owned_bg_${sender}_${bgKey}`)

      try {
        const preview = await generateBgPreview(sock, sender, bgKey, bgData, owned || bgKey === 'default')
        return await sock.sendMessage(from, {
          image: preview,
          caption: `🎨 *${bgData.name}*\n💰 Price: ${currency}${formatCash(bgData.price)}\n⭐ Tier: ${bgData.tier}\n${owned || bgKey === 'default'? '✅ Owned' : '❌ Not Owned'}`
        }, { quoted: m })
      } catch (e) {
        return await sock.sendMessage(from, {
          text: `🎨 *${bgData.name}*\n💰 Price: ${currency}${formatCash(bgData.price)}\n⭐ Tier: ${bgData.tier}`
        }, { quoted: m })
      }
    }

    // 6. BUY MODE
    if (action === 'buy') {
      if (!bgKey ||!BACKGROUNDS[bgKey]) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʙᴀᴄᴋɢʀᴏᴜɴᴅ ɴᴏᴛ ғᴏᴜɴᴅ
┃
┃➠ ᴜsᴇ ${prefix}bg list ᴛᴏ sᴇᴇ ᴀʟʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const bgData = BACKGROUNDS[bgKey]
      const ownedKey = `eco_${groupId}_owned_bg_${sender}_${bgKey}`
      const owned = await db.get(ownedKey)

      if (owned || bgKey === 'default') {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ᴏᴡɴᴇᴅ
┃
┃➠ ʙᴀᴄᴋɢʀᴏᴜɴᴅ: ${bgData.name}
┃➠ ᴜsᴇ ${prefix}bg use ${bgKey}
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (currentBalance < bgData.price) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ᴄᴀsʜ: ${currency}${formatCash(currentBalance)}
┃➠ 🛒 ᴄᴏsᴛ: ${currency}${formatCash(bgData.price)}
┃➠ ɴᴇᴅ: ${currency}${formatCash(bgData.price - currentBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
        }, { quoted: m })
      }

      await Promise.all([
        db.set(balanceKey, currentBalance - bgData.price),
        db.set(ownedKey, true),
        db.set(currentBgKey, bgKey) // auto-equip
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴜɴʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ᴛʀᴀɴsᴀᴄᴛɪᴏɴ sᴜᴄᴇss
┃
┃➠ 🎨 ʙᴀᴄᴋɢʀᴏᴜɴᴅ: ${bgData.name}
┃➠ 💰 ᴘᴀɪᴅ: ${currency}${formatCash(bgData.price)}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(currentBalance - bgData.price)}
┃
┃➠ ✅ ᴀᴜᴛᴏ-ᴇǫᴜɪᴘᴘᴇᴅ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ${prefix}profile - View new theme
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    // 7. USE/EQUIP MODE
    if (action === 'use' || action === 'equip') {
      if (!bgKey ||!BACKGROUNDS[bgKey]) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʙᴀᴄᴋɢʀᴏᴜɴᴅ ɴᴏᴛ ғᴏᴜɴᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const owned = await db.get(`eco_${groupId}_owned_bg_${sender}_${bgKey}`)
      if (!owned && bgKey!== 'default') {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴏᴡɴᴇᴅ
┃
┃➠ ʙᴜʏ ғɪʀsᴛ: ${prefix}bg buy ${bgKey}
╚═══════════════════╝`
        }, { quoted: m })
      }

      await db.set(currentBgKey, bgKey)
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴇǫᴜɪᴘᴘᴇᴅ 〙═╗
┃➠ ʙᴀᴄᴋɢʀᴏᴜɴᴅ: ${BACKGROUNDS[bgKey].name}
┃➠ ᴜsᴇ ${prefix}profile ᴛᴏ ᴠɪᴇᴡ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // Invalid action
    await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴄᴛɪᴏɴ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}bg [list/buy/use/view]
╚═══════════════════╝`
    }, { quoted: m })
  }
}