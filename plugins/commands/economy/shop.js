/**
 * SwiftBot - plugins/commands/economy/shop.js
 * Group-Based Shop System - Tools Only
 * Uses db keys: eco_${groupJid}_shop_items, eco_${groupJid}_inv_${user}_${item}
 */

import sharp from 'sharp'
import axios from 'axios'

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// DEFAULT SHOP ITEMS - NO BACKGROUNDS
const DEFAULT_ITEMS = {
  // TOOLS
  'pickaxe': {
    name: 'Pickaxe ⛏️',
    price: 5000,
    desc: 'Mine more cash with work',
    emoji: '⛏️',
    category: 'tools'
  },
  'laptop': {
    name: 'Laptop 💻',
    price: 15000,
    desc: 'Hack for bigger rewards +15% success',
    emoji: '💻',
    category: 'tools'
  },
  // DEFENSE
  'shield': {
    name: 'Shield 🛡️',
    price: 8000,
    desc: 'Protect from rob 50%',
    emoji: '🛡️',
    category: 'defense'
  },
  // WEAPONS
  'sword': {
    name: 'Sword ⚔️',
    price: 10000,
    desc: 'Increase rob success 10%',
    emoji: '⚔️',
    category: 'weapons'
  },
  // LUXURY
  'car': {
    name: 'Sports Car 🏎️',
    price: 50000,
    desc: 'Flex on poor people',
    emoji: '🏎️',
    category: 'luxury'
  },
  'phone': {
    name: 'iPhone 16 📱',
    price: 12000,
    desc: 'Social media clout',
    emoji: '📱',
    category: 'luxury'
  },
  'ring': {
    name: 'Diamond Ring 💍',
    price: 25000,
    desc: 'Marry someone rich',
    emoji: '💍',
    category: 'luxury'
  },
  // PROPERTY
  'house': {
    name: 'Mansion 🏠',
    price: 100000,
    desc: 'Passive income +500/day',
    emoji: '🏠',
    category: 'property'
  }
}

const generateShopBanner = async (sock, sender, groupName) => {
  let pfpBuffer
  try {
    const pfpUrl = await sock.profilePictureUrl(sender, 'image')
    const res = await axios.get(pfpUrl, { responseType: 'arraybuffer' })
    pfpBuffer = Buffer.from(res.data)
  } catch {
    // fallback circle if no pfp
    pfpBuffer = await sharp({
      create: {
        width: 120,
        height: 120,
        channels: 4,
        background: { r: 100, g: 100, b: 255, alpha: 1 }
      }
    }).png().toBuffer()
  }

  const pfpCircle = await sharp(pfpBuffer)
   .resize(120, 120)
   .composite([{
      input: Buffer.from(`<svg><circle cx="60" cy="60" r="60"/></svg>`),
      blend: 'dest-in'
    }])
   .png()
   .toBuffer()

  const svg = `
<svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1a2e;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#16213e;stop-opacity:1" />
    </linearGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.5"/>
    </filter>
  </defs>

  <rect width="800" height="400" fill="url(#bg)"/>

  <!-- Decorative circles -->
  <circle cx="700" cy="100" r="80" fill="#0f3460" opacity="0.3"/>
  <circle cx="100" cy="300" r="60" fill="#533483" opacity="0.3"/>

  <!-- Title -->
  <text x="400" y="80" font-family="Arial Black" font-size="48" fill="#fff" text-anchor="middle" filter="url(#shadow)">🛒 WELCOME TO THE SHOP</text>

  <!-- Group name -->
  <text x="400" y="120" font-family="Arial" font-size="24" fill="#a0a0ff" text-anchor="middle">${groupName}</text>

  <!-- Line -->
  <line x1="200" y1="150" x2="600" y2="150" stroke="#533483" stroke-width="3"/>

  <!-- Bottom text -->
  <text x="400" y="350" font-family="Arial" font-size="20" fill="#888" text-anchor="middle">Use ${prefix}shop buy &lt;item&gt; to purchase</text>
</svg>`

  const banner = await sharp(Buffer.from(svg))
   .composite([{
      input: pfpCircle,
      top: 180,
      left: 340
    }])
   .png()
   .toBuffer()

  return banner
}

export default {
  name: 'shop',
  alias: ['store', 'market', 'buy'],
  desc: 'View shop or buy items',
  usage: '[buy] <item> [amount]',
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

    // 2. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 3. LOAD CUSTOM SHOP ITEMS FROM DB
    const customShop = await db.get(`eco_${groupId}_shop_items`) || {}
    const SHOP_ITEMS = {...DEFAULT_ITEMS,...customShop }

    // 4. BUY MODE
    if (args[0]?.toLowerCase() === 'buy') {
      const itemKey = args[1]?.toLowerCase()
      const amount = parseInt(args[2]) || 1

      if (!itemKey) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ɪᴛᴇᴍ ɴᴀᴍᴇ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}shop buy <item>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}shop buy pickaxe
