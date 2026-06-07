/**
 * SwiftBot - plugins/commands/economy/gamble.js
 * Group-Based Gambling System - 50/50 Win/Lose
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_lastgamble_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const seconds = Math.floor(ms / 1000)
  return `${seconds}s`
}

const parseAmount = (input, balance) => {
  if (!input) return null
  const lower = input.toLowerCase()
  if (lower === 'all' || lower === 'max') return balance
  if (lower === 'half') return Math.floor(balance / 2)
  const num = parseInt(input.replace(/[^0-9]/g, ''))
  return isNaN(num)? null : num
}

export default {
  name: 'gamble',
  alias: ['bet', 'casino', 'roll'],
  desc: 'Gamble your cash - 50/50 chance to double or lose',
  usage: '<amount | all | half>',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED FOR THIS GROUP
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

    // 2. CHECK AMOUNT INPUT
    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}gamble <amount>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}bet 1000
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}gamble all
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}gamble half
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const lastGambleKey = `eco_${groupId}_lastgamble_${sender}`
    const winStreakKey = `eco_${groupId}_gamblewin_${sender}`
    const lossStreakKey = `eco_${groupId}_gambleloss_${sender}`

    // 4. FETCH DATA FROM DB
    const [
      balance,
      lastGamble,
      winStreak,
      lossStreak,
      currency,
      jailTime
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(lastGambleKey),
      db.get(winStreakKey),
      db.get(lossStreakKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.get(`eco_${groupId}_jail_${sender}`)
    ])

    const currentBalance = balance || 0
    const currencySymbol = currency || '$'

    // 5. CHECK JAIL STATUS
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ɢᴀᴍʙʟɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CHECK COOLDOWN - 30 SECONDS
    const now = Date.now()
    const cooldown = 30 * 1000 // 30sec
    const timeLeft = lastGamble? (lastGamble + cooldown) - now : 0

    if (lastGamble && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ sʟᴏᴡ ᴅᴏᴡɴ ɢᴀᴍʙʟᴇʀ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ 🎲 ᴡɪɴ sᴛʀᴇᴀᴋ: ${winStreak || 0}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. PARSE AMOUNT
    const amount = parseAmount(args[0], currentBalance)

    if (amount === null || amount <= 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴍᴜsᴛ ʙᴇ ᴘᴏsɪᴛɪᴠᴇ ɴᴜᴍʙᴇʀ
┃➠ ᴏʀ ᴜsᴇ: all, half
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. CHECK MIN/MAX BET
    if (amount < 100) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪɴ ʙᴇᴛ: ${currencySymbol}100
┃
┃➠ ʏᴏᴜ ᴛʀɪᴇᴅ: ${currencySymbol}${formatCash(amount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (amount > 1000000) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍᴀx ʙᴇᴛ: ${currencySymbol}1,000,000
┃
┃➠ ʏᴏᴜ ᴛʀɪᴇᴅ: ${currencySymbol}${formatCash(amount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 9. CHECK IF ENOUGH BALANCE
    if (amount > currentBalance) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ᴄᴀsʜ: ${currencySymbol}${formatCash(currentBalance)}
┃➠ 🎲 ʏᴏᴜ ᴛʀɪᴇᴅ: ${currencySymbol}${formatCash(amount)}
┃
┃➠ ɴᴇᴅ: ${currencySymbol}${formatCash(amount - currentBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 10. GAMBLE LOGIC - 50/50
    const win = Math.random() >= 0.5
    let newBalance, newWinStreak, newLossStreak
    let resultEmoji, resultText

    if (win) {
      // WIN - DOUBLE MONEY
      newBalance = currentBalance + amount
      newWinStreak = (winStreak || 0) + 1
      newLossStreak = 0
      resultEmoji = '🎉'
      resultText = 'ᴡᴏɴ'
    } else {
      // LOSE - LOSE MONEY
      newBalance = currentBalance - amount
      newLossStreak = (lossStreak || 0) + 1
      newWinStreak = 0
      resultEmoji = '💀'
      resultText = 'ʟᴏsᴛ'
    }

    // 11. UPDATE DB
    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(lastGambleKey, now),
      db.set(winStreakKey, newWinStreak),
      db.set(lossStreakKey, newLossStreak)
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

    // 13. SEND GAMBLE RESULT
    await sock.sendMessage(from, {
      text: `╔═〘 ${resultEmoji}ɢᴀᴍʙʟᴇ 〙═╗
┃➠ ʏᴏᴜ ${resultText} ᴛʜᴇ ʙᴇᴛ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 🎲 ʙᴇᴛ: ${currencySymbol}${formatCash(amount)}
┃➠ 💰 ${resultText.toUpperCase()}: ${currencySymbol}${formatCash(amount)}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ 🔥 ᴡɪɴ sᴛʀᴇᴀᴋ: ${newWinStreak}
┃➠ 💀 ʟᴏss sᴛʀᴇᴀᴋ: ${newLossStreak}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 30s
╚═══════════════════╝

╭━━━━❮ ɪɴғᴏ ❯━⊷
┃➠ 50/50 ᴄʜᴀɴᴄᴇ ᴛᴏ ᴡɪɴ
┃➠ ᴍɪɴ ʙᴇᴛ: ${currencySymbol}100
┃➠ ᴍᴀx ʙᴇᴛ: ${currencySymbol}1,000,000
┃➠ ${prefix}bank - Check balance
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}