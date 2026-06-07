/**
 * SwiftBot - plugins/commands/economy/divorce.js
 * Divorce System - costs 50k, removes income sharing
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const DIVORCE_COST = 50000

export default {
  name: 'divorce',
  alias: ['breakup', 'split'],
  desc: 'End marriage - costs 50k',
  usage: '',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED - FIXED
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

    const [balance, married, jailTime, currency] = await Promise.all([
      db.get(balanceKey),
      db.get(marriedKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currencySymbol = currency || '$'

    // 2. CHECK JAIL - FIXED WITH "NO DIVORCE IN JAIL"
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴅɪᴠᴏʀᴄᴇ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (!married) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ᴍᴀʀʀɪᴇᴅ
┃➠ ᴜsᴇ ${prefix}marry @user
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (!balance || balance < DIVORCE_COST) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴄᴀsʜ
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(DIVORCE_COST)}
┃➠ ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance || 0)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    const targetMarriedKey = `eco_${groupId}_married_${married}`
    
    await Promise.all([
      db.set(balanceKey, balance - DIVORCE_COST),
      db.set(marriedKey, null),
      db.set(targetMarriedKey, null),
      db.set(`eco_${groupId}_marriage_date_${sender}`, null),
      db.set(`eco_${groupId}_marriage_date_${married}`, null),
      db.set(`eco_${groupId}_marriage_cost_${sender}`, null)
    ])

    await sock.sendMessage(from, {
      text: `╔═〘 💔ᴅɪᴠᴏʀᴄᴇᴅ 〙═╗
┃➠ ᴍᴀʀʀɪᴀɢᴇ ᴇɴᴅᴇᴅ
┃
┃➠ @${sender.split('@')[0]} 
┃➠ @${married.split('@')[0]}
┃
┃➠ 💸 ᴄᴏsᴛ: ${currencySymbol}${formatCash(DIVORCE_COST)}
┃➠ 💰 ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance - DIVORCE_COST)}
┃
┃➠ ❌ 10% ɪɴᴄᴏᴍᴇ sʜᴀʀᴇ ʀᴇᴍᴏᴠᴇᴅ
╚═══════════════════╝`,
      mentions: [sender, married]
    }, { quoted: m })
  }
}