╚═══════════════════╝`
        }, { quoted: m })
      }

      const item = SHOP_ITEMS[itemKey]
      if (!item) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪᴛᴇᴍ ɴᴏᴛ ғᴏᴜɴᴅ
┃
┃➠ ɪᴛᴇᴍ: ${itemKey}
┃➠ ᴜsᴇ ${prefix}shop ᴛᴏ sᴇᴇ ɪᴛᴇᴍs
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (amount <= 0 || amount > 100) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴍᴜsᴛ ʙᴇ 1-100
╚═══════════════════╝`
        }, { quoted: m })
      }

      // 5. CHECK BALANCE
      const balanceKey = `eco_${groupId}_balance_${sender}`
      const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
      const jailKey = `eco_${groupId}_jail_${sender}`

      const [balance, inventory, jailTime] = await Promise.all([
        db.get(balanceKey),
        db.get(invKey),
        db.get(jailKey)
      ])

      const currentBalance = balance || 0
      const currentInv = inventory || 0
      const totalCost = item.price * amount

      // 6. CHECK JAIL
      if (jailTime && Date.now() < jailTime) {
        const remaining = Math.ceil((jailTime - Date.now()) / 60000)
        return await sock.sendMessage(from, {
          text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ sʜᴏᴘɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      // 7. CHECK IF ENOUGH MONEY
      if (currentBalance < totalCost) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ᴄᴀsʜ: ${currency}${formatCash(currentBalance)}
┃➠ 🛒 ᴄᴏsᴛ: ${currency}${formatCash(totalCost)}
┃➠ 📦 ɪᴛᴇᴍ: ${item.name} x${amount}
┃
┃➠ ɴᴇᴅ: ${currency}${formatCash(totalCost - currentBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
        }, { quoted: m })
      }

      // 8. PROCESS PURCHASE
      const newBalance = currentBalance - totalCost
      const newInv = currentInv + amount

      await Promise.all([
        db.set(balanceKey, newBalance),
        db.set(invKey, newInv)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴘᴜʀᴄʜᴀsᴇᴅ 〙═╗
┃➠ ᴛʀᴀɴsᴀᴄᴛɪᴏɴ sᴜᴄᴇss
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${item.emoji} ɪᴛᴇᴍ: ${item.name}
┃➠ 📦 ǫᴜᴀɴᴛɪᴛʏ: x${amount}
┃➠ 💰 ᴛᴏᴛᴀʟ: ${currency}${formatCash(totalCost)}
┃
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(newBalance)}
┃➠ 📦 ɪɴᴠᴇɴᴛᴏʀʏ: ${newInv} ${item.name}
┃
┃➠ 📝 ${item.desc}
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ${prefix}inv - Check inventory
┃➠ ${prefix}use ${itemKey} - Use item
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    // 9. SHOP DISPLAY MODE - GENERATE SVG BANNER
    let bannerImage
    try {
      bannerImage = await generateShopBanner(sock, sender, groupName)
    } catch (e) {
      console.error('Shop banner error:', e)
    }

    let shopText = `╔═〘 🛒sʜᴏᴘ 〙═╗
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
`

    const categories = {}
    Object.entries(SHOP_ITEMS).forEach(([key, item]) => {
      const cat = item.category || 'other'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push({ key,...item })
    })

    const catOrder = ['tools', 'weapons', 'defense', 'luxury', 'property']
    catOrder.forEach(cat => {
      if (categories[cat]) {
        const catName = cat.toUpperCase()
        shopText += `┃➠ ━━━ ${catName} ━━━\n`
        categories[cat].forEach(item => {
          shopText += `┃➠ ${item.emoji} ${item.name}\n`
          shopText += `┃➠ 💰 ${currency}${formatCash(item.price)} | ID: ${item.key}\n`
          shopText += `┃➠ ${item.desc}\n┃\n`
        })
      }
    })

    shopText += `╚═══════════════════╝

╭━━━━❮ ʜᴏᴡ ᴛᴏ ʙᴜʏ ❯━⊷
┃➠ ${prefix}shop buy <item>
┃➠ ${prefix}shop buy pickaxe
┃➠ ${prefix}shop buy sword 2
┃
┃➠ ${prefix}inv - Your items
╰━━━━━━━━━━━━━━━━━⊷`

    if (bannerImage) {
      await sock.sendMessage(from, {
        image: bannerImage,
        caption: shopText
      }, { quoted: m })
    } else {
      await sock.sendMessage(from, { text: shopText }, { quoted: m })
    }
  }
}