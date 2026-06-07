/**
 * SwiftBot - plugins/commands/economy/hunt.js
 * Group-Based Hunting System - RNG Loot + Tool Durability
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_hunting_xp_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

const HUNT_LOOT = [
  // COMMON 70%
  { name: 'Rabbit Pelt', emoji: '🐰', price: 20, rarity: 'common', chance: 0.25 },
  { name: 'Bird Feather', emoji: '🪶', price: 15, rarity: 'common', chance: 0.25 },
  { name: 'Deer Antler', emoji: '🦌', price: 40, rarity: 'common', chance: 0.20 },
  // UNCOMMON 20%
  { name: 'Wolf Pelt', emoji: '🐺', price: 150, rarity: 'uncommon', chance: 0.10 },
  { name: 'Bear Claw', emoji: '🐻', price: 300, rarity: 'uncommon', chance: 0.07 },
  { name: 'Eagle Eye', emoji: '🦅', price: 450, rarity: 'uncommon', chance: 0.03 },
  // RARE 8%
  { name: 'Tiger Fang', emoji: '🐅', price: 1200, rarity: 'rare', chance: 0.05 },
  { name: 'Elephant Tusk', emoji: '🐘', price: 3000, rarity: 'rare', chance: 0.03 },
  // LEGENDARY 2%
  { name: 'Phoenix Feather', emoji: '🔥', price: 20000, rarity: 'legendary', chance: 0.015 },
  { name: 'Unicorn Horn', emoji: '🦄', price: 100000, rarity: 'legendary', chance: 0.005 }
]

const getHuntingLevel = (xp) => {
  if (xp >= 10000) return { level: 5, title: 'Master Hunter', luck: 0.20 }
  if (xp >= 5000) return { level: 4, title: 'Pro Hunter', luck: 0.15 }
  if (xp >= 2000) return { level: 3, title: 'Expert', luck: 0.10 }
  if (xp >= 500) return { level: 2, title: 'Skilled', luck: 0.05 }
  return { level: 1, title: 'Novice', luck: 0.0 }
}

const rollLoot = (hasBow, luckBonus) => {
  let roll = Math.random()
  if (hasBow) roll -= luckBonus

  let cumulative = 0
  for (const item of HUNT_LOOT) {
    cumulative += item.chance
    if (roll < cumulative) return item
  }
  return HUNT_LOOT[0]
}

export default {
  name: 'hunt',
  alias: ['hunting'],
  desc: 'Go hunting for pelts - 15min cooldown, requires Bow for rares',
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
    const lastHuntKey = `eco_${groupId}_lasthunt_${sender}`
    const xpKey = `eco_${groupId}_hunting_xp_${sender}`
    const bowKey = `eco_${groupId}_inv_${sender}_bow`
    const bowDurabilityKey = `eco_${groupId}_durability_${sender}_bow`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 2. FETCH DATA
    const [lastHunt, huntingXp, bowCount, bowDurability, jailTime] = await Promise.all([
      db.get(lastHuntKey),
      db.get(xpKey),
      db.get(bowKey),
      db.get(bowDurabilityKey),
      db.get(jailKey)
    ])

    // 3. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ʜᴜɴᴛɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. CHECK COOLDOWN - 15 MINUTES
    const now = Date.now()
    const cooldown = 15 * 60 * 1000
    const timeLeft = lastHunt? (lastHunt + cooldown) - now : 0

    if (lastHunt && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ᴀɴɪᴍᴀʟs sᴄᴀʀᴇᴅ ᴀᴡᴀʏ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ ᴛʀʏ ${prefix}fish ᴏʀ ${prefix}mine
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK BOW
    const hasBow = bowCount > 0 && bowDurability > 0
    const hunterLevel = getHuntingLevel(huntingXp || 0)

    // 6. ROLL LOOT
    let loot = rollLoot(hasBow, hunterLevel.luck)

    // No bow = no rares/legendary
    if (!hasBow && (loot.rarity === 'rare' || loot.rarity === 'legendary')) {
      loot = HUNT_LOOT[0] // Force Rabbit Pelt
    }

    // 7. ADD TO INVENTORY
    const itemKey = loot.name.toLowerCase().replace(/\s+/g, '_')
    const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
    const currentInv = await db.get(invKey) || 0

    // 8. UPDATE DB
    const newXp = (huntingXp || 0) + (loot.rarity === 'legendary'? 100 : loot.rarity === 'rare'? 50 : loot.rarity === 'uncommon'? 25 : 10)
    const updates = [
      db.set(invKey, currentInv + 1),
      db.set(lastHuntKey, now),
      db.set(xpKey, newXp)
    ]

    // Reduce bow durability
    if (hasBow) {
      const newDurability = bowDurability - 1
      if (newDurability <= 0) {
        updates.push(db.set(bowKey, bowCount - 1))
        updates.push(db.set(bowDurabilityKey, 50))
      } else {
        updates.push(db.set(bowDurabilityKey, newDurability))
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
      text: `╔═〘 🏹ʜᴜɴᴛᴇᴅ 〙═╗
┃➠ ᴛʀᴀᴄᴋᴇᴅ ᴘʀᴇʏ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${loot.emoji} ɪᴛᴇᴍ: ${loot.name}
┃➠ ${rarityEmoji[loot.rarity]} ʀᴀʀɪᴛʏ: ${loot.rarity.toUpperCase()}
┃➠ 💰 ᴠᴀʟᴜᴇ: $${formatCash(loot.price)}
┃
┃➠ 🏆 ʟᴇᴠᴇʟ: ${hunterLevel.title} LV${hunterLevel.level}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ: +${newXp - (huntingXp || 0)}
┃➠ 🍀 ʟᴜᴄᴋ ʙᴏɴᴜs: +${Math.floor(hunterLevel.luck * 100)}%
┃
┃➠ 🏹 ʙᴏᴡ: ${hasBow? `Yes (${bowDurability - 1}/50)` : 'No - buy from /shop'}
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