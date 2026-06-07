/**
 * SwiftBot - plugins/commands/economy/rob.js
 * Group-Based Rob System with Image Response
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_jail_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  return `${hours}h ${minutes}m`
}

// IMAGE URLS - BADILISHA HIZI
const ROB_SUCCESS_IMG = 'https://i.imgur.com/4M7IWwP.jpg' // Picha ukiiba success
const ROB_FAIL_IMG = 'https://i.imgur.com/qZQZQZQ.jpg' // Picha ukishikwa
const ROB_JAIL_IMG = 'https://i.imgur.com/JAIL123.jpg' // Picha ukiwa jail

export default {
  name: 'rob',
  alias: ['steal', 'heist'],
  desc: 'Rob another user - 45% success chance, risk jail',
  usage: '@user',
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

    // 2. CHECK TARGET
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const replied = m.message?.extendedTextMessage?.contextInfo?.participant
    const target = mentioned || replied

    if (!target) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴛᴀʀɢᴇᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}rob @user
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}rob @user
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (target === sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ʀᴏʙ ʏᴏᴜʀsᴇʟғ
┃
┃➠ ᴛʀʏ ʀᴏʙʙɪɴɢ sᴏᴍᴇᴏɴᴇ ᴇʟsᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const senderBalanceKey = `eco_${groupId}_balance_${sender}`
    const targetBalanceKey = `eco_${groupId}_balance_${target}`
    const senderJailKey = `eco_${groupId}_jail_${sender}`
    const targetJailKey = `eco_${groupId}_jail_${target}`
    const lastRobKey = `eco_${groupId}_lastrob_${sender}`
    const robCountKey = `eco_${groupId}_robcount_${sender}`

    // 4. FETCH DATA FROM DB
    const [
      senderBalance,
      targetBalance,
      senderJail,
      targetJail,
      lastRob,
      robCount,
      currency
    ] = await Promise.all([
      db.get(senderBalanceKey),
      db.get(targetBalanceKey),
      db.get(senderJailKey),
      db.get(targetJailKey),
      db.get(lastRobKey),
      db.get(robCountKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currentSenderBalance = senderBalance || 0
    const currentTargetBalance = targetBalance || 0
    const currencySymbol = currency || '$'

    // 5. CHECK IF SENDER IN JAIL
    if (senderJail && Date.now() < senderJail) {
      const remaining = Math.ceil((senderJail - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        image: { url: ROB_JAIL_IMG },
        caption: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ᴀʟʀᴇᴀᴅʏ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ᴄᴀɴ'ᴛ ʀᴏʙ ғʀᴏᴍ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CHECK IF TARGET IN JAIL
    if (targetJail && Date.now() < targetJail) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ɪɴ ᴊᴀɪʟ
┃
┃➠ ᴄᴀɴ'ᴛ ʀᴏʙ ᴘᴇᴏᴘʟᴇ ɪɴ ᴊᴀɪʟ
┃➠ ᴛʜᴇʏ'ʀᴇ ᴀʟʀᴇᴀᴅʏ ʙʀᴏᴋᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. CHECK ROB COOLDOWN - 1 HOUR
    const now = Date.now()
    const cooldown = 60 * 60 * 1000 // 1hr
    const timeLeft = lastRob? (lastRob + cooldown) - now : 0

    if (lastRob && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ᴄᴏᴘs ᴀʀᴇ ᴡᴀᴛᴄʜɪɴɢ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ 🦹 ʀᴏʙs ᴅᴏɴᴇ: ${robCount || 0}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. CHECK IF TARGET HAS MONEY
    if (currentTargetBalance < 500) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ᴛᴏᴏ ʙʀᴏᴋᴇ
┃
┃➠ 💰 ᴛʜᴇʏ ʜᴀᴠᴇ: ${currencySymbol}${formatCash(currentTargetBalance)}
┃➠ ᴍɪɴ ᴛᴏ ʀᴏʙ: ${currencySymbol}500
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 9. ROB LOGIC - 45% SUCCESS
    const success = Math.random() < 0.45
    const newRobCount = (robCount || 0) + 1

    if (success) {
      // SUCCESS - STEAL 10-40% OF TARGET CASH
      const stealPercent = Math.random() * 0.3 + 0.1 // 10-40%
      const stolenAmount = Math.floor(currentTargetBalance * stealPercent)
      const newSenderBalance = currentSenderBalance + stolenAmount
      const newTargetBalance = currentTargetBalance - stolenAmount

      await Promise.all([
        db.set(senderBalanceKey, newSenderBalance),
        db.set(targetBalanceKey, newTargetBalance),
        db.set(lastRobKey, now),
        db.set(robCountKey, newRobCount)
      ])

      await sock.sendMessage(from, {
        image: { url: ROB_SUCCESS_IMG },
        caption: `╔═〘 🦹ʀᴏʙ sᴜᴄᴄᴇss 〙═╗
┃➠ ʏᴏᴜ ʀᴏʙʙᴇᴅ @${target.split('@')[0]}
┃
┃➠ 💰 sᴛᴏʟᴇɴ: ${currencySymbol}${formatCash(stolenAmount)}
┃➠ 💰 ʏᴏᴜʀ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
┃
┃➠ 🦹 ᴛᴏᴛᴀʟ ʀᴏʙs: ${newRobCount}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 1ʜ
╚═══════════════════╝`,
        mentions: [sender, target]
      }, { quoted: m })

    } else {
      // FAIL - GO TO JAIL 2-6 HOURS + FINE
      const jailTime = now + (Math.floor(Math.random() * 4 + 2) * 60 * 60 * 1000) // 2-6hrs
      const fine = Math.floor(currentSenderBalance * 0.1) // 10% fine
      const newSenderBalance = Math.max(0, currentSenderBalance - fine)

      await Promise.all([
        db.set(senderJailKey, jailTime),
        db.set(senderBalanceKey, newSenderBalance),
        db.set(lastRobKey, now),
        db.set(robCountKey, newRobCount)
      ])

      const jailHours = Math.ceil((jailTime - now) / 3600000)

      await sock.sendMessage(from, {
        image: { url: ROB_FAIL_IMG },
        caption: `╔═〘 🚨ᴄᴀᴜɢʜᴛ 〙═╗
┃➠ ʏᴏᴜ ғᴀɪʟᴇᴅ ᴛʜᴇ ʀᴏʙ
┃
┃➠ 👮 ᴄᴏᴘs ᴄᴀᴜɢʜᴛ ʏᴏᴜ
┃➠ 🚨 ᴊᴀɪʟ ᴛɪᴍᴇ: ${jailHours}ʜ
┃➠ 💸 ғɪɴᴇ: ${currencySymbol}${formatCash(fine)}
┃
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
╚═══════════════════╝`,
        mentions: [sender, target]
      }, { quoted: m })
    }
  }
}