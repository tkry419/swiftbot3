/**
 * SwiftBot - plugins/commands/economy/ecoon.js
 * Enable/Disable Economy System per Group
 * Uses db keys: eco_enabled_${groupJid}
 * Owner/Admin only command
 */

export default {
  name: 'ecoon',
  alias: ['enableeco', 'economyon', 'ecoenable'],
  desc: 'Enable economy system for this group',
  usage: '[on/off/status] [startbonus] [currency]',
  category: 'Economy',
  permission: 'admin',

  execute: async (sock, m, args, { db, prefix, isGroup, isAdmin, isOwner }) => {
    const from = m.key.remoteJid

    // 1. CHECK IF GROUP
    if (!isGroup) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛʜɪs ᴄᴏᴍᴍᴀɴᴅ ᴡᴏʀᴋs
┃➠ ɪɴ ɢʀᴏᴜᴘs ᴏɴʟʏ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 2. CHECK PERMISSION - ADMIN OR OWNER
    if (!isAdmin &&!isOwner) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴀᴅᴍɪɴ ᴏɴʟʏ ᴄᴏᴍᴍᴀɴᴅ
┃
┃➠ ᴀsᴋ ɢʀᴏᴜᴘ ᴀᴅᴍɪɴ ᴛᴏ
┃➠ ᴇɴᴀʙʟᴇ ᴇᴄᴏɴᴏᴍʏ
╚═══════════════════╝`
      }, { quoted: m })
    }

    const action = args[0]?.toLowerCase()
    const groupId = from

    // 3. STATUS CHECK
    if (!action || action === 'status' || action === 'info') {
      const [
        enabled,
        currency,
        startBonus,
        dailyAmount,
        tax
      ] = await Promise.all([
        db.getGroupKey(groupId, 'eco_enabled'),
        db.getGroupKey(groupId, 'eco_currency'),
        db.getGroupKey(groupId, 'eco_startbonus'),
        db.getGroupKey(groupId, 'eco_daily_amount'),
        db.getGroupKey(groupId, 'eco_tax')
      ])

      let groupName = 'This Group'
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {}

      return await sock.sendMessage(from, {
        text: `╔═〘 ⚙️ᴇᴄᴏ sᴇᴛᴛɪɴɢs 〙═╗
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ sᴛᴀᴛᴜs: ${enabled? '🟢 ᴇɴᴀʙʟᴇᴅ' : '🔴 ᴅɪsᴀʙʟᴇᴅ'}
┃
┃➠ 💰 ᴄᴜʀʀᴇɴᴄʏ: ${currency || '$'}
┃➠ 🎁 sᴛᴀʀᴛ ʙᴏɴᴜs: ${currency || '$'}${startBonus || 500}
┃➠ 📅 ᴅᴀɪʟʏ ᴀᴍᴏᴜɴᴛ: ${currency || '$'}${dailyAmount || 1000}
┃➠ 💸 ᴛᴀx ʀᴀᴛᴇ: ${tax || 5}%
╚═══════════════════╝

╭━━━━❮ ᴜsᴀɢᴇ ❯━⊷
┃➠ ${prefix}ecoon on - Enable economy
┃➠ ${prefix}ecoon off - Disable economy
┃➠ ${prefix}ecoon set bonus 1000
┃➠ ${prefix}ecoon set currency 💎
┃➠ ${prefix}ecoon set daily 2000
┃➠ ${prefix}ecoon set tax 10
╰━━━━━━━━━━━━━━━━━⊷

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ ᴛᴇᴄʜ*`
      }, { quoted: m })
    }

    // 4. ENABLE ECONOMY
    if (action === 'on' || action === 'enable') {
      await Promise.all([
        db.setGroup(from, 'eco_enabled', true),
        db.setGroup(from, 'eco_currency', '$'),
        db.setGroup(from, 'eco_startbonus', 500),
        db.setGroup(from, 'eco_daily_amount', 1000),
        db.setGroup(from, 'eco_tax', 5)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅sᴜᴄᴄᴇss 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴇɴᴀʙʟᴇᴅ
┃
┃➠ 🎁 sᴛᴀʀᴛ ʙᴏɴᴜs: $500
┃➠ 📅 ᴅᴀɪʟʏ ʀᴇᴡᴀʀᴅ: $1,000
┃➠ 💰 ᴄᴜʀʀᴇɴᴄʏ: $
┃
┃➠ ᴍᴇᴍʙᴇʀs ᴄᴀɴ ɴᴏᴡ ᴜsᴇ:
┃➠ ${prefix}bank, ${prefix}daily, ${prefix}work
╚═══════════════════╝

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ ᴛᴇᴄʜ*`
      }, { quoted: m })
    }

    // 5. DISABLE ECONOMY
    if (action === 'off' || action === 'disable') {
      await db.setGroup(from, 'eco_enabled', false)
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴅɪsᴀʙʟᴇᴅ 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴅɪsᴀʙʟᴇᴅ
┃
┃➠ ᴀʟ ᴇᴄᴏ ᴄᴏᴍᴍᴀɴᴅs ᴀʀᴇ
┃➠ ɴᴏᴡ ᴏғғ ғᴏʀ ᴛʜɪs ɢʀᴏᴜᴘ
┃
┃➠ ᴅᴀᴛᴀ sᴛɪʟ sᴀᴠᴇᴅ
╚═══════════════════╝

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ ᴛᴇᴄʜ*`
      }, { quoted: m })
    }

    // 6. SET CONFIG
    if (action === 'set') {
      const key = args[1]?.toLowerCase()
      const value = args[2]

      if (!key ||!value) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴘᴀʀᴀᴍᴇᴛᴇʀs
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}ecoon set <key> <value>
┃
┃➠ ᴋᴇʏs: bonus, currency, daily, tax
╚═══════════════════╝`
        }, { quoted: m })
      }

      const keyMap = {
        'bonus': 'eco_startbonus',
        'startbonus': 'eco_startbonus',
        'currency': 'eco_currency',
        'daily': 'eco_daily_amount',
        'dailyamount': 'eco_daily_amount',
        'tax': 'eco_tax'
      }

      if (keyMap[key]) {
        let finalValue = value
        if (key === 'bonus' || key === 'startbonus' || key === 'daily' || key === 'dailyamount' || key === 'tax') {
          const num = parseInt(value)
          if (isNaN(num) || num < 0) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ɴᴜᴍʙᴇʀ
┃
┃➠ ᴍᴜsᴛ ʙᴇ ᴘᴏsɪᴛɪᴠᴇ ɴᴜᴍʙᴇʀ
╚═══════════════════╝`
            }, { quoted: m })
          }
          finalValue = num
        }

        await db.setGroup(from, keyMap[key], finalValue)
        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ sᴇᴛɪɴɢ ᴜᴘᴅᴀᴛᴇᴅ
┃
┃➠ ${key.toUpperCase()}: ${finalValue}
╚═══════════════════╝

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ ᴛᴇᴄʜ*`
        }, { quoted: m })
      } else {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴋᴇʏ
┃
┃➠ ᴠᴀʟɪᴅ ᴋᴇʏs: bonus, currency, daily, tax
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 7. INVALID COMMAND
    await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴄᴏᴍᴍᴀɴᴅ
┃
┃➠ ᴜsᴇ: ${prefix}ecoon on/off/status
╚═══════════════════╝`
    }, { quoted: m })
  }
}