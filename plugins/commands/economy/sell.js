/**
 * SwiftBot - plugins/commands/economy/sell.js
 * Group-Based Marketplace Listing - Simple Numeric IDs
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_market_list
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// DEFAULT ITEMS - Same as shop.js
const DEFAULT_ITEMS = {
  'pickaxe': {
    name: 'Pickaxe ⛏️',
    price: 5000,
    emoji: '⛏️',
    category: 'tools'
  },
  'laptop': {
    name: 'Laptop 💻',
    price: 15000,
    emoji: '💻',
    category: 'tools'
  },
  'shield': {
    name: 'Shield 🛡️',
    price: 8000,
    emoji: '🛡️',
    category: 'defense'
  },
  'sword': {
    name: 'Sword ⚔️',
    price: 10000,
    emoji: '⚔️',
    category: 'weapons'
  },
  'car': {
    name: 'Sports Car 🏎️',
    price: 50000,
    emoji: '🏎️',
    category: 'luxury'
  },
  'house': {
    name: 'Mansion 🏠',
    price: 100000,
    emoji: '🏠',
    category: 'property'
  },
  'phone': {
    name: 'iPhone 16 📱',
    price: 12000,
    emoji: '📱',
    category: 'luxury'
  },
  'ring': {
    name: 'Diamond Ring 💍',
    price: 25000,
    emoji: '💍',
    category: 'luxury'
  },
  // BACKGROUNDS - NOW SELLABLE
  'bg_cyber': { name: 'Cyber Background', price: 5000, emoji: '🎨', category: 'backgrounds', bgKey: 'cyber' },
  'bg_neon': { name: 'Neon Background', price: 5000, emoji: '🎨', category: 'backgrounds', bgKey: 'neon' },
  'bg_sunset': { name: 'Sunset Background', price: 8000, emoji: '🌅', category: 'backgrounds', bgKey: 'sunset' },
  'bg_ocean': { name: 'Ocean Background', price: 8000, emoji: '🌊', category: 'backgrounds', bgKey: 'ocean' },
  'bg_forest': { name: 'Forest Background', price: 8000, emoji: '🌲', category: 'backgrounds', bgKey: 'forest' },
  'bg_galaxy': { name: 'Galaxy Background', price: 15000, emoji: '🌌', category: 'backgrounds', bgKey: 'galaxy' },
  'bg_fire': { name: 'Fire Background', price: 10000, emoji: '🔥', category: 'backgrounds', bgKey: 'fire' },
  'bg_ice': { name: 'Ice Background', price: 10000, emoji: '❄️', category: 'backgrounds', bgKey: 'ice' },
  'bg_gold': { name: 'Gold Background', price: 25000, emoji: '👑', category: 'backgrounds', bgKey: 'gold' },
  'bg_silver': { name: 'Silver Background', price: 20000, emoji: '🥈', category: 'backgrounds', bgKey: 'silver' },
  'bg_purple': { name: 'Purple Background', price: 12000, emoji: '🟣', category: 'backgrounds', bgKey: 'purple' },
  'bg_red': { name: 'Red Background', price: 10000, emoji: '🔴', category: 'backgrounds', bgKey: 'red' },
  'bg_blue': { name: 'Blue Background', price: 10000, emoji: '🔵', category: 'backgrounds', bgKey: 'blue' },
  'bg_green': { name: 'Green Background', price: 10000, emoji: '🟢', category: 'backgrounds', bgKey: 'green' },
  'bg_pink': { name: 'Pink Background', price: 12000, emoji: '🩷', category: 'backgrounds', bgKey: 'pink' },
  'bg_orange': { name: 'Orange Background', price: 10000, emoji: '🟠', category: 'backgrounds', bgKey: 'orange' },
  'bg_teal': { name: 'Teal Background', price: 10000, emoji: '🩵', category: 'backgrounds', bgKey: 'teal' },
  'bg_void': { name: 'Void Background', price: 30000, emoji: '⚫', category: 'backgrounds', bgKey: 'void' },
  'bg_light': { name: 'Light Background', price: 15000, emoji: '⚪', category: 'backgrounds', bgKey: 'light' },
  'bg_rainbow': { name: 'Rainbow Background', price: 20000, emoji: '🌈', category: 'backgrounds', bgKey: 'rainbow' },
  'bg_carbon': { name: 'Carbon Background', price: 18000, emoji: '⬛', category: 'backgrounds', bgKey: 'carbon' },
  'bg_diamond': { name: 'Diamond Background', price: 50000, emoji: '💎', category: 'backgrounds', bgKey: 'diamond' },
  'bg_emerald': { name: 'Emerald Background', price: 40000, emoji: '💚', category: 'backgrounds', bgKey: 'emerald' },
  'bg_ruby': { name: 'Ruby Background', price: 40000, emoji: '❤️', category: 'backgrounds', bgKey: 'ruby' },
  'bg_sapphire': { name: 'Sapphire Background', price: 40000, emoji: '💙', category: 'backgrounds', bgKey: 'sapphire' },
  'bg_cosmic': { name: 'Cosmic Background', price: 35000, emoji: '🌠', category: 'backgrounds', bgKey: 'cosmic' },
  'bg_toxic': { name: 'Toxic Background', price: 15000, emoji: '☢️', category: 'backgrounds', bgKey: 'toxic' },
  'bg_vintage': { name: 'Vintage Background', price: 12000, emoji: '📻', category: 'backgrounds', bgKey: 'vintage' },
  'bg_future': { name: 'Future Background', price: 30000, emoji: '🚀', category: 'backgrounds', bgKey: 'future' }
}

export default {
  name: 'sell',
  alias: ['list', 'market'],
  desc: 'List items on marketplace for others to buy - set your own price',
  usage: '<item> <amount> <price>',
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

    // 2. CHECK ITEM INPUT
    const itemKey = args[0]?.toLowerCase()
    if (!itemKey) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ɪᴛᴇᴍ ɴᴀᴍᴇ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}sell <item> <amount> <price>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}sell laptop 1 10000
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}sell bg_gold 1 20000
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}sell phone all 8000
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. LOAD CUSTOM SHOP ITEMS
    const groupId = isGroup? from : 'global'
    const customShop = await db.get(`eco_${groupId}_shop_items`) || {}
    const ALL_ITEMS = {...DEFAULT_ITEMS,...customShop }

    const itemData = ALL_ITEMS[itemKey]
    if (!itemData) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪᴛᴇᴍ ɴᴏᴛ ғᴏᴜɴᴅ
┃
┃➠ ɪᴛᴇᴍ: ${itemKey}
┃➠ ᴜsᴇ ${prefix}inv ᴛᴏ sᴇᴇ ʏᴏᴜʀ ɪᴛᴇᴍs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. DB KEYS - GROUP ISOLATED
    const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
    const jailKey = `eco_${groupId}_jail_${sender}`
    const marketListKey = `eco_${groupId}_market_list`

    // 5. FETCH DATA
    const [invCount, jailTime] = await Promise.all([
      db.get(invKey),
      db.get(jailKey)
    ])

    const currentInv = invCount || 0
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 6. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ sᴇʟɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. CHECK IF HAS ITEM
    if (currentInv <= 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʏᴏᴜ ᴅᴏɴ'ᴛ ʜᴀᴠᴇ ᴛʜɪs ɪᴛᴇᴍ
┃
┃➠ ɪᴛᴇᴍ: ${itemData.emoji} ${itemData.name}
┃➠ ʙᴜʏ ғʀᴏᴍ ${prefix}shop
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. PARSE AMOUNT & PRICE
    let amount = 1
    let price = null

    if (args[1]) {
      const arg = args[1].toLowerCase()
      if (arg === 'all' || arg === 'max') {
        amount = currentInv
      } else {
        amount = parseInt(arg)
        if (isNaN(amount) || amount <= 0) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴍᴜsᴛ ʙᴇ ᴘᴏsɪᴛɪᴠᴇ ɴᴜᴍʙᴇʀ
┃➠ ᴏʀ ᴜsᴇ: all
╚═══════════════════╝`
          }, { quoted: m })
        }
      }
    }

    if (!args[2]) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴘʀɪᴄᴇ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}sell ${itemKey} ${amount} <price>
┃➠ sᴜɢᴇsᴛᴇᴅ: ${currency}${formatCash(Math.floor(itemData.price * 0.6))}
╚═══════════════════╝`
      }, { quoted: m })
    }

    price = parseInt(args[2])
    if (isNaN(price) || price <= 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴘʀɪᴄᴇ
┃
┃➠ ᴍᴜsᴛ ʙᴇ ᴘᴏsɪᴛɪᴠᴇ ɴᴜᴍʙᴇʀ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 9. CHECK IF ENOUGH ITEMS
    if (amount > currentInv) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ɪᴛᴇᴍs
┃
┃➠ 📦 ʏᴏᴜ ʜᴀᴠᴇ: x${currentInv}
┃➠ 📤 ʏᴏᴜ ᴛʀɪᴇᴅ: x${amount}
┃➠ ɪᴛᴇᴍ: ${itemData.emoji} ${itemData.name}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 10. CREATE MARKETPLACE LISTING - SIMPLE NUMERIC ID
    const marketList = await db.get(marketListKey) || []
    const listingId = marketList.length + 1 // 1, 2, 3...

    const listing = {
      id: listingId,
      seller: sender,
      itemKey: itemKey,
      itemName: itemData.name,
      emoji: itemData.emoji,
      amount: amount,
      price: price,
      pricePerUnit: Math.floor(price / amount),
      originalPrice: itemData.price,
      timestamp: Date.now(),
      bgKey: itemData.bgKey || null
    }

    // 11. UPDATE DB - REMOVE FROM INV, ADD TO MARKET
    const newInv = currentInv - amount
    marketList.push(listing)

    await Promise.all([
      db.set(invKey, newInv),
      db.set(marketListKey, marketList)
    ])

    // 12. IF BACKGROUND, REMOVE FROM USER'S ACTIVE BG IF USING IT
    if (itemData.bgKey) {
      const currentBg = await db.get(`eco_${groupId}_bg_${sender}`)
      if (currentBg === itemData.bgKey) {
        await db.set(`eco_${groupId}_bg_${sender}`, 'default')
      }
    }

    // 13. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 14. SEND SUCCESS MESSAGE
    await sock.sendMessage(from, {
      text: `╔═〘 🏪ʟɪsᴛᴇᴅ 〙═╗
┃➠ ɪᴛᴇᴍ ʟɪsᴛᴇᴅ ᴏɴ ᴍᴀʀᴋᴇᴛ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${itemData.emoji} ɪᴛᴇᴍ: ${itemData.name}
┃➠ 📦 ǫᴜᴀɴᴛɪᴛʏ: x${amount}
┃➠ 💵 ᴘʀɪᴄᴇ ᴘᴇʀ ᴜɴɪᴛ: ${currency}${formatCash(listing.pricePerUnit)}
┃➠ 💰 ᴛᴏᴛᴀʟ ᴘʀɪᴄᴇ: ${currency}${formatCash(price)}
┃
┃➠ 📦 ʟᴇғᴛ ɪɴ ɪɴᴠ: ${newInv}
┃➠ 🆔 ʟɪsᴛɪɴɢ ɪᴅ: ${listingId}
┃
┃➠ ᴏᴛʜᴇʀs ᴄᴀɴ ɴᴏᴡ ʙᴜʏ ɪᴛ
╚═══════════════════╝

╭━━━━❮ ɪɴғᴏ ❯━⊷
┃➠ ᴏʀɪɢɪɴᴀʟ: ${currency}${formatCash(itemData.price)}
┃➠ ʏᴏᴜʀ ᴘʀɪᴄᴇ: ${currency}${formatCash(listing.pricePerUnit)}
┃➠ ᴜsᴇ ${prefix}market ᴛᴏ ᴠɪᴇᴡ ᴀʟʟ
┃➠ ᴜsᴇ ${prefix}pay ${listingId} ᴛᴏ ʙᴜʏ
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}