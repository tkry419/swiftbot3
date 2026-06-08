/**
 * SwiftBot - plugins/commands/economy/shop.js
 * Group-Based Item Shop Display
 * Shows items + backgrounds with card image
 * Uses db keys: eco_${groupJid}_shop_items
 */

import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_DIR = path.join(__dirname, 'assets')

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// DEFAULT ITEMS - NO BACKGROUNDS HARDCODED
const DEFAULT_ITEMS = {
  // TOOLS
  'pickaxe': { name: 'Pickaxe ⛏️', price: 5000, desc: 'Mine more cash with work', emoji: '⛏️', category: 'tools' },
  'laptop': { name: 'Laptop 💻', price: 15000, desc: 'Hack for bigger rewards +15% success', emoji: '💻', category: 'tools' },
  // DEFENSE
  'shield': { name: 'Shield 🛡️', price: 8000, desc: 'Protect from rob 50%', emoji: '🛡️', category: 'defense' },
  // WEAPONS
  'sword': { name: 'Sword ⚔️', price: 10000, desc: 'Increase rob success 10%', emoji: '⚔️', category: 'weapons' },
  // LUXURY
  'car': { name: 'Sports Car 🏎️', price: 50000, desc: 'Flex on poor people', emoji: '🏎️', category: 'luxury' },
  'phone': { name: 'iPhone 16 📱', price: 12000, desc: 'Social media clout', emoji: '📱', category: 'luxury' },
  'ring': { name: 'Diamond Ring 💍', price: 25000, desc: 'Marry someone rich', emoji: '💍', category: 'luxury' },
  // PROPERTY
  'house': { name: 'Mansion 🏠', price: 100000, desc: 'Passive income +500/day', emoji: '🏠', category: 'property' }
}

