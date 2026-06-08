/**
 * SwiftBot - plugins/commands/economy/buy.js
 * Group-Based Item Purchase System
 * Handles: Tools, Items ONLY - No Backgrounds
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_balance_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// DEFAULT ITEMS - NO BACKGROUNDS
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

export default {
  name: 'buy',
  alias: ['purchase', 'get'],
  desc: 'Buy items from shop',
  usage: '<item> [amount]',
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
┃➠ ᴜsᴀɢᴇ: ${prefix}buy <item> [amount]
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}buy pickaxe
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}buy laptop 2
┃
┃➠ ᴜsᴇ ${prefix}shop ᴛᴏ sᴇᴇ ɪᴛᴇᴍs
┃➠ ᴜsᴇ ${prefix}bg ᴛᴏ ʙᴜʏ ᴛʜᴇᴍᴇs
╚═══════════════════╝`
      }, { quoted: m })
    }

    const amount = parseInt(args[1]) || 1
    if (amount <= 0 || amount > 100) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴍᴜsᴛ ʙᴇ 1-100
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. LOAD SHOP ITEMS - NO BACKGROUNDS HERE
    const groupId = isGroup? from : 'global'
    const customShop = await db.get(`eco_${groupId}_shop_items`) || {}
    const SHOP_ITEMS = {...DEFAULT_ITEMS,...customShop }

    const item = SHOP_ITEMS[itemKey]
    if (!item) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪᴛᴇᴍ ɴᴏᴛ ғᴏᴜɴᴅ
┃
┃➠ ɪᴛᴇᴍ: ${itemKey}
┃➠ ᴜsᴇ ${prefix}shop ᴛᴏ sᴇᴇ ɪᴛᴇᴍs
┃➠ ᴜsᴇ ${prefix}bg ᴛᴏ ʙᴜʏ ᴛʜᴇᴍᴇs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. BLOCK BACKGROUND PURCHASES - redirect to bg.js
    if (item.bgKey || item.category === 'backgrounds') {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴡʀᴏɴɢ ᴄᴏᴍᴀɴᴅ 〙═╗
┃➠ ʙᴀᴄᴋɢʀᴏᴜɴᴅs ᴀʀᴇ ɪɴ ${prefix}bg
┃
┃➠ ᴜsᴇ: ${prefix}bg buy ${item.bgKey || itemKey.replace('bg_', '')}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. DB KEYS
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 6. FETCH DATA
    const [balance, inventory, jailTime] = await Promise.all([
      db.get(balanceKey),
      db.get(invKey),
      db.get(jailKey)
    ])

    const currentBalance = balance || 0
    const currentInv = inventory || 0
    const totalCost = item.price * amount
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 7. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ sʜᴏᴘɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
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

    // 10. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    await sock.sendMessage(from, {
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
}