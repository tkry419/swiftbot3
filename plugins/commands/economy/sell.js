/**
 * SwiftBot - plugins/commands/economy/sell.js
 * Group-Based Item Selling System - 60% Resale Value
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_balance_${user}
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
  }
}

export default {
  name: 'sell',
  alias: ['pawn', 'trade'],
  desc: 'Sell items from inventory - 60% resale value',
  usage: '<item> [amount | all]',
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
┃➠ ᴜsᴀɢᴇ: ${prefix}sell <item> [amount]
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}sell pickaxe
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}sell laptop all
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}sell phone 2
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
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 5. FETCH DATA
    const [invCount, balance, jailTime] = await Promise.all([
      db.get(invKey),
      db.get(balanceKey),
      db.get(jailKey)
    ])

    const currentInv = invCount || 0
    const currentBalance = balance || 0
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 6. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ sᴇʟʟɪɴɢ ɪɴ ᴊᴀɪʟ
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

    // 8. PARSE AMOUNT
    let amount = 1
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

    // 10. CALCULATE SELL PRICE - 60% of original
    const sellPrice = Math.floor(itemData.price * 0.6)
    const totalEarned = sellPrice * amount
    const newBalance = currentBalance + totalEarned
    const newInv = currentInv - amount

    // 11. UPDATE DB
    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(invKey, newInv)
    ])

    // 12. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 13. SEND SUCCESS MESSAGE
    await sock.sendMessage(from, {
      text: `╔═〘 💰sᴏʟᴅ 〙═╗
┃➠ ᴛʀᴀɴsᴀᴄᴛɪᴏɴ sᴜᴄᴄᴇss
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${itemData.emoji} ɪᴛᴇᴍ: ${itemData.name}
┃➠ 📦 ǫᴜᴀɴᴛɪᴛʏ: x${amount}
┃➠ 💵 ᴜɴɪᴛ ᴘʀɪᴄᴇ: ${currency}${formatCash(sellPrice)}
┃➠ 💰 ᴛᴏᴛᴀʟ ᴇᴀʀɴᴇᴅ: ${currency}${formatCash(totalEarned)}
┃
┃➠ 📦 ʟᴇғᴛ: ${newInv} ${itemData.name}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(newBalance)}
╚═══════════════════╝

╭━━━━❮ ɪɴғᴏ ❯━⊷
┃➠ ʀᴇsᴀʟᴇ ᴠᴀʟᴜᴇ: 60%
┃➠ ᴏʀɪɢɪɴᴀʟ: ${currency}${formatCash(itemData.price)}
┃➠ sᴏʟᴅ ғᴏʀ: ${currency}${formatCash(sellPrice)}
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}