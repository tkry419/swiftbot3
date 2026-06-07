/**
 * SwiftBot - plugins/commands/economy/fish.js
 * Group-Based Fishing System - RNG Loot + Tool Durability
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_fishing_xp_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

const FISH_LOOT = [
  // COMMON 70%
  { name: 'Old Boot', emoji: '👢', price: 5, rarity: 'common', chance: 0.25 },
  { name: 'Seaweed', emoji: '🌿', price: 10, rarity: 'common', chance: 0.25 },
  { name: 'Small Fish', emoji: '🐟', price: 25, rarity: 'common', chance: 0.20 },
  // UNCOMMON 20%
  { name: 'Salmon', emoji: '🍣', price: 100, rarity: 'uncommon', chance: 0.10 },
  { name: 'Tuna', emoji: '🐟', price: 200, rarity: 'uncommon', chance: 0.07 },
  { name: 'Treasure Map', emoji: '🗺️', price: 500, rarity: 'uncommon', chance: 0.03 },
  // RARE 8%
  { name: 'Golden Fish', emoji: '🐠', price: 1000, rarity: 'rare', chance: 0.05 },
  { name: 'Message Bottle', emoji: '🍾', price: 1500, rarity: 'rare', chance: 0.03 },
  // LEGENDARY 2%
  { name: 'Kraken Scale', emoji: '🐙', price: 10000, rarity: 'legendary', chance: 0.015 },
  { name: 'Poseidon Trident', emoji: '🔱', price: 25000, rarity: 'legendary', chance: 0.005 }
]

const getFishingLevel = (xp) => {
  if (xp >= 10000) return { level: 5, title: 'Master Angler', luck: 0.20 }
  if (xp >= 5000) return { level: 4, title: 'Pro Fisher', luck: 0.15 }
  if (xp >= 2000) return { level: 3, title: 'Expert', luck: 0.10 }
  if (xp >= 500) return { level: 2, title: 'Skilled', luck: 0.05 }
  return { level: 1, title: 'Novice', luck: 0.0 }
}

const rollLoot = (hasRod, luckBonus) => {
  let roll = Math.random()
  if (hasRod) roll -= luckBonus // Better odds with rod

  let cumulative = 0
  for (const item of FISH_LOOT) {
    cumulative += item.chance
    if (roll < cumulative) return item
  }
  return FISH_LOOT[0] // Fallback
}

export default {
  name: 'fish',
  alias: ['fishing'],
  desc: 'Go fishing for loot - 15min cooldown, requires Fishing Rod for rares',
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
┃
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    const groupId = isGroup? from : 'global'
    const lastFishKey = `eco_${groupId}_lastfish_${sender}`
    const xpKey = `eco_${groupId}_fishing_xp_${sender}`
    const rodKey = `eco_${groupId}_inv_${sender}_fishing_rod`
    const rodDurabilityKey = `eco_${groupId}_durability_${sender}_fishing_rod`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 2. FETCH DATA
    const [lastFish, fishingXp, rodCount, rodDurability, jailTime] = await Promise.all([
      db.get(lastFishKey),
      db.get(xpKey),
      db.get(rodKey),
      db.get(rodDurabilityKey),
      db.get(jailKey)
    ])

    // 3. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ғɪsʜɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. CHECK COOLDOWN - 15 MINUTES
    const now = Date.now()
    const cooldown = 15 * 60 * 1000
    const timeLeft = lastFish? (lastFish + cooldown) - now : 0

    if (lastFish && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ғɪsʜɪɴɢ ʟɪɴᴇ ᴛᴀɴɢʟᴇᴅ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ ᴛʀʏ ${prefix}mine ᴏʀ ${prefix}hunt
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK FISHING ROD
    const hasRod = rodCount > 0 && rodDurability > 0
    const fisherLevel = getFishingLevel(fishingXp || 0)

    // 6. ROLL LOOT
    let loot = rollLoot(hasRod, fisherLevel.luck)

    // No rod = no rares/legendary
    if (!hasRod && (loot.rarity === 'rare' || loot.rarity === 'legendary')) {
      loot = FISH_LOOT[2] // Force Small Fish
    }

    // 7. ADD TO INVENTORY
    const itemKey = loot.name.toLowerCase().replace(/\s+/g, '_')
    const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
    const currentInv = await db.get(invKey) || 0

    // 8. UPDATE DB
    const newXp = (fishingXp || 0) + (loot.rarity === 'legendary'? 100 : loot.rarity === 'rare'? 50 : loot.rarity === 'uncommon'? 25 : 10)
    const updates = [
      db.set(invKey, currentInv + 1),
      db.set(lastFishKey, now),
      db.set(xpKey, newXp)
    ]

    // Reduce rod durability
    if (hasRod) {
      const newDurability = rodDurability - 1
      if (newDurability <= 0) {
        updates.push(db.set(rodKey, rodCount - 1))
        updates.push(db.set(rodDurabilityKey, 50)) // Reset for next rod
      } else {
        updates.push(db.set(rodDurabilityKey, newDurability))
      }
    }

    await Promise.all(updates)

    // 9. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 10. RARITY COLOR
    const rarityEmoji = {
      common: '⚪',
      uncommon: '🟢',
      rare: '🔵',
      legendary: '🟡'
    }

    // 11. SEND RESULT
    await sock.sendMessage(from, {
      text: `╔═〘 🎣ғɪsʜᴇᴅ 〙═╗
┃➠ ᴄᴀᴜɢʜᴛ sᴏᴍᴇᴛʜɪɴɢ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${loot.emoji} ɪᴛᴇᴍ: ${loot.name}
┃➠ ${rarityEmoji[loot.rarity]} ʀᴀʀɪᴛʏ: ${loot.rarity.toUpperCase()}
┃➠ 💰 ᴠᴀʟᴜᴇ: $${formatCash(loot.price)}
┃
┃➠ 🏆 ʟᴇᴠᴇʟ: ${fisherLevel.title} LV${fisherLevel.level}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ: +${newXp - (fishingXp || 0)}
┃➠ 🍀 ʟᴜᴄᴋ ʙᴏɴᴜs: +${Math.floor(fisherLevel.luck * 100)}%
┃
┃➠ 🎣 ʀᴏᴅ: ${hasRod? `Yes (${rodDurability - 1}/50)` : 'No - buy from /shop'}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 15ᴍ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ${prefix}inv - Check inventory
┃➠ ${prefix}sell ${itemKey} 1 - Sell for $${formatCash(Math.floor(loot.price * 0.6))}
┃➠ ${prefix}market - List for custom price
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}