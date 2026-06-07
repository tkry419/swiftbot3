/**
 * SwiftBot - plugins/commands/economy/shop.js
 * Group-Based Shop System with Items + Backgrounds
 * Uses db keys: eco_${groupJid}_shop_items, eco_${groupJid}_inv_${user}_${item}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// DEFAULT SHOP ITEMS + 30 BACKGROUNDS
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
  },

  // BACKGROUNDS - 30 THEMES FOR PROFILE
  'bg_cyber': {
    name: 'Cyber Background',
    price: 5000,
    desc: 'Unlock cyber theme for profile',
    emoji: '🎨',
    category: 'backgrounds',
    bgKey: 'cyber'
  },
  'bg_neon': {
    name: 'Neon Background',
    price: 5000,
    desc: 'Unlock neon theme for profile',
    emoji: '🎨',
    category: 'backgrounds',
    bgKey: 'neon'
  },
  'bg_sunset': {
    name: 'Sunset Background',
    price: 8000,
    desc: 'Unlock sunset theme for profile',
    emoji: '🌅',
    category: 'backgrounds',
    bgKey: 'sunset'
  },
  'bg_ocean': {
    name: 'Ocean Background',
    price: 8000,
    desc: 'Unlock ocean theme for profile',
    emoji: '🌊',
    category: 'backgrounds',
    bgKey: 'ocean'
  },
  'bg_forest': {
    name: 'Forest Background',
    price: 8000,
    desc: 'Unlock forest theme for profile',
    emoji: '🌲',
    category: 'backgrounds',
    bgKey: 'forest'
  },
  'bg_galaxy': {
    name: 'Galaxy Background',
    price: 15000,
    desc: 'Unlock galaxy theme for profile',
    emoji: '🌌',
    category: 'backgrounds',
    bgKey: 'galaxy'
  },
  'bg_fire': {
    name: 'Fire Background',
    price: 10000,
    desc: 'Unlock fire theme for profile',
    emoji: '🔥',
    category: 'backgrounds',
    bgKey: 'fire'
  },
  'bg_ice': {
    name: 'Ice Background',
    price: 10000,
    desc: 'Unlock ice theme for profile',
    emoji: '❄️',
    category: 'backgrounds',
    bgKey: 'ice'
  },
  'bg_gold': {
    name: 'Gold Background',
    price: 25000,
    desc: 'Unlock gold luxury theme',
    emoji: '👑',
    category: 'backgrounds',
    bgKey: 'gold'
  },
  'bg_silver': {
    name: 'Silver Background',
    price: 20000,
    desc: 'Unlock silver metal theme',
    emoji: '🥈',
    category: 'backgrounds',
    bgKey: 'silver'
  },
  'bg_purple': {
    name: 'Purple Background',
    price: 12000,
    desc: 'Unlock royal purple theme',
    emoji: '🟣',
    category: 'backgrounds',
    bgKey: 'purple'
  },
  'bg_red': {
    name: 'Red Background',
    price: 10000,
    desc: 'Unlock blood red theme',
    emoji: '🔴',
    category: 'backgrounds',
    bgKey: 'red'
  },
  'bg_blue': {
    name: 'Blue Background',
    price: 10000,
    desc: 'Unlock deep blue theme',
    emoji: '🔵',
    category: 'backgrounds',
    bgKey: 'blue'
  },
  'bg_green': {
    name: 'Green Background',
    price: 10000,
    desc: 'Unlock nature green theme',
    emoji: '🟢',
    category: 'backgrounds',
    bgKey: 'green'
  },
  'bg_pink': {
    name: 'Pink Background',
    price: 12000,
    desc: 'Unlock cute pink theme',
    emoji: '🩷',
    category: 'backgrounds',
    bgKey: 'pink'
  },
  'bg_orange': {
    name: 'Orange Background',
    price: 10000,
    desc: 'Unlock warm orange theme',
    emoji: '🟠',
    category: 'backgrounds',
    bgKey: 'orange'
  },
  'bg_teal': {
    name: 'Teal Background',
    price: 10000,
    desc: 'Unlock calm teal theme',
    emoji: '🩵',
    category: 'backgrounds',
    bgKey: 'teal'
  },
  'bg_void': {
    name: 'Void Background',
    price: 30000,
    desc: 'Unlock pure black void theme',
    emoji: '⚫',
    category: 'backgrounds',
    bgKey: 'void'
  },
  'bg_light': {
    name: 'Light Background',
    price: 15000,
    desc: 'Unlock minimal light theme',
    emoji: '⚪',
    category: 'backgrounds',
    bgKey: 'light'
  },
  'bg_rainbow': {
    name: 'Rainbow Background',
    price: 20000,
    desc: 'Unlock colorful rainbow theme',
    emoji: '🌈',
    category: 'backgrounds',
    bgKey: 'rainbow'
  },
  'bg_carbon': {
    name: 'Carbon Background',
    price: 18000,
    desc: 'Unlock carbon fiber theme',
    emoji: '⬛',
    category: 'backgrounds',
    bgKey: 'carbon'
  },
  'bg_diamond': {
    name: 'Diamond Background',
    price: 50000,
    desc: 'Unlock premium diamond theme',
    emoji: '💎',
    category: 'backgrounds',
    bgKey: 'diamond'
  },
  'bg_emerald': {
    name: 'Emerald Background',
    price: 40000,
    desc: 'Unlock emerald jewel theme',
    emoji: '💚',
    category: 'backgrounds',
    bgKey: 'emerald'
  },
  'bg_ruby': {
    name: 'Ruby Background',
    price: 40000,
    desc: 'Unlock ruby stone theme',
    emoji: '❤️',
    category: 'backgrounds',
    bgKey: 'ruby'
  },
  'bg_sapphire': {
    name: 'Sapphire Background',
    price: 40000,
    desc: 'Unlock sapphire crystal theme',
    emoji: '💙',
    category: 'backgrounds',
    bgKey: 'sapphire'
  },
  'bg_cosmic': {
    name: 'Cosmic Background',
    price: 35000,
    desc: 'Unlock cosmic space theme',
    emoji: '🌠',
    category: 'backgrounds',
    bgKey: 'cosmic'
  },
  'bg_toxic': {
    name: 'Toxic Background',
    price: 15000,
    desc: 'Unlock toxic poison theme',
    emoji: '☢️',
    category: 'backgrounds',
    bgKey: 'toxic'
  },
  'bg_vintage': {
    name: 'Vintage Background',
    price: 12000,
    desc: 'Unlock retro vintage theme',
    emoji: '📻',
    category: 'backgrounds',
    bgKey: 'vintage'
  },
  'bg_future': {
    name: 'Future Background',
    price: 30000,
    desc: 'Unlock futuristic tech theme',
    emoji: '🚀',
    category: 'backgrounds',
    bgKey: 'future'
  }
}

export default {
  name: 'shop',
  alias: ['store', 'market', 'buy'],
  desc: 'View shop or buy items and backgrounds',
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
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}shop buy bg_galaxy
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
┃➠ ɴᴏ sʜᴏᴘᴘɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      // 7. CHECK IF ALREADY OWN BACKGROUND
      if (item.bgKey) {
        const ownedBg = await db.get(`eco_${groupId}_bg_${sender}`)
        if (ownedBg === item.bgKey) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ᴏᴡɴᴇᴅ
┃
┃➠ ʙᴀᴄᴋɢʀᴏᴜɴᴅ: ${item.name}
┃➠ ᴜsᴇ ${prefix}profile ᴛᴏ ᴠɪᴇᴡ
╚═══════════════════╝`
          }, { quoted: m })
        }
      }

      // 8. CHECK IF ENOUGH MONEY
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

      // 9. PROCESS PURCHASE
      const newBalance = currentBalance - totalCost
      const newInv = currentInv + amount

      await Promise.all([
        db.set(balanceKey, newBalance),
        db.set(invKey, newInv)
      ])

      // 10. IF BACKGROUND, AUTO-APPLY
      if (item.bgKey) {
        await db.set(`eco_${groupId}_bg_${sender}`, item.bgKey)
        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜɴʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ᴛʀᴀɴsᴀᴄᴛɪᴏɴ sᴜᴄᴄᴇss
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${item.emoji} ʙᴀᴄᴋɢʀᴏᴜɴᴅ: ${item.name}
┃➠ 💰 ᴘᴀɪᴅ: ${currency}${formatCash(totalCost)}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(newBalance)}
┃
┃➠ ✅ ᴀᴜᴛᴏ-ᴀᴘᴘʟɪᴇᴅ ᴛᴏ ᴘʀᴏғɪʟᴇ
┃➠ 📝 ${item.desc}
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ${prefix}profile - View new theme
┃➠ ${prefix}inv - Check inventory
╰━━━━━━━━━━━━━━━━━⊷`
        }, { quoted: m })
      }

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

    // 10. SHOP DISPLAY MODE - GROUPED BY CATEGORY
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

    const catOrder = ['tools', 'weapons', 'defense', 'luxury', 'property', 'backgrounds']
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
┃➠ ${prefix}shop buy bg_galaxy
┃
┃➠ ${prefix}inv - Your items
┃➠ ${prefix}profile - View theme
╰━━━━━━━━━━━━━━━━━⊷`

    await sock.sendMessage(from, { text: shopText }, { quoted: m })
  }
}