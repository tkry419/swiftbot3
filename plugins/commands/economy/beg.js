/**
 * SwiftBot - plugins/commands/economy/beg.js
 * Group-Based Begging System - Request money from others
 * Uses db keys: eco_${groupJid}_beg_${requestId}, eco_${groupJid}_balance_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export default {
  name: 'beg',
  alias: ['ask', 'plead'],
  desc: 'Beg someone for money - they can send via paybeg',
  usage: '@user <amount> [reason]',
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

    // 2. CHECK MENTION
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const replied = m.message?.extendedTextMessage?.contextInfo?.participant
    const target = mentioned || replied

    if (!target) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴛᴀʀɢᴇᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}beg @user <amount> [reason]
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}beg @user 1000 for food
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (target === sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ʙᴇɢ ʏᴏᴜʀsᴇʟғ
┃
┃➠ ᴛʀʏ ʙᴇɢɪɴɢ sᴏᴍᴇᴏɴᴇ ᴇʟsᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (!args[1]) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}beg @user <amount> [reason]
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}beg @user 500
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. PARSE AMOUNT
    const amount = parseInt(args[1])
    if (isNaN(amount) || amount <= 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ᴍᴜsᴛ ʙᴇ ᴘᴏsɪᴛɪᴠᴇ ɴᴜᴍʙᴇʀ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (amount > 100000) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴏᴏ ᴍᴜᴄʜ
┃
┃➠ ᴍᴀx ʙᴇɢ: 100,000
┃➠ ᴅᴏɴ'ᴛ ʙᴇ ɢʀᴇᴇᴅʏ
╚═══════════════════╝`
      }, { quoted: m })
    }

    const groupId = isGroup? from : 'global'
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'
    const reason = args.slice(2).join(' ') || 'No reason given'

    // 4. CHECK JAIL
    const [senderJail, targetJail] = await Promise.all([
      db.get(`eco_${groupId}_jail_${sender}`),
      db.get(`eco_${groupId}_jail_${target}`)
    ])

    if (senderJail && Date.now() < senderJail) {
      const remaining = Math.ceil((senderJail - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ʙᴇɢɪɴɢ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (targetJail && Date.now() < targetJail) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ɪɴ ᴊᴀɪʟ
┃
┃➠ ᴄᴀɴ'ᴛ ʙᴇɢ ғʀᴏᴍ ᴊᴀɪʟᴇᴅ ᴜsᴇʀs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK COOLDOWN - 5 MINUTES
    const lastBegKey = `eco_${groupId}_lastbeg_${sender}_${target}`
    const lastBeg = await db.get(lastBegKey)
    const cooldown = 5 * 60 * 1000 // 5 minutes

    if (lastBeg && Date.now() - lastBeg < cooldown) {
      const timeLeft = cooldown - (Date.now() - lastBeg)
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ᴡᴀɪᴛ ʙᴇғᴏʀᴇ ʙᴇɢɢɪɴɢ ᴀɢᴀɪɴ
┃
┃➠ ⏳ ᴄᴏᴍᴇ ʙᴀᴄᴋ ɪɴ: ${formatTime(timeLeft)}
┃➠ ᴛᴏ: @${target.split('@')[0]}
╚═══════════════════╝`,
        mentions: [target]
      }, { quoted: m })
    }

    // 6. CREATE BEG REQUEST
    const begRequestsKey = `eco_${groupId}_beg_requests`
    const begRequests = await db.get(begRequestsKey) || []
    const requestId = begRequests.length + 1

    const begRequest = {
      id: requestId,
      begger: sender,
      target: target,
      amount: amount,
      reason: reason,
      timestamp: Date.now(),
      status: 'pending'
    }

    begRequests.push(begRequest)
    await Promise.all([
      db.set(begRequestsKey, begRequests),
      db.set(lastBegKey, Date.now())
    ])

    // 7. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 8. NOTIFY BOTH IN GROUP
    await sock.sendMessage(from, {
      text: `╔═〘 🙏ʙᴇɢ ʀᴇǫᴜᴇsᴛ 〙═╗
┃➠ ʙᴇɢ sᴇɴᴛ sᴜᴄᴄᴇssғᴜʟʏ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 🙏 ʙᴇɢɢᴇʀ: @${sender.split('@')[0]}
┃➠ 💰 ᴀsᴋɪɴɢ: ${currency}${formatCash(amount)}
┃➠ 👤 ᴛᴀʀɢᴇᴛ: @${target.split('@')[0]}
┃
┃➠ 📝 ʀᴇᴀsᴏɴ: ${reason}
┃➠ 🆔 ʀᴇǫᴜᴇsᴛ ɪᴅ: ${requestId}
┃
┃➠ ᴛᴀʀɢᴇᴛ ʜᴀs ʙᴇᴇɴ ɴᴏᴛɪғɪᴇᴅ
╚═══════════════════╝

╭━━━━❮ ʜᴏᴡ ᴛᴏ ʀᴇsᴘᴏɴᴅ ❯━⊷
┃➠ @${target.split('@')[0]} ᴜsᴇ:
┃➠ ${prefix}paybeg ${requestId} ᴛᴏ sᴇɴᴅ
┃➠ ${prefix}decline ${requestId} ᴛᴏ ʀᴇғᴜsᴇ
╰━━━━━━━━━━━━━━━━━⊷`,
      mentions: [sender, target]
    }, { quoted: m })

    // 9. SEND DM TO TARGET
    try {
      await sock.sendMessage(target, {
        text: `╔═〘 🙏ʙᴇɢ ᴀʟᴇʀᴛ 〙═╗
┃➠ sᴏᴍᴇᴏɴᴇ ɪs ʙᴇɢɢɪɴɢ ʏᴏᴜ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 🙏 ғʀᴏᴍ: @${sender.split('@')[0]}
┃➠ 💰 ᴀᴍᴏᴜɴᴛ: ${currency}${formatCash(amount)}
┃➠ 📝 ʀᴇᴀsᴏɴ: ${reason}
┃
┃➠ 🆔 ʀᴇǫᴜᴇsᴛ ɪᴅ: ${requestId}
╚═══════════════════╝

╭━━━━❮ ʀᴇsᴘᴏɴᴅ ❯━⊷
┃➠ ${prefix}paybeg ${requestId} ᴛᴏ sᴇɴᴅ ᴍᴏɴᴇʏ
┃➠ ${prefix}decline ${requestId} ᴛᴏ ʀᴇғᴜsᴇ
┃➠ ɪɢɴᴏʀᴇ ᴛᴏ ᴅᴇᴄʟɪɴᴇ ᴀᴜᴛᴏ
╰━━━━━━━━━━━━━━━━━⊷`,
        mentions: [sender]
      })
    } catch {
      // DM failed, already notified in group
    }
  }
}