/**
 * SwiftBot - plugins/commands/economy/mine.js
 * Group-Based Mining System - RNG Loot + Tool Durability
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_mining_xp_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

const MINE_LOOT = [
  // COMMON 70%
  { name: 'Stone', emoji: '🪨', price: 5, rarity: 'common', chance: 0.25 },
  { name: 'Coal', emoji: '⚫', price: 15, rarity: 'common', chance: 0.25 },
  { name: 'Copper Ore', emoji: '🟠', price: 30, rarity: 'common', chance: 0.20 },
  // UNCOMMON 20%
  { name: 'Iron Ore', emoji: '⚙️', price: 120, rarity: 'uncommon', chance: 0.10 },
  { name: 'Silver Ore', emoji: '🥈', price: 250, rarity: 'uncommon', chance: 0.07 },
  { name: 'Gem Fragment', emoji: '💎', price: 400, rarity: 'uncommon', chance: 0.03 },
  // RARE 8%
  { name: 'Gold Ore', emoji: '👑', price: 800, rarity: 'rare', chance: 0.05 },
  { name: 'Diamond', emoji: '💎', price: 2000, rarity: 'rare', chance: 0.03 },
  // LEGENDARY 2%
  { name: 'Ancient Relic', emoji: '🏺', price: 5000, rarity: 'legendary', chance: 0.015 },
  { name: 'Mythril', emoji: '✨', price: 15000, rarity: 'legendary', chance: 0.005 }
]

const getMiningLevel = (xp) => {
  if (xp >= 10000) return { level: 5, title: 'Master Miner', luck: 0.20 }
  if (xp >= 5000) return { level: 4, title: 'Pro Miner', luck: 0.15 }
  if (xp >= 2000) return { level: 3, title: 'Expert', luck: 0.10 }
  if (xp >= 500) return { level: 2, title: 'Skilled', luck: 0.05 }
  return { level: 1, title: 'Novice', luck: 0.0 }
}

const rollLoot = (hasPickaxe, luckBonus) => {
  let roll = Math.random()
  if (hasPickaxe) roll -= luckBonus

  let cumulative = 0
  for (const item of MINE_LOOT) {
    cumulative += item.chance
    if (roll < cumulative) return item
  }
  return MINE_LOOT[0]
}

export default {
  name: 'mine',
  alias: ['mining'],
  desc: 'Go mining for ores - 15min cooldown, requires Pickaxe for rares',
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
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴅɪsᴀʙʟᴇᴅ
┃
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    const groupId = isGroup? from : 'global'
    const lastMineKey = `eco_${groupId}_lastmine_${sender}`
    const xpKey = `eco_${groupId}_mining_xp_${sender}`
    const pickaxeKey = `eco_${groupId}_inv_${sender}_pickaxe`
    const pickaxeDurabilityKey = `eco_${groupId}_durability_${sender}_pickaxe`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 2. FETCH DATA
    const [lastMine, miningXp, pickaxeCount, pickaxeDurability, jailTime] = await Promise.all([
      db.get(lastMineKey),
      db.get(xpKey),
      db.get(pickaxeKey),
      db.get(pickaxeDurabilityKey),
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
┃➠ ɴᴏ ᴍɪɴɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. CHECK COOLDOWN - 15 MINUTES
    const now = Date.now()
    const cooldown = 15 * 60 * 1000
    const timeLeft = lastMine? (lastMine + cooldown) - now : 0

    if (lastMine && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ᴘɪᴄᴋᴀxᴇ ᴏᴠᴇʀʜᴇᴀᴛᴇᴅ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ ᴛʀʏ ${prefix}fish ᴏʀ ${prefix}hunt
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK PICKAXE
    const hasPickaxe = pickaxeCount > 0 && pickaxeDurability > 0
    const minerLevel = getMiningLevel(miningXp || 0)

    // 6. ROLL LOOT
    let loot = rollLoot(hasPickaxe, minerLevel.luck)

    // No pickaxe = no rares/legendary
    if (!hasPickaxe && (loot.rarity === 'rare' || loot.rarity === 'legendary')) {
      loot = MINE_LOOT[2] // Force Copper Ore
    }

    // 7. ADD TO INVENTORY
    const itemKey = loot.name.toLowerCase().replace(/\s+/g, '_')
    const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
    const currentInv = await db.get(invKey) || 0

    // 8. UPDATE DB
    const newXp = (miningXp || 0) + (loot.rarity === 'legendary'? 100 : loot.rarity === 'rare'? 50 : loot.rarity === 'uncommon'? 25 : 10)
    const updates = [
      db.set(invKey, currentInv + 1),
      db.set(lastMineKey, now),
      db.set(xpKey, newXp)
    ]

    // Reduce pickaxe durability
    if (hasPickaxe) {
      const newDurability = pickaxeDurability - 1
      if (newDurability <= 0) {
        updates.push(db.set(pickaxeKey, pickaxeCount - 1))
        updates.push(db.set(pickaxeDurabilityKey, 50))
      } else {
        updates.push(db.set(pickaxeDurabilityKey, newDurability))
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
      text: `╔═〘 ⛏️ᴍɪɴᴇᴅ 〙═╗
┃➠ ᴅᴜɢ ᴅᴇᴇᴘ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${loot.emoji} ɪᴛᴇᴍ: ${loot.name}
┃➠ ${rarityEmoji[loot.rarity]} ʀᴀʀɪᴛʏ: ${loot.rarity.toUpperCase()}
┃➠ 💰 ᴠᴀʟᴜᴇ: $${formatCash(loot.price)}
┃
┃➠ 🏆 ʟᴇᴠᴇʟ: ${minerLevel.title} LV${minerLevel.level}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ: +${newXp - (miningXp || 0)}
┃➠ 🍀 ʟᴜᴄᴋ ʙᴏɴᴜs: +${Math.floor(minerLevel.luck * 100)}%
┃
┃➠ ⛏️ ᴘɪᴄᴋᴀxᴇ: ${hasPickaxe? `Yes (${pickaxeDurability - 1}/50)` : 'No - buy from /shop'}
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