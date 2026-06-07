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
  usage: '[on/off/status/forgive/reset/gift] [startbonus] [currency]',
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

    // 3. FORGIVE / UN-JAIL
    if (action === 'forgive' || action === 'unjail' || action === 'pardon') {
      const target = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.participant || args[1]

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀɢ sᴏᴍᴇᴏɴᴇ ᴛᴏ ғᴏʀɢɪᴠᴇ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}ecoon forgive @user
┃➠ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴍᴇssᴀɢᴇ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const jailKey = `eco_${groupId}_jail_${target}`
      const jailTime = await db.get(jailKey)

      if (!jailTime || Date.now() > jailTime) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ℹ️ɪɴғᴏ 〙═╗
┃➠ ᴛʜɪs ᴜsᴇʀ ɪs ɴᴏᴛ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      await db.del(jailKey)
      const targetName = target.split('@')[0]

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ғᴏʀɢɪᴠᴇɴ 〙═╗
┃➠ ᴜsᴇʀ ʀᴇʟᴇᴀsᴇᴅ ғʀᴏᴍ ᴊᴀɪʟ
┃
┃➠ @${targetName} ɪs ɴᴏᴡ ғʀᴇᴇ
┃➠ ᴄᴀɴ ᴜsᴇ ᴇᴄᴏ ᴄᴏᴍᴍᴀɴᴅs ᴀɢᴀɪɴ
╚═══════════════════╝`,
        mentions: [target]
      }, { quoted: m })
    }

    // 4. RESET USER / ALL
    if (action === 'reset') {
      const target = m.mentionedJid?.[0] || m.message?.extendedTextMessage?.contextInfo?.participant || args[1]

      if (!target && args[1]!== 'all') {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ sᴘᴇᴄɪғʏ ᴛᴀʀɢᴇᴛ
┃
┃➠ ${prefix}ecoon reset @user
┃➠ ${prefix}ecoon reset all
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (args[1] === 'all') {
        const groupMetadata = await sock.groupMetadata(from)
        const participants = groupMetadata.participants.map(p => p.id)

        await Promise.all(participants.map(async (user) => {
          await Promise.all([
            db.set(`eco_${groupId}_balance_${user}`, 0),
            db.set(`eco_${groupId}_bank_${user}`, 0),
            db.del(`eco_${groupId}_jail_${user}`)
          ])
        }))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ᴀʟʟ ᴜsᴇʀ ᴅᴀᴛᴀ ᴡɪᴘᴇᴅ
┃
┃➠ ᴇᴠᴇʀʏᴏɴᴇ ʙᴀᴄᴋ ᴛᴏ 0
┃➠ ᴊᴀɪʟs ᴄʟᴇᴀʀᴇᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      await Promise.all([
        db.set(`eco_${groupId}_balance_${target}`, 0),
        db.set(`eco_${groupId}_bank_${target}`, 0),
        db.del(`eco_${groupId}_jail_${target}`)
      ])

      const targetName = target.split('@')[0]
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ᴜsᴇʀ ᴅᴀᴛᴀ ᴡɪᴘᴇᴅ
┃
┃➠ @${targetName} ʙᴀᴄᴋ ᴛᴏ 0
┃➠ ᴊᴀɪʟ ᴄʟᴇᴀʀᴇᴅ
╚═══════════════════╝`,
        mentions: [target]
      }, { quoted: m })
    }

    // 5. GIFT - TO USER OR ALL
    if (action === 'gift') {
      const amount = parseInt(args[1])
      const target = m.mentionedJid?.[0] || args[2]
      const currency = await db.getGroupKey(groupId, 'eco_currency') || '$'

      if (!amount || amount <= 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴀᴍᴏᴜɴᴛ
┃
┃➠ ${prefix}ecoon gift 1000 @user
┃➠ ${prefix}ecoon gift 500 all
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (args[2] === 'all') {
        const groupMetadata = await sock.groupMetadata(from)
        const participants = groupMetadata.participants.map(p => p.id)

        await Promise.all(participants.map(async (user) => {
          const bal = await db.get(`eco_${groupId}_balance_${user}`) || 0
          await db.set(`eco_${groupId}_balance_${user}`, bal + amount)
        }))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ɢɪғᴛᴇᴅ 〙═╗
┃➠ ɢɪғᴛ sᴇɴᴛ ᴛᴏ ᴀʟʟ
┃
┃➠ 💰 ᴀᴍᴏᴜɴᴛ: ${currency}${amount}
┃➠ 👥 ᴍᴇᴍʙᴇʀs: ${participants.length}
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀɢ sᴏᴍᴇᴏɴᴇ ᴏʀ ᴜsᴇ 'all'
┃
┃➠ ${prefix}ecoon gift 1000 @user
┃➠ ${prefix}ecoon gift 500 all
╚═══════════════════╝`
        }, { quoted: m })
      }

      const bal = await db.get(`eco_${groupId}_balance_${target}`) || 0
      await db.set(`eco_${groupId}_balance_${target}`, bal + amount)

      const targetName = target.split('@')[0]
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ɢɪғᴛᴇᴅ 〙═╗
┃➠ ɢɪғᴛ sᴇɴᴛ
┃
┃➠ ᴛᴏ: @${targetName}
┃➠ 💰 ᴀᴍᴏᴜɴᴛ: ${currency}${amount}
╚═══════════════════╝`,
        mentions: [target]
      }, { quoted: m })
    }

    // 6. STATUS CHECK
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
┃➠ ${prefix}ecoon forgive @user - Release from jail
┃➠ ${prefix}ecoon reset @user - Wipe user data
┃➠ ${prefix}ecoon reset all - Wipe all data
┃➠ ${prefix}ecoon gift 1000 @user - Gift cash
┃➠ ${prefix}ecoon gift 500 all - Gift all
┃➠ ${prefix}ecoon set bonus 1000
┃➠ ${prefix}ecoon set currency 💎
┃➠ ${prefix}ecoon set daily 2000
┃➠ ${prefix}ecoon set tax 10
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    // 7. ENABLE ECONOMY
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
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. DISABLE ECONOMY
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
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 9. SET CONFIG
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
╚═══════════════════╝`
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

    // 10. INVALID COMMAND
    await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴄᴏᴍᴍᴀɴᴅ
┃
┃➠ ᴜsᴇ: ${prefix}ecoon on/off/status/forgive/reset/gift
╚═══════════════════╝`
    }, { quoted: m })
  }
}