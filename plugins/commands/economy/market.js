/**
 * SwiftBot - plugins/commands/economy/market.js
 * Group-Based Marketplace - View listings with simple numeric IDs
 * Uses db keys: eco_${groupJid}_market_list, eco_${groupJid}_balance_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h`
  }
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export default {
  name: 'market',
  alias: ['marketplace', 'listings', 'mkt'],
  desc: 'View marketplace listings from other players',
  usage: '[page]',
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
    const marketListKey = `eco_${groupId}_market_list`
    const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

    // 2. GET MARKETPLACE LISTINGS
    const marketList = await db.get(marketListKey) || []

    // 3. CHECK IF EMPTY
    if (marketList.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 🏪ᴍᴀʀᴋᴇᴛ 〙═╗
┃➠ ᴍᴀʀᴋᴇᴛᴘʟᴀᴄᴇ ᴇᴍᴘᴛʏ
┃
┃➠ ɴᴏ ɪᴛᴇᴍs ʟɪsᴛᴇᴅ ʏᴇᴛ
┃➠ ᴜsᴇ ${prefix}sell ᴛᴏ ʟɪsᴛ ɪᴛᴇᴍs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 5. PAGINATION - 10 per page
    const page = parseInt(args[0]) || 1
    const perPage = 10
    const totalPages = Math.ceil(marketList.length / perPage)
    const startIdx = (page - 1) * perPage
    const endIdx = startIdx + perPage
    const pageListings = marketList.slice(startIdx, endIdx)

    if (pageListings.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴘᴀɢᴇ
┃
┃➠ ᴛᴏᴛᴀʟ ᴘᴀɢᴇs: ${totalPages}
┃➠ ᴜsᴇ ${prefix}market <page>
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. BUILD LISTING TEXT - SIMPLE NUMERIC IDs
    let listingText = `╔═〘 🏪ᴍᴀʀᴋᴇᴛ 〙═╗
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃➠ ᴘᴀɢᴇ ${page}/${totalPages} | ${marketList.length} ʟɪsᴛɪɴɢs
┃
`

    for (const listing of pageListings) {
      const timeAgo = formatTime(Date.now() - listing.timestamp)
      const sellerTag = listing.seller.split('@')[0]
      listingText += `┃➠ ━━━ ID: ${listing.id} ━━━\n`
      listingText += `┃➠ ${listing.emoji} ${listing.itemName} x${listing.amount}\n`
      listingText += `┃➠ 💰 ᴘʀɪᴄᴇ: ${currency}${formatCash(listing.price)} (${currency}${formatCash(listing.pricePerUnit)} ᴇᴀ)\n`
      listingText += `┃➠ 👤 sᴇʟʟᴇʀ: @${sellerTag}\n`
      listingText += `┃➠ ⏰ ${timeAgo} ᴀɢᴏ\n┃\n`
    }

    listingText += `╚═══════════════════╝

╭━━━━❮ ʜᴏᴡ ᴛᴏ ʙᴜʏ ❯━⊷
┃➠ ${prefix}pay <id>
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}pay 1
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}pay 5
┃
┃➠ ${prefix}market <page> ғᴏʀ ᴍᴏʀᴇ
┃➠ ${prefix}sell ᴛᴏ ʟɪsᴛ ʏᴏᴜʀ ɪᴛᴇᴍs
╰━━━━━━━━━━━━━━━━━⊷`

    // 7. GET ALL MENTIONS FOR SELLERS
    const mentions = pageListings.map(l => l.seller)

    await sock.sendMessage(from, {
      text: listingText,
      mentions: mentions
    }, { quoted: m })
  }
}