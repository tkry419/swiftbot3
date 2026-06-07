/**
 * SwiftBot - plugins/commands/economy/coinflip.js
 * Group-Based Coinflip - 50/50 Double or Nothing
 * Uses db keys: eco_${groupJid}_balance_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

export default {
  name: 'coinflip',
  alias: ['cf', 'flip', 'coin'],
  desc: 'Flip a coin - 50/50 double your money or lose it',
  usage: '<heads|tails> <amount>',
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

    // 2. CHECK CHOICE
    const choice = args[0]?.toLowerCase()
    if (!choice ||!['heads', 'h', 'tails', 't'].includes(choice)) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴄʜᴏɪᴄᴇ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}coinflip <heads|tails> <amount>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}cf heads 1000
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}flip t 500
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. CHECK BET AMOUNT
    const betAmount = parseInt(args[1])
    if (!betAmount || isNaN(betAmount)) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ʙᴇᴛ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}coinflip ${choice} <amount>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}cf heads 1000
┃➠ ᴍɪɴ: 50 | ᴍᴀx: 100000
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (betAmount < 50) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʙᴇᴛ ᴛᴏ sᴍᴀʟ
┃
┃➠ ᴍɪɴɪᴍᴜᴍ ʙᴇᴛ: 50
┃➠ ʏᴏᴜʀ ʙᴇᴛ: ${formatCash(betAmount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (betAmount > 100000) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʙᴇᴛ ᴛᴏᴏ ʟᴀʀɢᴇ
┃
┃➠ ᴍᴀxɪᴍᴜᴍ ʙᴇᴛ: 100,000
┃➠ ʏᴏᴜʀ ʙᴇᴛ: ${formatCash(betAmount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. NORMALIZE CHOICE
    const userChoice = ['heads', 'h'].includes(choice)? 'heads' : 'tails'

    // 5. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 6. FETCH DATA
    const [balance, jailTime, currency] = await Promise.all([
      db.get(balanceKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currentBalance = balance || 0
    const currencySymbol = currency || '$'

    // 7. CHECK JAIL
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

    // 8. CHECK BALANCE
    if (currentBalance < betAmount) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(currentBalance)}
┃➠ 🪙 ʙᴇᴛ: ${currencySymbol}${formatCash(betAmount)}
┃➠ ɴᴇᴇᴅ: ${currencySymbol}${formatCash(betAmount - currentBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 9. FLIP COIN - 50/50
    const coinResult = Math.random() < 0.5? 'heads' : 'tails'
    const won = userChoice === coinResult
    const profit = won? betAmount : -betAmount
    const newBalance = currentBalance + profit

    // 10. UPDATE DB
    await db.set(balanceKey, newBalance)

    // 11. SEND RESULT
    const resultEmoji = won? '🎉' : '💸'
    const resultText = won? 'YOU WON!' : 'YOU LOST'
    const coinEmoji = coinResult === 'heads'? '👑' : '🔘'

    await sock.sendMessage(from, {
      text: `╔═〘 🪙ᴄᴏɪɴғʟɪᴘ 〙═╗
┃➠ ʏᴏᴜ ᴄʜᴏsᴇ: ${userChoice.toUpperCase()}
┃➠ ᴄᴏɪɴ ʟᴀɴᴅᴇᴅ: ${coinResult.toUpperCase()} ${coinEmoji}
┃
┃➠ ${resultEmoji} ${resultText}
┃➠ 💰 ʙᴇᴛ: ${currencySymbol}${formatCash(betAmount)}
┃➠ 📊 ᴘʀᴏғɪᴛ: ${profit >= 0? '+' : ''}${currencySymbol}${formatCash(profit)}
┃
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
╚═══════════════════╝

╭━━━━❮ ᴏᴅs ❯━⊷
┃➠ 50% ᴄʜᴀɴᴄᴇ ᴛᴏ ᴡɪɴ
┃➠ ᴡɪɴ = ᴅᴏᴜʙʟᴇ ʏᴏᴜʀ ʙᴇᴛ
┃➠ ʟᴏsᴇ = ʟᴏsᴇ ʏᴏᴜʀ ʙᴇᴛ
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}