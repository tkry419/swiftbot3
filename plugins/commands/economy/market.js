/**
 * SwiftBot - plugins/commands/economy/market.js
 * Group-Based Marketplace - View and buy player listings
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
  return `${hours}h ${minutes}m`
}

export default {
  name: 'market',
  alias: ['marketplace', 'listings', 'mkt'],
  desc: 'View marketplace listings from other players',
  usage: '[page] | buy <listing_id>',
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

    // 4. PAGINATION
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

    // 5. BUILD LISTING TEXT
    let listingText = `╔═〘 🏪ᴍᴀʀᴋᴇᴛ 〙═╗\n┃➠ ᴘᴀɢᴇ ${page}/${totalPages} | ${marketList.length} ʟɪsᴛɪɴɢs\n┃\n`

    for (const listing of pageListings) {
      const timeAgo = formatTime(Date.now() - listing.timestamp)
      const sellerTag = listing.seller.split('@')[0]
      listingText += `┃➠ ${listing.emoji} ${listing.itemName} x${listing.amount}\n`
      listingText += `┃➠ 💰 ᴘʀɪᴄᴇ: ${currency}${formatCash(listing.price)} (${currency}${formatCash(listing.pricePerUnit)} ᴇᴀ)\n`
      listingText += `┃➠ 👤 sᴇʟʟᴇʀ: @${sellerTag}\n`
      listingText += `┃➠ 🆔 ɪᴅ: ${listing.id}\n`
      listingText += `┃➠ ⏰ ${timeAgo} ᴀɢᴏ\n┃\n`
    }

    listingText += `╚═══════════════════╝\n\n╭━━━━❮ ɪɴғᴏ ❯━⊷\n`
    listingText += `┃➠ ᴜsᴇ ${prefix}pay @seller ${currency}amount ᴛᴏ ʙᴜʏ\n`
    listingText += `┃➠ ᴏʀ ${prefix}pay ${prefix}buy <id> ᴛᴏ ʙᴜʏ\n`
    listingText += `┃➠ ᴜsᴇ ${prefix}market <page> ғᴏʀ ᴍᴏʀᴇ\n`
    listingText += `┃➠ ${prefix}sell ᴛᴏ ʟɪsᴛ ʏᴏᴜʀ ɪᴛᴇᴍs\n╰━━━━━━━━━━━━━━━━━⊷`

    // 6. GET ALL MENTIONS FOR SELLERS
    const mentions = pageListings.map(l => l.seller)

    await sock.sendMessage(from, {
      text: listingText,
      mentions: mentions
    }, { quoted: m })
  }
}