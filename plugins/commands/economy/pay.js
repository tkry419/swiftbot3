/**
 * SwiftBot - plugins/commands/economy/pay.js
 * Group-Based Marketplace Purchase Only - 5% tax
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_market_list
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

export default {
  name: 'pay',
  alias: ['purchase'],
  desc: 'Buy items from marketplace - 5% tax',
  usage: '<listing_id>',
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

    const groupId = isGroup? from : 'global'
    const senderBalanceKey = `eco_${groupId}_balance_${sender}`
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 2. CHECK LISTING ID
    const listingId = args[0]
    if (!listingId) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ʟɪsᴛɪɴɢ ɪᴅ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}pay <listing_id>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}pay 1699999999_user
┃➠ ᴜsᴇ ${prefix}market ᴛᴏ sᴇᴇ ɪᴅs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. GET MARKETPLACE
    const marketListKey = `eco_${groupId}_market_list`
    const marketList = await db.get(marketListKey) || []
    const listingIdx = marketList.findIndex(l => l.id === listingId)

    if (listingIdx === -1) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʟɪsᴛɪɴɢ ɴᴏᴛ ғᴏᴜɴᴅ
┃
┃➠ ɪᴅ: ${listingId}
┃➠ ᴍᴀʏʙᴇ sᴏʟᴅ ᴏʀ ᴇxᴘɪʀᴇᴅ
┃➠ ᴜsᴇ ${prefix}market ᴛᴏ ʀᴇғʀᴇsʜ
╚═══════════════════╝`
      }, { quoted: m })
    }

    const listing = marketList[listingIdx]
    const seller = listing.seller

    if (seller === sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ʙᴜʏ ʏᴏᴜʀ ᴏᴡɴ ʟɪsᴛɪɴɢ
┃
┃➠ ᴜsᴇ ${prefix}unlist ${listingId} ᴛᴏ ʀᴇᴍᴏᴠᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. FETCH BALANCES
    const [
      senderBalance,
      sellerBalance,
      senderJail,
      sellerJail
    ] = await Promise.all([
      db.get(senderBalanceKey),
      db.get(`eco_${groupId}_balance_${seller}`),
      db.get(`eco_${groupId}_jail_${sender}`),
      db.get(`eco_${groupId}_jail_${seller}`)
    ])

    const currentSenderBalance = senderBalance || 0
    const currentSellerBalance = sellerBalance || 0

    // 5. CHECK JAIL
    if (senderJail && Date.now() < senderJail) {
      const remaining = Math.ceil((senderJail - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴘᴜʀᴄʜᴀsᴇs ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (sellerJail && Date.now() < sellerJail) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ sᴇʟᴇʀ ɪs ɪɴ ᴊᴀɪʟ
┃
┃➠ ᴄᴀɴ'ᴛ ʙᴜʏ ғʀᴏᴍ ᴊᴀɪʟᴇᴅ ᴜsᴇʀs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CHECK BALANCE
    const totalCost = listing.price
    if (totalCost > currentSenderBalance) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴsᴜғɪᴄɪᴇɴᴛ ғᴜɴᴅs
┃
┃➠ 💰 ᴄᴀsʜ: ${currency}${formatCash(currentSenderBalance)}
┃➠ 💸 ᴄᴏsᴛ: ${currency}${formatCash(totalCost)}
┃
┃➠ ɴᴇᴅ: ${currency}${formatCash(totalCost - currentSenderBalance)} ᴍᴏʀᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. CALCULATE TAX - 5%
    const tax = Math.floor(totalCost * 0.05)
    const sellerReceives = totalCost - tax

    // 8. UPDATE DB - TRANSFER CASH, MOVE ITEM, REMOVE LISTING
    const buyerInvKey = `eco_${groupId}_inv_${sender}_${listing.itemKey}`
    const sellerBalanceKey = `eco_${groupId}_balance_${seller}`

    const currentBuyerInv = await db.get(buyerInvKey) || 0
    const newBuyerInv = currentBuyerInv + listing.amount
    const newSenderBalance = currentSenderBalance - totalCost
    const newSellerBalance = currentSellerBalance + sellerReceives

    marketList.splice(listingIdx, 1) // Remove listing

    await Promise.all([
      db.set(senderBalanceKey, newSenderBalance),
      db.set(sellerBalanceKey, newSellerBalance),
      db.set(buyerInvKey, newBuyerInv),
      db.set(marketListKey, marketList)
    ])

    // 9. IF BACKGROUND, ADD TO BUYER'S COLLECTION
    if (listing.bgKey) {
      const bgKey = `eco_${groupId}_bg_${sender}_${listing.bgKey}`
      await db.set(bgKey, true)
    }

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

    // 11. SEND RECEIPT
    await sock.sendMessage(from, {
      text: `╔═〘 🛒ᴘᴜʀᴄʜᴀsᴇᴅ 〙═╗
┃➠ ᴍᴀʀᴋᴇᴛ ᴘᴜʀᴄʜᴀsᴇ sᴜᴄᴇss
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ ${listing.emoji} ɪᴛᴇᴍ: ${listing.itemName}
┃➠ 📦 ǫᴜᴀɴᴛɪᴛʏ: x${listing.amount}
┃➠ 💵 ᴘʀɪᴄᴇ ᴘᴀɪᴅ: ${currency}${formatCash(totalCost)}
┃➠ 💸 ᴛᴀx (5%): ${currency}${formatCash(tax)}
┃➠ 💰 sᴇʟʟᴇʀ ɢᴏᴛ: ${currency}${formatCash(sellerReceives)}
┃
┃➠ 👤 ʙᴜʏᴇʀ: @${sender.split('@')[0]}
┃➠ 👤 sᴇʟᴇʀ: @${seller.split('@')[0]}
┃
┃➠ 📦 ɴᴇᴡ ɪɴᴠ: ${newBuyerInv} ${listing.itemName}
┃➠ 💰 ʏᴏᴜʀ ʙᴀʟᴀɴᴄᴇ: ${currency}${formatCash(newSenderBalance)}
╚═══════════════════╝

╭━━━━❮ ɪɴғᴏ ❯━⊷
┃➠ ɪᴛᴇᴍ ᴀᴅᴇᴅ ᴛᴏ ɪɴᴠᴇɴᴛᴏʀʏ
┃➠ sᴇʟʟᴇʀ ʀᴇᴄᴇɪᴠᴇᴅ ᴘᴀʏᴍᴇɴᴛ
┃➠ ${prefix}inv - Check inventory
╰━━━━━━━━━━━━━━━━━⊷`,
      mentions: [sender, seller]
    }, { quoted: m })
  }
}