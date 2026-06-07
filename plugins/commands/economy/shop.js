/**
 * SwiftBot - plugins/commands/economy/shop.js
 * Group-Based Shop System with Items
 * Uses db keys: eco_${groupJid}_shop_${item}, eco_${groupJid}_inv_${user}_${item}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// DEFAULT SHOP ITEMS - Admin anaweza ongeza zaidi
const DEFAULT_ITEMS = {
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
    desc: 'Hack for bigger rewards',
    emoji: '💻',
    category: 'tools'
  },
  'shield': {
    name: 'Shield 🛡️',
    price: 8000,
    desc: 'Protect from rob 50%',
    emoji: '🛡️',
    category: 'defense'
  },
  'sword': {
    name: 'Sword ⚔️',
    price: 10000,
    desc: 'Increase rob success 10%',
    emoji: '⚔️',
    category: 'weapons'
  },
  'car': {
    name: 'Sports Car 🏎️',
    price: 50000,
    desc: 'Flex on poor people',
    emoji: '🏎️',
    category: 'luxury'
  },
  'house': {
    name: 'Mansion 🏠',
    price: 100000,
    desc: 'Passive income +500/day',
    emoji: '🏠',
    category: 'property'
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
  }
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
┃➠ ɴᴏ sʜᴏᴘᴘɪɴɢ ɪɴ ᴊᴀɪʟ
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
┃➠ ᴛʀᴀɴsᴀᴄᴛɪᴏɴ sᴜᴄᴄᴇss
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

    // 9. SHOP DISPLAY MODE
    let shopText = `╔═〘 🛒sʜᴏᴘ 〙═╗
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
`

    // Group by category
    const categories = {}
    Object.entries(SHOP_ITEMS).forEach(([key, item]) => {
      const cat = item.category || 'other'
      if (!categories[cat]) categories[cat] = []
      categories[cat].push({ key,...item })
    })

    Object.entries(categories).forEach(([cat, items]) => {
      const catName = cat.toUpperCase()
      shopText += `┃➠ ━━━ ${catName} ━━━\n`
      items.forEach(item => {
        shopText += `┃➠ ${item.emoji} ${item.name}\n`
        shopText += `┃➠ 💰 ${currency}${formatCash(item.price)} | ID: ${item.key}\n`
        shopText += `┃➠ ${item.desc}\n┃\n`
      })
    })

    shopText += `╚═══════════════════╝

╭━━━━❮ ʜᴏᴡ ᴛᴏ ʙᴜʏ ❯━⊷
┃➠ ${prefix}shop buy <item>
┃➠ ${prefix}shop buy pickaxe
┃➠ ${prefix}shop buy laptop 2
┃
┃➠ ${prefix}inv - Your items
╰━━━━━━━━━━━━━━━━━⊷`

    await sock.sendMessage(from, { text: shopText }, { quoted: m })
  }
}