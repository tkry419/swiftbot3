/**
 * SwiftBot - plugins/commands/economy/paybeg.js
 * Group-Based Beg Payment - Send money to begger
 * Uses db keys: eco_${groupJid}_beg_requests, eco_${groupJid}_balance_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

export default {
  name: 'paybeg',
  alias: ['sendbeg', 'givebeg'],
  desc: 'Send money to someone who begged you',
  usage: '<request_id>',
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

    const requestId = parseInt(args[0])
    if (!requestId) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ʀᴇǫᴜᴇsᴛ ɪᴅ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}paybeg <request_id>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}paybeg 1
╚═══════════════════╝`
      }, { quoted: m })
    }

    const groupId = isGroup? from : 'global'
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 2. GET BEG REQUEST
    const begRequestsKey = `eco_${groupId}_beg_requests`
    const begRequests = await db.get(begRequestsKey) || []
    const requestIdx = begRequests.findIndex(r => r.id === requestId)

    if (requestIdx === -1) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʀᴇǫᴜᴇsᴛ ɴᴏᴛ ғᴏᴜɴᴅ
┃
┃➠ ɪᴅ: ${requestId}
┃➠ ᴍᴀʏʙᴇ ᴇxᴘɪʀᴇᴅ ᴏʀ ᴄᴏᴍᴘʟᴇᴛᴇᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

    const request = begRequests[requestIdx]

    if (request.target!== sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ʏᴏᴜʀ ʀᴇǫᴜᴇsᴛ
┃
┃➠ ᴛʜɪs ʙᴇɢ ɪs ғᴏʀ: @${request.target.split('@')[0]}
╚═══════════════════╝`,
        mentions: [request.target]
      }, { quoted: m })
    }

    if (request.status!== 'pending') {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ${request.status}
┃
┃➠ ʀᴇǫᴜᴇsᴛ ɪᴅ: ${requestId}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. CHECK BALANCE
    const senderBalanceKey = `eco_${groupId}_balance_${sender}`
    const beggerBalanceKey = `eco_${groupId}_balance_${request.begger}`

    const [senderBalance, beggerBalance, senderJail] = await Promise.all([
      db.get(senderBalanceKey),
      db.get(beggerBalanceKey),
      db.get(`eco_${groupId}_jail_${sender}`)
    ])

    const currentSenderBalance = senderBalance || 0
    const currentBeggerBalance = beggerBalance || 0

    // 4. CHECK JAIL
    if (senderJail && Date.now() < senderJail) {
      const remaining = Math.ceil((senderJail - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴘᴀʏᴍᴇɴᴛs ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (currentSenderBalance < request.amount) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ᴄᴀsʜ: ${currency}${formatCash(currentSenderBalance)}
┃➠ 💸 ɴᴇᴇᴅᴇᴅ: ${currency}${formatCash(request.amount)}
┃
┃➠ ɴᴇᴅ: ${currency}${formatCash(request.amount - currentSenderBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. PROCESS PAYMENT - NO TAX ON BEG PAYMENTS
    const newSenderBalance = currentSenderBalance - request.amount
    const newBeggerBalance = currentBeggerBalance + request.amount

    begRequests[requestIdx].status = 'completed'
    begRequests[requestIdx].completedAt = Date.now()

    await Promise.all([
      db.set(senderBalanceKey, newSenderBalance),
      db.set(beggerBalanceKey, newBeggerBalance),
      db.set(begRequestsKey, begRequests)
    ])

    // 6. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 7. SEND RECEIPT
    await sock.sendMessage(from, {
      text: `╔═〘 ✅ᴘᴀɪᴅ 〙═╗
┃➠ ʙᴇɢ ᴘᴀʏᴍᴇɴᴛ sᴜᴄᴄᴇss
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 🙏 ᴛᴏ: @${request.begger.split('@')[0]}
┃➠ 💰 ᴀᴍᴏᴜɴᴛ: ${currency}${formatCash(request.amount)}
┃➠ 📝 ʀᴇᴀsᴏɴ: ${request.reason}
┃
┃➠ 💰 ʏᴏᴜʀ ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(newSenderBalance)}
┃➠ 💰 ᴛʜᴇɪʀ ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(newBeggerBalance)}
╚═══════════════════╝

╭━━━━❮ ɪɴғᴏ ❯━⊷
┃➠ ɴᴏ ᴛᴀx ᴏɴ ʙᴇɢ ᴘᴀʏᴍᴇɴᴛs
┃➠ ʏᴏᴜ ʜᴇʟᴘᴇᴅ sᴏᴍᴇᴏɴᴇ ᴏᴜᴛ
┃➠ ᴋᴀʀᴍᴀ +100
╰━━━━━━━━━━━━━━━━━⊷`,
      mentions: [sender, request.begger]
    }, { quoted: m })
  }
}