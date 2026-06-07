/**
 * SwiftBot - plugins/commands/economy/deposit.js
 * Group-Based Bank Deposit System with 2% Fee
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_bank_${user}
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
  name: 'deposit',
  alias: ['dep', 'bank', 'save'],
  desc: 'Deposit cash to bank - 2% fee, safe from rob',
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
┃➠ ᴜsᴀɢᴇ: ${prefix}deposit <amount>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}dep 1000
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}dep all
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}dep half
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const bankKey = `eco_${groupId}_bank_${sender}`

    // 4. FETCH DATA FROM DB
    const [
      balance,
      bank,
      currency,
      jailTime
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(bankKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.get(`eco_${groupId}_jail_${sender}`)
    ])

    const currentBalance = balance || 0
    const currentBank = bank || 0
    const currencySymbol = currency || '$'

    // 5. CHECK JAIL STATUS
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ʙᴀɴᴋɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. PARSE AMOUNT
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

    // 7. CHECK IF ENOUGH BALANCE
    if (amount > currentBalance) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ᴄᴀsʜ: ${currencySymbol}${formatCash(currentBalance)}
┃➠ 📥 ʏᴏᴜ ᴛʀɪᴇᴅ: ${currencySymbol}${formatCash(amount)}
┃
┃➠ ɴᴇᴅ: ${currencySymbol}${formatCash(amount - currentBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. CALCULATE FEE - 2%
    const fee = Math.floor(amount * 0.02)
    const depositAmount = amount - fee

    // 9. UPDATE DB
    const newBalance = currentBalance - amount
    const newBank = currentBank + depositAmount

    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(bankKey, newBank)
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

    // 11. SEND DEPOSIT RECEIPT
    await sock.sendMessage(from, {
      text: `╔═〘 🏦ᴅᴇᴘᴏsɪᴛ 〙═╗
┃➠ ᴛʀᴀɴsᴀᴄᴛɪᴏɴ sᴜᴄᴄᴇss
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💵 ᴀᴍᴏᴜɴᴛ: ${currencySymbol}${formatCash(amount)}
┃➠ 💸 ғᴇᴇ (2%): ${currencySymbol}${formatCash(fee)}
┃➠ ✅ ᴅᴇᴘᴏsɪᴛᴇᴅ: ${currencySymbol}${formatCash(depositAmount)}
┃
┃➠ 💰 ɴᴇᴡ ᴄᴀsʜ: ${currencySymbol}${formatCash(newBalance)}
┃➠ 🏦 ɴᴇᴡ ʙᴀɴᴋ: ${currencySymbol}${formatCash(newBank)}
╚═══════════════════╝

╭━━━━❮ ɪɴғᴏ ❯━⊷
┃➠ ʙᴀɴᴋ ɪs sᴀғᴇ ғʀᴏᴍ ʀᴏʙ
┃➠ ᴡɪᴛʜᴅʀᴀᴡ ғᴇᴇ: 2%
┃➠ ${prefix}bank - Check balance
╰━━━━━━━━━━━━━━━━━⊷

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ ᴛᴇᴄʜ*`
    }, { quoted: m })
  }
}