/**
 * SwiftBot - plugins/commands/economy/invest.js
 * Investment System - Lock bank money for 24h for 5-15% return
 * Uses db keys: eco_${groupJid}_bank_${user}, eco_${groupJid}_invested_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return hours > 0? `${hours}h ${minutes}m` : minutes > 0? `${minutes}m ${seconds}s` : `${seconds}s`
}

const getRiskTier = (amount) => {
  if (amount >= 1000000) return { min: 4, max: 7, emoji: '🟢', risk: 'BLUE CHIP' }
  if (amount >= 500000) return { min: 5, max: 8, emoji: '🟢', risk: 'SAFE' }
  if (amount >= 100000) return { min: 6, max: 10, emoji: '🟡', risk: 'MEDIUM' }
  if (amount >= 10000) return { min: 8, max: 13, emoji: '🟠', risk: 'HIGH' }
  return { min: 10, max: 15, emoji: '🔴', risk: 'YOLO' }
}

export default {
  name: 'invest',
  alias: ['investment', 'stake', 'stocks'],
  desc: 'Invest bank money for 24h - 5-15% return based on amount',
  usage: '<amount> | claim | status',
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
    const bankKey = `eco_${groupId}_bank_${sender}` // BANK NOT CASH
    const investedKey = `eco_${groupId}_invested_${sender}`
    const investTimeKey = `eco_${groupId}_invest_time_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 2. FETCH DATA
    const [bank, invested, investTime, jailTime, currency] = await Promise.all([
      db.get(bankKey),
      db.get(investedKey),
      db.get(investTimeKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currencySymbol = currency || '$'
    const now = Date.now()
    const lockTime = 24 * 60 * 60 * 1000 // 24h

    // 3. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ɪɴᴠᴇsᴛɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. STATUS MODE
    if (args[0] && args[0].toLowerCase() === 'status') {
      if (!invested || invested <= 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 📊sᴛᴀᴛᴜs 〙═╗
┃➠ ɴᴏ ᴀᴄᴛɪᴠᴇ ɪɴᴠᴇsᴛᴍᴇɴᴛ
┃➠ ᴜsᴇ ${prefix}invest <amount>
╚═══════════════════╝`
        }, { quoted: m })
      }

      const timeLeft = (investTime + lockTime) - now
      const risk = getRiskTier(invested)

      return await sock.sendMessage(from, {
        text: `╔═〘 📊ɪɴᴠᴇsᴛᴍᴇɴᴛ 〙═╗
┃➠ ᴀᴄᴛɪᴠᴇ sᴛᴀᴋᴇ
┃
┃➠ 💵 ɪɴᴠᴇsᴛᴇᴅ: ${currencySymbol}${formatCash(invested)}
┃➠ ${risk.emoji} ʀɪsᴋ: ${risk.risk}
┃➠ 📈 ʀᴀɴɢᴇ: ${risk.min}% - ${risk.max}%
┃
┃➠ ⏳ ᴛɪᴍᴇ ʟᴇғᴛ: ${timeLeft > 0? formatTime(timeLeft) : 'Ready to claim'}
┃➠ ᴜsᴇ ${prefix}invest claim
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CLAIM MODE
    if (args[0] && args[0].toLowerCase() === 'claim') {
      if (!invested || invested <= 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏ ᴀᴄᴛɪᴠᴇ ɪɴᴠᴇsᴛᴍᴇɴᴛ
┃➠ ᴜsᴇ ${prefix}invest <amount>
╚═══════════════════╝`
        }, { quoted: m })
      }

      const timeLeft = (investTime + lockTime) - now
      if (timeLeft > 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ⏰ʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ɪɴᴠᴇsᴛᴍᴇɴᴛ ɴᴏᴛ ʀᴇᴀᴅʏ
┃➠ ɪɴᴠᴇsᴛᴇᴅ: ${currencySymbol}${formatCash(invested)}
┃➠ ⏳ ᴛɪᴍᴇ ʟᴇғᴛ: ${formatTime(timeLeft)}
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Calculate return
      const risk = getRiskTier(invested)
      const percent = Math.random() * (risk.max - risk.min) + risk.min
      const profit = Math.floor(invested * (percent / 100))
      const totalReturn = invested + profit

      // Update DB - money goes back to BANK
      await Promise.all([
        db.set(bankKey, (bank || 0) + totalReturn),
        db.set(investedKey, 0),
        db.set(investTimeKey, 0)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 📈ᴄʟᴀɪᴍᴇᴅ 〙═╗
┃➠ ɪɴᴠᴇsᴛᴍᴇɴᴛ ᴍᴀᴛᴜʀᴇᴅ
┃
┃➠ 💵 ɪɴᴠᴇsᴛᴇᴅ: ${currencySymbol}${formatCash(invested)}
┃➠ ${risk.emoji} ʀɪsᴋ: ${risk.risk}
┃➠ 📊 ʀᴇᴛᴜʀɴ: +${percent.toFixed(1)}%
┃➠ 💰 ᴘʀᴏғɪᴛ: ${currencySymbol}${formatCash(profit)}
┃
┃➠ 🏦 ᴛᴏᴛᴀʟ ʀᴇᴛᴜʀɴ: ${currencySymbol}${formatCash(totalReturn)}
┃➠ 💳 ɴᴇᴡ ʙᴀɴᴋ: ${currencySymbol}${formatCash((bank || 0) + totalReturn)}
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ᴍᴏɴᴇʏ ʀᴇᴛᴜʀɴᴇᴅ ᴛᴏ ʙᴀɴᴋ
┃➠ ${prefix}withdraw to use cash
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    // 6. INVEST MODE
    const amount = parseInt(args[0])
    if (!amount || isNaN(amount) || amount < 1000) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ
┃➠ ᴍɪɴ ɪɴᴠᴇsᴛ: ${currencySymbol}1,000
┃➠ ᴜsᴀɢᴇ: ${prefix}invest <amount>
┃➠ ᴜsᴀɢᴇ: ${prefix}invest claim
┃➠ ᴜsᴀɢᴇ: ${prefix}invest status
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (invested && invested > 0) {
      const timeLeft = (investTime + lockTime) - now
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ɪɴᴠᴇsᴛᴇᴅ
┃➠ ᴀᴍᴏᴜɴᴛ: ${currencySymbol}${formatCash(invested)}
┃➠ ᴄʟᴀɪᴍ ɪɴ: ${formatTime(timeLeft)}
┃➠ ᴜsᴇ ${prefix}invest claim
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (!bank || bank < amount) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ɪɴ ʙᴀɴᴋ
┃➠ ʏᴏᴜʀ ʙᴀɴᴋ: ${currencySymbol}${formatCash(bank || 0)}
┃➠ ɴᴇᴇᴅᴇᴅ: ${currencySymbol}${formatCash(amount)}
┃➠ ᴜsᴇ ${prefix}deposit first
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. LOCK INVESTMENT - deduct from BANK
    const risk = getRiskTier(amount)
    await Promise.all([
      db.set(bankKey, bank - amount),
      db.set(investedKey, amount),
      db.set(investTimeKey, now)
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

    // 9. SEND RESULT
    await sock.sendMessage(from, {
      text: `╔═〘 📈ɪɴᴠᴇsᴛᴇᴅ 〙═╗
┃➠ ᴍᴏɴᴇʏ ʟᴏᴄᴋᴇᴅ ғᴏʀ 24ʜ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💵 ᴀᴍᴏᴜɴᴛ: ${currencySymbol}${formatCash(amount)}
┃➠ ${risk.emoji} ʀɪsᴋ ᴛɪᴇʀ: ${risk.risk}
┃➠ 📊 ᴇxᴘᴇᴄᴛᴇᴅ: ${risk.min}% - ${risk.max}%
┃➠ 💰 ᴇsᴛ. ᴘʀᴏғɪᴛ: ${currencySymbol}${formatCash(Math.floor(amount * (risk.min / 100)))} - ${currencySymbol}${formatCash(Math.floor(amount * (risk.max / 100)))}
┃
┃➠ 🏦 ʙᴀɴᴋ ʟᴇғᴛ: ${currencySymbol}${formatCash(bank - amount)}
┃➠ ⏰ ᴄʟᴀɪᴍ ɪɴ: 24ʜ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ${prefix}invest claim - After 24h
┃➠ ${prefix}invest status - Check time
┃➠ ʜɪɢʜᴇʀ ᴀᴍᴏᴜɴᴛ = ʟᴏᴡᴇʀ ʀɪsᴋ
┃➠ ʏᴏʟᴏ: <10k = 10-15% ʀᴇᴛᴜʀɴ
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}