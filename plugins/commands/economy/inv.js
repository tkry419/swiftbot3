/**
 * SwiftBot - plugins/commands/economy/use.js
 * Group-Based Item Usage System
 * Uses db keys: eco_${groupJid}_inv_${user}_${item}, eco_${groupJid}_effects_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// ITEM EFFECTS - Define what each item does
const ITEM_EFFECTS = {
  'pickaxe': {
    name: 'Pickaxe ⛏️',
    emoji: '⛏️',
    effect: 'work_boost',
    value: 1.5, // 50% more from work
    duration: 60 * 60 * 1000, // 1 hour
    desc: 'Work income boosted 50% for 1 hour'
  },
  'laptop': {
    name: 'Laptop 💻',
    emoji: '💻',
    effect: 'hack_boost',
    value: 2, // 100% more from hack
    duration: 30 * 60 * 1000, // 30 min
    desc: 'Hack success + rewards doubled for 30min'
  },
  'phone': {
    name: 'iPhone 16 📱',
    emoji: '📱',
    effect: 'daily_bonus',
    value: 2000, // Instant $2000
    duration: 0, // Instant
    desc: 'Post on social media - get $2000 instantly'
  },
  'ring': {
    name: 'Diamond Ring 💍',
    emoji: '💍',
    effect: 'marry',
    value: 0,
    duration: 0,
    desc: 'Propose marriage to someone',
    needsTarget: true
  }
}

export default {
  name: 'use',
  alias: ['activate', 'equip'],
  desc: 'Use an item from your inventory',
  usage: '<item> [@user]',
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
┃➠ ᴜsᴀɢᴇ: ${prefix}use <item>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}use pickaxe
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}use ring @user
╚═══════════════════╝`
      }, { quoted: m })
    }

    const itemData = ITEM_EFFECTS[itemKey]
    if (!itemData) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪᴛᴇᴍ ɴᴏᴛ ᴜsᴀʙʟᴇ
┃
┃➠ ɪᴛᴇᴍ: ${itemKey}
┃➠ ᴏɴʟʏ ᴄᴇʀᴛᴀɪɴ ɪᴛᴇᴍs ᴀʀᴇ ᴜsᴀʙʟᴇ
┃➠ ᴜsᴇ ${prefix}inv ᴛᴏ sᴇᴇ ✨ ɪᴛᴇᴍs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const invKey = `eco_${groupId}_inv_${sender}_${itemKey}`
    const effectKey = `eco_${groupId}_effects_${sender}_${itemKey}`
    const jailKey = `eco_${groupId}_jail_${sender}`
    const balanceKey = `eco_${groupId}_balance_${sender}`

    // 4. FETCH DATA
    const [invCount, activeEffect, jailTime, balance] = await Promise.all([
      db.get(invKey),
      db.get(effectKey),
      db.get(jailKey),
      db.get(balanceKey)
    ])

    const currentInv = invCount || 0
    const currentBalance = balance || 0
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 5. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ɪᴛᴇᴍ ᴜsᴇ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CHECK IF HAS ITEM
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

    // 7. CHECK IF ALREADY ACTIVE
    if (activeEffect && Date.now() < activeEffect && itemData.duration > 0) {
      const remaining = formatTime(activeEffect - Date.now())
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴀᴄᴛɪᴠᴇ 〙═╗
┃➠ ɪᴛᴇᴍ ᴀʟʀᴇᴀᴅʏ ᴀᴄᴛɪᴠᴇ
┃
┃➠ ɪᴛᴇᴍ: ${itemData.emoji} ${itemData.name}
┃➠ ⏳ ᴇxᴘɪʀᴇs ɪɴ: ${remaining}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. HANDLE TARGET ITEMS - Like ring
    let target = null
    if (itemData.needsTarget) {
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
      const replied = m.message?.extendedTextMessage?.contextInfo?.participant
      target = mentioned || replied

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛʜɪs ɪᴛᴇᴍ ɴᴇᴇᴅs ᴛᴀʀɢᴇᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}use ${itemKey} @user
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (target === sender) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ᴜsᴇ ᴏɴ ʏᴏᴜʀsᴇʟғ
┃
┃➠ ᴛᴀʀɢᴇᴛ sᴏᴍᴇᴏɴᴇ ᴇʟsᴇ
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 9. APPLY EFFECT
    const now = Date.now()
    let effectText = ''
    let newBalance = currentBalance

    switch (itemData.effect) {
      case 'work_boost':
        await db.set(effectKey, now + itemData.duration)
        effectText = `Work income x${itemData.value} for ${formatTime(itemData.duration)}`
        break

      case 'hack_boost':
        await db.set(effectKey, now + itemData.duration)
        effectText = `Hack rewards x${itemData.value} for ${formatTime(itemData.duration)}`
        break

      case 'daily_bonus':
        newBalance += itemData.value
        await db.set(balanceKey, newBalance)
        effectText = `Received ${currency}${formatCash(itemData.value)} instantly`
        break

      case 'marry':
        // Special handling for ring
        const targetName = await db.get(`pushname_${target}`) || target.split('@')[0]
        effectText = `Proposed to @${target.split('@')[0]} 💍`
        break

      default:
        effectText = 'Item activated'
    }

    // 10. CONSUME ITEM - Remove 1 from inventory
    await db.set(invKey, currentInv - 1)

    // 11. SEND SUCCESS MESSAGE
    let msgText = `╔═〘 ✨ɪᴛᴇᴍ ᴜsᴇᴅ 〙═╗
┃➠ ɪᴛᴇᴍ: ${itemData.emoji} ${itemData.name}
┃
┃➠ 📝 ᴇғғᴇᴄᴛ: ${effectText}
┃`

    if (itemData.duration > 0) {
      msgText += `┃➠ ⏰ ᴅᴜʀᴀᴛɪᴏɴ: ${formatTime(itemData.duration)}\n┃\n`
    }

    msgText += `┃➠ 📦 ʟᴇғᴛ: ${currentInv - 1} ${itemData.name}
┃➠ 💰 ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(newBalance)}
╚═══════════════════╝`

    const mentions = target? [sender, target] : [sender]
    await sock.sendMessage(from, {
      text: msgText,
      mentions
    }, { quoted: m })
  }
}