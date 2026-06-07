/**
 * SwiftBot - plugins/commands/economy/slots.js
 * Group-Based Slot Machine - 3 Reels, Multiple Payouts
 * Uses db keys: eco_${groupJid}_balance_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

// SLOT SYMBOLS WITH WEIGHTS
const SLOTS = [
  { symbol: '🍒', weight: 30, name: 'Cherry' },
  { symbol: '🍋', weight: 25, name: 'Lemon' },
  { symbol: '🍊', weight: 20, name: 'Orange' },
  { symbol: '🍇', weight: 15, name: 'Grape' },
  { symbol: '💎', weight: 7, name: 'Diamond' },
  { symbol: '7️⃣', weight: 3, name: 'Seven' }
]

// PAYOUT MULTIPLIERS
const PAYOUTS = {
  '🍒🍒🍒': 2,    // 2x
  '🍋🍋🍋': 3,    // 3x
  '🍊🍊🍊': 4,    // 4x
  '🍇🍇🍇': 5,    // 5x
  '💎💎💎': 10,   // 10x
  '7️⃣7️⃣7️⃣': 25,  // 25x JACKPOT
  '🍒🍒': 1.5,    // 1.5x for 2 cherries
  '💎💎': 2,      // 2x for 2 diamonds
}

export default {
  name: 'slots',
  alias: ['slot', 'spin', '777'],
  desc: 'Play slot machine - match 3 to win big',
  usage: '<amount>',
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

    // 2. CHECK BET AMOUNT
    const betAmount = parseInt(args[0])
    if (!betAmount || isNaN(betAmount)) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ʙᴇᴛ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}slots <amount>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}slots 1000
┃➠ ᴍɪɴ: 100 | ᴍᴀx: 50000
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (betAmount < 100) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʙᴇᴛ ᴛᴏ sᴍᴀʟ
┃
┃➠ ᴍɪɴɪᴍᴜᴍ ʙᴇᴛ: 100
┃➠ ʏᴏᴜʀ ʙᴇᴛ: ${formatCash(betAmount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (betAmount > 50000) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʙᴇᴛ ᴛᴏᴏ ʟᴀʀɢᴇ
┃
┃➠ ᴍᴀxɪᴍᴜᴍ ʙᴇᴛ: 50,000
┃➠ ʏᴏᴜʀ ʙᴇᴛ: ${formatCash(betAmount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 4. FETCH DATA
    const [balance, jailTime, currency] = await Promise.all([
      db.get(balanceKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currentBalance = balance || 0
    const currencySymbol = currency || '$'

    // 5. CHECK JAIL
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

    // 6. CHECK BALANCE
    if (currentBalance < betAmount) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(currentBalance)}
┃➠ 🎰 ʙᴇᴛ: ${currencySymbol}${formatCash(betAmount)}
┃➠ ɴᴇᴇᴅ: ${currencySymbol}${formatCash(betAmount - currentBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. SPIN SLOTS - WEIGHTED RANDOM
    const spinReel = () => {
      const totalWeight = SLOTS.reduce((sum, s) => sum + s.weight, 0)
      let random = Math.random() * totalWeight
      for (const slot of SLOTS) {
        random -= slot.weight
        if (random <= 0) return slot.symbol
      }
      return SLOTS[0].symbol
    }

    const reel1 = spinReel()
    const reel2 = spinReel()
    const reel3 = spinReel()
    const result = reel1 + reel2 + reel3

    // 8. CALCULATE WINNINGS
    let multiplier = 0
    let winType = 'LOSS'

    // Check 3 match first
    if (PAYOUTS[result]) {
      multiplier = PAYOUTS[result]
      winType = multiplier >= 10? 'JACKPOT' : 'WIN'
    } 
    // Check 2 match for cherry/diamond
    else if (reel1 === reel2 && PAYOUTS[reel1 + reel2]) {
      multiplier = PAYOUTS[reel1 + reel2]
      winType = 'MINI_WIN'
    }
    else if (reel2 === reel3 && PAYOUTS[reel2 + reel3]) {
      multiplier = PAYOUTS[reel2 + reel3]
      winType = 'MINI_WIN'
    }

    const winnings = Math.floor(betAmount * multiplier)
    const profit = winnings - betAmount
    const newBalance = currentBalance + profit

    // 9. UPDATE DB
    await db.set(balanceKey, newBalance)

    // 10. SEND RESULT
    let resultText = ''
    let resultEmoji = ''

    if (winType === 'JACKPOT') {
      resultEmoji = '🎰'
      resultText = `JACKPOT!!! ${multiplier}x`
    } else if (winType === 'WIN') {
      resultEmoji = '🎉'
      resultText = `BIG WIN! ${multiplier}x`
    } else if (winType === 'MINI_WIN') {
      resultEmoji = '✨'
      resultText = `NICE! ${multiplier}x`
    } else {
      resultEmoji = '💸'
      resultText = 'YOU LOST'
    }

    await sock.sendMessage(from, {
      text: `╔═〘 🎰sʟᴏᴛs 〙═╗
┃➠ [ ${reel1} | ${reel2} | ${reel3} ]
┃➠ ${resultEmoji} ${resultText}
┃
┃➠ 💰 ʙᴇᴛ: ${currencySymbol}${formatCash(betAmount)}
┃➠ 💵 ᴡᴏɴ: ${currencySymbol}${formatCash(winnings)}
┃➠ 📊 ᴘʀᴏғɪᴛ: ${profit >= 0? '+' : ''}${currencySymbol}${formatCash(profit)}
┃
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
╚═══════════════════╝

╭━━━━❮ ᴘᴀʏᴏᴜᴛs ❯━⊷
┃➠ 🍒🍒🍒 = 2x
┃➠ 🍋🍋🍋 = 3x
┃➠ 🍊🍊🍊 = 4x
┃➠ 🍇🍇🍇 = 5x
┃➠ 💎💎💎 = 10x
┃➠ 7️⃣7️⃣7️⃣ = 25x JACKPOT
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}