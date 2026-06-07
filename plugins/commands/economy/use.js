/**
 * SwiftBot - plugins/commands/economy/inventory.js
 * Group-Based Inventory System
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_shop_items
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// DEFAULT ITEMS - Same as shop.js
const DEFAULT_ITEMS = {
  'pickaxe': {
    name: 'Pickaxe ⛏️',
    emoji: '⛏️',
    desc: 'Mine more cash with work',
    usable: true
  },
  'laptop': {
    name: 'Laptop 💻',
    emoji: '💻',
    desc: 'Hack for bigger rewards',
    usable: true
  },
  'shield': {
    name: 'Shield 🛡️',
    emoji: '🛡️',
    desc: 'Protect from rob 50%',
    usable: false
  },
  'sword': {
    name: 'Sword ⚔️',
    emoji: '⚔️',
    desc: 'Increase rob success 10%',
    usable: false
  },
  'car': {
    name: 'Sports Car 🏎️',
    emoji: '🏎️',
    desc: 'Flex on poor people',
    usable: false
  },
  'house': {
    name: 'Mansion 🏠',
    emoji: '🏠',
    desc: 'Passive income +500/day',
    usable: false
  },
  'phone': {
    name: 'iPhone 16 📱',
    emoji: '📱',
    desc: 'Social media clout',
    usable: true
  },
  'ring': {
    name: 'Diamond Ring 💍',
    emoji: '💍',
    desc: 'Marry someone rich',
    usable: true
  }
}

export default {
  name: 'inventory',
  alias: ['inv', 'items', 'bag'],
  desc: 'View your inventory and items',
  usage: '[@user]',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK TARGET - Check someone else inv
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const replied = m.message?.extendedTextMessage?.contextInfo?.participant
    const target = mentioned || replied || sender

    // 2. CHECK IF ECONOMY ENABLED
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

    // 3. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 4. GET TARGET NAME
    let targetName = 'You'
    if (target!== sender) {
      try {
        targetName = await db.get(`pushname_${target}`) || target.split('@')[0]
      } catch {
        targetName = target.split('@')[0]
      }
    }

    // 5. LOAD CUSTOM SHOP ITEMS
    const customShop = await db.get(`eco_${groupId}_shop_items`) || {}
    const ALL_ITEMS = {...DEFAULT_ITEMS,...customShop }

    // 6. FETCH ALL INVENTORY ITEMS
    const itemKeys = Object.keys(ALL_ITEMS)
    const invPromises = itemKeys.map(async (itemKey) => {
      const count = await db.get(`eco_${groupId}_inv_${target}_${itemKey}`)
      return {
        key: itemKey,
        count: count || 0,
      ...ALL_ITEMS[itemKey]
      }
    })

    const inventory = await Promise.all(invPromises)
    const userItems = inventory.filter(item => item.count > 0)

    // 7. FETCH USER STATS
    const [balance, bank, jailTime] = await Promise.all([
      db.get(`eco_${groupId}_balance_${target}`),
      db.get(`eco_${groupId}_bank_${target}`),
      db.get(`eco_${groupId}_jail_${target}`)
    ])

    const currentBalance = balance || 0
    const currentBank = bank || 0
    const totalWealth = currentBalance + currentBank
    const isJailed = jailTime && Date.now() < jailTime

    // 8. EMPTY INVENTORY
    if (userItems.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 🎒ɪɴᴠᴇɴᴛᴏʀʏ 〙═╗
┃➠ ᴜsᴇʀ: @${target.split('@')[0]}
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 📦 ɪɴᴠᴇɴᴛᴏʀʏ ᴇᴍᴘᴛʏ
┃
┃➠ 💰 ᴄᴀsʜ: ${currency}${formatCash(currentBalance)}
┃➠ 🏦 ʙᴀɴᴋ: ${currency}${formatCash(currentBank)}
┃➠ 💎 ᴛᴏᴛᴀʟ: ${currency}${formatCash(totalWealth)}
┃
┃➠ ᴜsᴇ ${prefix}shop ᴛᴏ ʙᴜʏ ɪᴛᴇᴍs
╚═══════════════════╝`,
        mentions: [target]
      }, { quoted: m })
    }

    // 9. GROUP BY CATEGORY
    const categories = {
      'tools': [],
      'weapons': [],
      'defense': [],
      'luxury': [],
      'property': [],
      'other': []
    }

    userItems.forEach(item => {
      const cat = item.category || 'other'
      if (categories[cat]) {
        categories[cat].push(item)
      } else {
        categories.other.push(item)
      }
    })

    // 10. BUILD INVENTORY TEXT
    let invText = `╔═〘 🎒ɪɴᴠᴇɴᴛᴏʀʏ 〙═╗
┃➠ ᴜsᴇʀ: @${target.split('@')[0]}
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💰 ᴄᴀsʜ: ${currency}${formatCash(currentBalance)}
┃➠ 🏦 ʙᴀɴᴋ: ${currency}${formatCash(currentBank)}
┃➠ 💎 ᴛᴏᴛᴀʟ: ${currency}${formatCash(totalWealth)}
┃
`

    if (isJailed) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      invText += `┃➠ 🚨 sᴛᴀᴛᴜs: ɪɴ ᴊᴀɪʟ (${remaining}ᴍ)\n┃\n`
    }

    let totalItems = 0
    Object.entries(categories).forEach(([cat, items]) => {
      if (items.length === 0) return
      const catName = cat.toUpperCase()
      invText += `┃➠ ━━━ ${catName} ━━━\n`
      items.forEach(item => {
        totalItems += item.count
        const usableTag = item.usable? '✨' : '🔒'
        invText += `┃➠ ${item.emoji} ${item.name} ${usableTag}\n`
        invText += `┃➠ 📦 x${item.count} | ${item.desc}\n┃\n`
      })
    })

    invText += `┃➠ 📊 ᴛᴏᴛᴀʟ ɪᴛᴇᴍs: ${totalItems}
╚═══════════════════╝

╭━━━━❮ ᴄᴏᴍᴍᴀɴᴅs ❯━⊷
┃➠ ${prefix}use <item> - Use item ✨
┃➠ ${prefix}shop - Buy more items
┃➠ ${prefix}sell <item> - Sell items
╰━━━━━━━━━━━━━━━━━⊷`

    await sock.sendMessage(from, {
      text: invText,
      mentions: [target]
    }, { quoted: m })
  }
}