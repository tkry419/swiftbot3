/**
 * SwiftBot - plugins/commands/economy/marry.js
 * Marriage System - 10% income sharing + profile badge
 * Uses db keys: eco_${groupJid}_married_${user}, eco_${groupJid}_marriage_date_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const MARRIAGE_COST = 25000

export default {
  name: 'marry',
  alias: ['propose', 'wedding'],
  desc: 'Propose to someone - costs 25k, share 10% income',
  usage: '@user',
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
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const marriedKey = `eco_${groupId}_married_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`

    // 2. FETCH DATA
    const [balance, married, jailTime, currency] = await Promise.all([
      db.get(balanceKey),
      db.get(marriedKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currencySymbol = currency || '$'

    // 3. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴍᴀʀʀɪᴀɢᴇ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. CHECK ALREADY MARRIED
    if (married) {
      return await sock.sendMessage(from, {
        text: `╔═〘 💍ᴀʟʀᴇᴀᴅʏ ᴍᴀʀʀɪᴇᴅ 〙═╗
┃➠ ᴘᴀʀᴛɴᴇʀ: @${married.split('@')[0]}
┃➠ ᴜsᴇ ${prefix}divorce ᴛᴏ ᴇɴᴅ
╚═══════════════════╝`,
        mentions: [married]
      }, { quoted: m })
    }

    // 5. GET TARGET
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    if (!mentioned) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀɢ sᴏᴍᴇᴏɴᴇ ᴛᴏ ᴘʀᴏᴘᴏsᴇ
┃➠ ᴜsᴀɢᴇ: ${prefix}marry @user
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(MARRIAGE_COST)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (mentioned === sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ᴍᴀʀʀʏ ʏᴏᴜʀsᴇʟғ
┃➠ sᴇʟғ ʟᴏᴠᴇ ɪs ғʀᴇᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CHECK TARGET MARRIED
    const targetMarriedKey = `eco_${groupId}_married_${mentioned}`
    const targetMarried = await db.get(targetMarriedKey)
    if (targetMarried) {
      return await sock.sendMessage(from, {
        text: `╔═〘 💔ᴛᴀᴋᴇɴ 〙═╗
┃➠ @${mentioned.split('@')[0]} ɪs ᴍᴀʀʀɪᴇᴅ
┃➠ ᴛᴏ @${targetMarried.split('@')[0]}
╚═══════════════════╝`,
        mentions: [mentioned, targetMarried]
      }, { quoted: m })
    }

    // 7. CHECK CASH
    if (!balance || balance < MARRIAGE_COST) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴄᴀsʜ
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(MARRIAGE_COST)}
┃➠ ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance || 0)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 9. MARRY THEM - 10% income share activated
    const now = Date.now()
    await Promise.all([
      db.set(balanceKey, balance - MARRIAGE_COST),
      db.set(marriedKey, mentioned),
      db.set(targetMarriedKey, sender),
      db.set(`eco_${groupId}_marriage_date_${sender}`, now),
      db.set(`eco_${groupId}_marriage_date_${mentioned}`, now),
      db.set(`eco_${groupId}_marriage_cost_${sender}`, MARRIAGE_COST)
    ])

    await sock.sendMessage(from, {
      text: `╔═〘 💍ᴍᴀʀʀɪᴇᴅ 〙═╗
┃➠ ᴄᴏɴɢʀᴀᴛᴜʟᴀᴛɪᴏɴs
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 👰 @${sender.split('@')[0]}
┃➠ 🤵 @${mentioned.split('@')[0]}
┃
┃➠ 💸 ᴄᴏsᴛ: ${currencySymbol}${formatCash(MARRIAGE_COST)}
┃➠ 💰 ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance - MARRIAGE_COST)}
┃
┃➠ 📊 ʙᴏɴᴜs: 10% ɪɴᴄᴏᴍᴇ sʜᴀʀᴇ
┃➠ 💎 sᴛᴀᴛᴜs: ʙᴏɴᴅᴇᴅ
┃➠ 📅 ᴅᴀᴛᴇ: ${new Date(now).toLocaleDateString()}
╚═══════════════════╝

╭━━━━❮ ᴘᴇʀᴋs ❯━⊷
┃➠ 10% ᴏғ ᴘᴀʀᴛɴᴇʀ's ᴡᴏʀᴋ/ғɪsʜ/ᴍɪɴᴇ
┃➠ ᴀᴜᴛᴏ-sᴇɴᴛ ᴛᴏ ʏᴏᴜʀ ʙᴀɴᴋ
┃➠ ${prefix}divorce ᴄᴏsᴛs 50ᴋ
╰━━━━━━━━━━━━━━━━━⊷`,
      mentions: [sender, mentioned]
    }, { quoted: m })
  }
}