const escapeXml = (str) => {
  return String(str)
.replace(/&/g, '&amp;')
.replace(/</g, '&lt;')
.replace(/>/g, '&gt;')
.replace(/"/g, '&quot;')
.replace(/'/g, '&apos;')
}

const generateShopCard = async (items, currency, bgKey = 'default') => {
  // Load background
  let bgBuffer = null
  const bgPath = path.join(ASSETS_DIR, `${bgKey}.png`)
  const bgFramePath = path.join(ASSETS_DIR, `${bgKey}_frame.png`)

  if (fs.existsSync(bgFramePath)) {
    bgBuffer = await sharp(bgFramePath).resize(800, 600, { fit: 'cover' }).png().toBuffer()
  } else if (fs.existsSync(bgPath)) {
    bgBuffer = await sharp(bgPath).resize(800, 600, { fit: 'cover' }).png().toBuffer()
  }

  let itemsText = ''
  let yPos = 120
  const categories = [...new Set(items.map(i => i.category))]

  for (const cat of categories) {
    const catItems = items.filter(i => i.category === cat)
    if (catItems.length === 0) continue

    itemsText += `<text x="50" y="${yPos}" font-family="Arial Black" font-size="24" fill="#00E676">${cat.toUpperCase()}</text>`
    yPos += 35

    for (const item of catItems) {
      itemsText += `<text x="70" y="${yPos}" font-family="Arial" font-size="20" fill="#fff">${item.emoji} ${escapeXml(item.name)} - ${currency}${formatCash(item.price)}</text>`
      itemsText += `<text x="90" y="${yPos + 20}" font-family="Arial" font-size="14" fill="#aaa">${escapeXml(item.desc)}</text>`
      yPos += 45
      if (yPos > 540) break
    }
    yPos += 10
    if (yPos > 540) break
  }

  const svg = `
<svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#000;stop-opacity:0.5" />
      <stop offset="100%" style="stop-color:#000;stop-opacity:0.9" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="800" height="600" fill="url(#overlay)"/>

  <!-- Title -->
  <text x="400" y="60" font-family="Arial Black" font-size="42" fill="#fff" text-anchor="middle" filter="url(#glow)">🛒 ECONOMY SHOP</text>
  <text x="400" y="90" font-family="Arial" font-size="18" fill="#00E676" text-anchor="middle">Use.buy &lt;item&gt; to purchase</text>

  ${itemsText}
</svg>`

  let composite = [{ input: Buffer.from(svg), top: 0, left: 0 }]
  if (bgBuffer) {
    composite.unshift({ input: bgBuffer, top: 0, left: 0 })
  }

  return await sharp({
    create: { width: 800, height: 600, channels: 4, background: '#0f1e' }
  })
.composite(composite)
.png()
.toBuffer()
}

export default {
  name: 'shop',
  alias: ['store', 'market'],
  desc: 'View economy shop items',
  usage: '[category]',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED
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
    const category = args[0]?.toLowerCase()
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 2. LOAD SHOP ITEMS
    const customShop = await db.get(`eco_${groupId}_shop_items`) || {}
    const SHOP_ITEMS = {...DEFAULT_ITEMS,...customShop }

    // 3. FILTER BY CATEGORY
    let items = Object.entries(SHOP_ITEMS).map(([key, item]) => ({...item, key }))
    if (category) {
      items = items.filter(item => item.category === category)
      if (items.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄᴀᴛᴇɢᴏʀʏ ɴᴏᴛ ғᴏᴜɴᴅ
┃➠ ᴜsᴇ: ${prefix}shop
┃➠ ᴄᴀᴛᴇɢᴏʀɪᴇs: tools, defense, weapons, luxury, property
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 4. GET BACKGROUND THEME
    const bgTheme = await db.get(`eco_${groupId}_bg_${groupId}`) || 'default'

    // 5. GENERATE SHOP CARD IMAGE
    try {
      const cardImage = await generateShopCard(items, currency, bgTheme)

      let textMsg = `╔═〘 🛒sʜᴏᴘ 〙═╗
┃➠ ᴄᴀᴛᴇɢᴏʀʏ: ${category || 'ALL'}
┃➠ ɪᴛᴇᴍs: ${items.length}
╚═══════════════════╝

╭━━━━❮ ʜᴏᴡ ᴛᴏ ʙᴜʏ ❯━⊷
┃➠ ${prefix}buy <item> [amount]
┃➠ ᴇx: ${prefix}buy pickaxe
┃➠ ᴇx: ${prefix}buy laptop 2
╰━━━━━━━━━━━━━━━━━⊷`

      await sock.sendMessage(from, {
        image: cardImage,
        caption: textMsg
      }, { quoted: m })

    } catch (e) {
      // Fallback to text
      let textMsg = `╔═〘 🛒ᴇᴄᴏɴᴏᴍʏ sʜᴏᴘ 〙═╗
┃➠ ᴄᴀᴛᴇɢᴏʀʏ: ${category || 'ALL'}
╚═══════════════════╝\n\n`

      const categories = [...new Set(items.map(i => i.category))]
      for (const cat of categories) {
        const catItems = items.filter(i => i.category === cat)
        textMsg += `╭━━━━❮ ${cat.toUpperCase()} ❯━⊷\n`
        for (const item of catItems) {
          textMsg += `┃➠ ${item.emoji} ${item.name} - ${currency}${formatCash(item.price)}\n`
          textMsg += `┃ └─ ${item.desc}\n`
        }
        textMsg += `╰━━━━━━━━━━━━━━━━━⊷\n\n`
      }

      textMsg += `╭━━━━❮ ʜᴏᴡ ᴛᴏ ʙᴜʏ ❯━⊷
┃➠ ${prefix}buy <item> [amount]
┃➠ ᴇx: ${prefix}buy pickaxe
┃➠ ᴇx: ${prefix}buy laptop 2
╰━━━━━━━━━━━━━━━━━⊷`

      await sock.sendMessage(from, { text: textMsg }, { quoted: m })
    }
  }
}