/**
 * SwiftBot - plugins/commands/economy/search.js
 * Group-Based Scavenger Hunt - RNG Locations + Rewards
 * Uses db keys: eco_${groupJid}_lastsearch_${user}, eco_${groupJid}_search_xp_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

const LOCATIONS = [
  // COMMON 60% - Small cash
  { name: 'Dumpster', emoji: '🗑️', min: 20, max: 100, rarity: 'common', chance: 0.15, msg: 'You dug through trash' },
  { name: 'Park Bench', emoji: '🪑', price: 0, min: 30, max: 120, rarity: 'common', chance: 0.15, msg: 'You checked under a park bench' },
  { name: 'Old Car', emoji: '🚗', min: 25, max: 150, rarity: 'common', chance: 0.15, msg: 'You searched an abandoned car' },
  { name: 'Sewer', emoji: '🕳️', min: 40, max: 200, rarity: 'common', chance: 0.15, msg: 'You crawled through the sewers' },

  // UNCOMMON 25% - Decent cash + items
  { name: 'Abandoned House', emoji: '🏚️', min: 200, max: 600, rarity: 'uncommon', chance: 0.08, msg: 'You explored a creepy house', item: { name: 'Old Coin', emoji: '🪙', chance: 0.3, price: 300 } },
  { name: 'Bank Vault', emoji: '🏦', min: 300, max: 800, rarity: 'uncommon', chance: 0.07, msg: 'You snuck into an old bank vault' },
  { name: 'Cave', emoji: '🪨', min: 250, max: 700, rarity: 'uncommon', chance: 0.05, msg: 'You spelunked into a dark cave', item: { name: 'Gem Fragment', emoji: '💎', chance: 0.4, price: 400 } },
  { name: 'Forest', emoji: '🌲', min: 150, max: 500, rarity: 'uncommon', chance: 0.05, msg: 'You searched deep in the woods' },

  // RARE 12% - Big cash + rare items
  { name: 'Luxury Mansion', emoji: '🏰', min: 1000, max: 3000, rarity: 'rare', chance: 0.05, msg: 'You broke into a rich mansion', item: { name: 'Gold Watch', emoji: '⌚', chance: 0.5, price: 1500 } },
  { name: 'Casino Backroom', emoji: '🎰', min: 1500, max: 4000, rarity: 'rare', chance: 0.04, msg: 'You found the casino\'s secret stash' },
  { name: 'Military Base', emoji: '🎖️', min: 2000, max: 5000, rarity: 'rare', chance: 0.03, msg: 'You infiltrated an abandoned base', item: { name: 'Dog Tag', emoji: '🏷️', chance: 0.3, price: 2000 } },

  // LEGENDARY 3% - Jackpot
  { name: 'Dragon Lair', emoji: '🐉', min: 10000, max: 25000, rarity: 'legendary', chance: 0.015, msg: 'You stole from a sleeping dragon', item: { name: 'Dragon Scale', emoji: '🐉', chance: 0.6, price: 10000 } },
  { name: 'Alien Crash Site', emoji: '👽', min: 15000, max: 50000, rarity: 'legendary', chance: 0.01, msg: 'You looted a UFO crash', item: { name: 'Alien Tech', emoji: '🛸', chance: 0.5, price: 20000 } },
  { name: 'Secret Bunker', emoji: '🚪', min: 20000, max: 80000, rarity: 'legendary', chance: 0.005, msg: 'You found the president\'s bunker', item: { name: 'Nuclear Codes', emoji: '☢️', chance: 0.3, price: 50000 } }
]

const getSearchLevel = (xp) => {
  if (xp >= 10000) return { level: 5, title: 'Treasure Hunter', luck: 0.25 }
  if (xp >= 5000) return { level: 4, title: 'Explorer', luck: 0.18 }
  if (xp >= 2000) return { level: 3, title: 'Scavenger', luck: 0.12 }
  if (xp >= 500) return { level: 2, title: 'Finder', luck: 0.06 }
  return { level: 1, title: 'Rookie', luck: 0.0 }
}

const rollLocation = (luckBonus) => {
  let roll = Math.random() - luckBonus // Higher level = better odds

  let cumulative = 0
  for (const loc of LOCATIONS) {
    cumulative += loc.chance
    if (roll < cumulative) return loc
  }
  return LOCATIONS[0]
}

export default {
  name: 'search',
  alias: ['scavenge', 'explore', 'loot'],
  desc: 'Search random locations for cash and rare items - 20min cooldown',
  usage: '',
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

    const groupId = isGroup? from : 'global'
    const lastSearchKey = `eco_${groupId}_lastsearch_${sender}`
    const xpKey = `eco_${groupId}_search_xp_${sender}`
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 2. FETCH DATA
    const [lastSearch, searchXp, balance, jailTime, currency] = await Promise.all([
      db.get(lastSearchKey),
      db.get(xpKey),
      db.get(balanceKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    // 3. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ sᴇᴀʀᴄʜɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. CHECK COOLDOWN - 20 MINUTES
    const now = Date.now()
    const cooldown = 20 * 60 * 1000
    const timeLeft = lastSearch? (lastSearch + cooldown) - now : 0

    if (lastSearch && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ᴇxʜᴀᴜsᴛᴇᴅ
┃
┃➠ ⏳ ʀᴇsᴛ ғᴏʀ: ${formatTime(timeLeft)}
┃➠ ᴛʀʏ ${prefix}fish ${prefix}mine ${prefix}hunt
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. ROLL LOCATION
    const searcherLevel = getSearchLevel(searchXp || 0)
    const location = rollLocation(searcherLevel.luck)
    let earned = Math.floor(Math.random() * (location.max - location.min + 1)) + location.min
    const currencySymbol = currency || '$'

    // 6. BONUS ITEM DROP
    let bonusItem = null
    let bonusItemMsg = ''
    if (location.item && Math.random() < location.item.chance) {
      bonusItem = location.item
      const itemKey = bonusItem.name.toLowerCase().replace(/\s+/g, '_')
      const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
      const currentInv = await db.get(invKey) || 0
      await db.set(invKey, currentInv + 1)
      bonusItemMsg = `\n┃➠ 🎁 ʙᴏɴᴜs: ${bonusItem.emoji} ${bonusItem.name} (+$${formatCash(bonusItem.price)})`
    }

    // 7. UPDATE DB
    const newXp = (searchXp || 0) + (location.rarity === 'legendary'? 150 : location.rarity === 'rare'? 75 : location.rarity === 'uncommon'? 40 : 15)
    const newBalance = (balance || 0) + earned

    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(lastSearchKey, now),
      db.set(xpKey, newXp)
    ])

    // 8. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 9. RARITY COLOR
    const rarityEmoji = {
      common: '⚪',
      uncommon: '🟢',
      rare: '🔵',
      legendary: '🟡'
    }

    // 10. SEND RESULT
    await sock.sendMessage(from, {
      text: `╔═〘 ${location.emoji}sᴇᴀʀᴄʜᴇᴅ 〙═╗
┃➠ ᴇxᴘʟᴏʀᴀᴛɪᴏɴ ᴄᴏᴍᴘʟᴇᴛᴇ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 📍 ʟᴏᴄᴀᴛɪᴏɴ: ${location.name}
┃➠ ${rarityEmoji[location.rarity]} ʀᴀʀɪᴛʏ: ${location.rarity.toUpperCase()}
┃➠ 📝 ᴀᴄᴛɪᴏɴ: ${location.msg}
┃
┃➠ 💰 ғᴏᴜɴᴅ: ${currencySymbol}${formatCash(earned)}${bonusItemMsg}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ 🏆 ʟᴇᴠᴇʟ: ${searcherLevel.title} LV${searcherLevel.level}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ: +${newXp - (searchXp || 0)}
┃➠ 🍀 ʟᴜᴄᴋ ʙᴏɴᴜs: +${Math.floor(searcherLevel.luck * 100)}%
┃
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 20ᴍ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ${prefix}inv - Check inventory
┃➠ ʜɪɢʜᴇʀ ʟᴇᴠᴇʟ = ʙᴇᴛᴛᴇʀ ʟᴏᴄᴀᴛɪᴏɴs
┃➠ sᴇᴀʀᴄʜ ᴇᴠᴇʀʏ 20ᴍ ᴛᴏ ɢʀɪɴᴅ
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}