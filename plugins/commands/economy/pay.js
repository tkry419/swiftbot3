/**
 * SwiftBot - plugins/commands/economy/pay.js
 * Group-Based Money Transfer System with 5% Tax
 * Uses db keys: eco_${groupJid}_balance_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
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
  name: 'pay',
  alias: ['give', 'transfer', 'send'],
  desc: 'Transfer cash to another user - 5% tax',
  usage: '@user <amount>',
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

    // 2. CHECK MENTION & AMOUNT
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const replied = m.message?.extendedTextMessage?.contextInfo?.participant
    const target = mentioned || replied

    if (!target) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴛᴀʀɢᴇᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}pay @user <amount>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}pay @user 1000
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (target === sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ᴘᴀʏ ʏᴏᴜʀsᴇʟғ
┃
┃➠ ᴛʀʏ ᴘᴀʏɪɴɢ sᴏᴍᴇᴏɴᴇ ᴇʟsᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (!args[1]) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}pay @user <amount>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}pay @user 500
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const senderBalanceKey = `eco_${groupId}_balance_${sender}`
    const targetBalanceKey = `eco_${groupId}_balance_${target}`

    // 4. FETCH DATA FROM DB
    const [
      senderBalance,
      targetBalance,
      currency,
      senderJail,
      targetJail
    ] = await Promise.all([
      db.get(senderBalanceKey),
      db.get(targetBalanceKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.get(`eco_${groupId}_jail_${sender}`),
      db.get(`eco_${groupId}_jail_${target}`)
    ])

    const currentSenderBalance = senderBalance || 0
    const currentTargetBalance = targetBalance || 0
    const currencySymbol = currency || '$'

    // 5. CHECK JAIL STATUS
    if (senderJail && Date.now() < senderJail) {
      const remaining = Math.ceil((senderJail - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴛʀᴀɴsғᴇʀs ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (targetJail && Date.now() < targetJail) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ɪɴ ᴊᴀɪʟ
┃
┃➠ ᴄᴀɴ'ᴛ sᴇɴᴅ ᴍᴏɴᴇʏ ᴛᴏ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. PARSE AMOUNT
    const amount = parseAmount(args[1], currentSenderBalance)

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

    // 7. CHECK IF ENOUGH BALANCE
    if (amount > currentSenderBalance) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ᴄᴀsʜ: ${currencySymbol}${formatCash(currentSenderBalance)}
┃➠ 📤 ʏᴏᴜ ᴛʀɪᴇᴅ: ${currencySymbol}${formatCash(amount)}
┃
┃➠ ɴᴇᴅ: ${currencySymbol}${formatCash(amount - currentSenderBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. CALCULATE TAX - 5%
    const tax = Math.floor(amount * 0.05)
    const receivedAmount = amount - tax

    // 9. UPDATE DB
    const newSenderBalance = currentSenderBalance - amount
    const newTargetBalance = currentTargetBalance + receivedAmount

    await Promise.all([
      db.set(senderBalanceKey, newSenderBalance),
      db.set(targetBalanceKey, newTargetBalance)
    ])

    // 10. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 11. SEND TRANSFER RECEIPT
    await sock.sendMessage(from, {
      text: `╔═〘 💸ᴛʀᴀɴsғᴇʀ 〙═╗
┃➠ ᴛʀᴀɴsᴀᴄᴛɪᴏɴ sᴜᴄᴄᴇss
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 📤 sᴇɴᴛ: ${currencySymbol}${formatCash(amount)}
┃➠ 💸 ᴛᴀx (5%): ${currencySymbol}${formatCash(tax)}
┃➠ 📥 ʀᴇᴄᴇɪᴠᴇᴅ: ${currencySymbol}${formatCash(receivedAmount)}
┃
┃➠ 👤 ғʀᴏᴍ: @${sender.split('@')[0]}
┃➠ 👤 ᴛᴏ: @${target.split('@')[0]}
┃
┃➠ 💰 ʏᴏᴜʀ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
╚═══════════════════╝

╭━━━━❮ ɪɴғᴏ ❯━⊷
┃➠ ᴛʀᴀɴsғᴇʀs ʜᴀᴠᴇ 5% ᴛᴀx
┃➠ ᴏɴʟʏ ᴄᴀsʜ ᴄᴀɴ ʙᴇ sᴇɴᴛ
┃➠ ${prefix}bank - Check balance
╰━━━━━━━━━━━━━━━━━⊷`,
      mentions: [sender, target]
    }, { quoted: m })
  }
}