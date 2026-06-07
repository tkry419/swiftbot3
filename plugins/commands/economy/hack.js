/**
 * SwiftBot - plugins/commands/economy/hack.js
 * Group-Based Hacking System - 35% Success Rate
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_effects_${user}_laptop
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const hours = Math.floor(ms / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// HACK SCENARIOS
const HACK_SCENARIOS = {
  success: [
    'Bypassed firewall successfully',
    'Cracked password hash',
    'SQL injection worked',
    'Social engineering succeeded',
    'Zero-day exploit found',
    'Backdoor access granted',
    'Phishing email clicked',
    'Brute force attack complete'
  ],
  fail: [
    'Firewall blocked you',
    'Two-factor authentication stopped you',
    'IP address traced',
    'Target had antivirus',
    'Police traced your location',
    'System admin caught you',
    'Encryption too strong',
    'Honeypot trap triggered'
  ]
}

export default {
  name: 'hack',
  alias: ['cyber', 'exploit'],
  desc: 'Hack a user to steal cash - 35% success rate',
  usage: '[@user]',
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

    // 2. CHECK TARGET
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const replied = m.message?.extendedTextMessage?.contextInfo?.participant
    const target = mentioned || replied

    if (!target) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴛᴀʀɢᴇᴛ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}hack @user
┃➠ ᴇxᴀᴍᴘʟᴇ: ${prefix}hack @john
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (target === sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ʜᴀᴄᴋ ʏᴏᴜʀsᴇʟғ
┃
┃➠ ʜᴀᴄᴋ sᴏᴍᴇᴏɴᴇ ᴇʟsᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const senderBalanceKey = `eco_${groupId}_balance_${sender}`
    const targetBalanceKey = `eco_${groupId}_balance_${target}`
    const senderJailKey = `eco_${groupId}_jail_${sender}`
    const targetJailKey = `eco_${groupId}_jail_${target}`
    const lastHackKey = `eco_${groupId}_lasthack_${sender}`
    const laptopEffectKey = `eco_${groupId}_effects_${sender}_laptop`

    // 4. FETCH DATA
    const [
      senderBalance,
      targetBalance,
      senderJail,
      targetJail,
      lastHack,
      laptopEffect,
      currency
    ] = await Promise.all([
      db.get(senderBalanceKey),
      db.get(targetBalanceKey),
      db.get(senderJailKey),
      db.get(targetJailKey),
      db.get(lastHackKey),
      db.get(laptopEffectKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currentSenderBalance = senderBalance || 0
    const currentTargetBalance = targetBalance || 0
    const currencySymbol = currency || '$'
    const hasLaptop = laptopEffect && Date.now() < laptopEffect

    // 5. CHECK JAIL - SENDER
    if (senderJail && Date.now() < senderJail) {
      const remaining = Math.ceil((senderJail - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ʜᴀᴄᴋɪɴɢ ғʀᴏᴍ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. CHECK JAIL - TARGET
    if (targetJail && Date.now() < targetJail) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ɪs ɪɴ ᴊᴀɪʟ
┃
┃➠ ᴄᴀɴ'ᴛ ʜᴀᴄᴋ ᴘᴇᴏᴘʟᴇ ɪɴ ᴊᴀɪʟ
┃➠ ᴛʀʏ sᴏᴍᴇᴏɴᴇ ᴇʟsᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. CHECK COOLDOWN - 1 HOUR
    const now = Date.now()
    const cooldown = 60 * 60 * 1000 // 1hr
    const timeLeft = lastHack? (lastHack + cooldown) - now : 0

    if (lastHack && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ sʏsᴛᴇᴍ ᴅᴇᴛᴇᴄᴛɪɴɢ ᴍᴀʟᴡᴀʀᴇ
┃
┃➠ ⏳ ᴡᴀɪᴛ: ${formatTime(timeLeft)}
┃➠ ʟᴀʏ ʟᴏᴡ ғᴏʀ ᴀ ᴡʜɪʟᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 8. CHECK TARGET HAS MONEY
    if (currentTargetBalance < 1000) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ ᴛᴏᴏ ᴘᴏᴏʀ
┃
┃➠ ᴛᴀʀɢᴇᴛ ʜᴀs: ${currencySymbol}${formatCash(currentTargetBalance)}
┃➠ ɴᴇᴅ ᴀᴛ ʟᴇᴀsᴛ: ${currencySymbol}1,000
╚═══════════════════╝`,
        mentions: [target]
      }, { quoted: m })
    }

    // 9. CALCULATE SUCCESS - 35% base, 50% with laptop
    const baseSuccess = 0.35
    const laptopBonus = hasLaptop? 0.15 : 0
    const successRate = baseSuccess + laptopBonus
    const success = Math.random() < successRate

    // 10. GET TARGET NAME
    let targetName = 'User'
    try {
      targetName = await db.get(`pushname_${target}`) || target.split('@')[0]
    } catch {
      targetName = target.split('@')[0]
    }

    if (success) {
      // SUCCESS - STEAL 15-30% OF TARGET BALANCE
      const stealPercent = Math.random() * 0.15 + 0.15 // 15-30%
      const stolen = Math.floor(currentTargetBalance * stealPercent)
      const newSenderBalance = currentSenderBalance + stolen
      const newTargetBalance = currentTargetBalance - stolen
      const successMsg = HACK_SCENARIOS.success[Math.floor(Math.random() * HACK_SCENARIOS.success.length)]

      await Promise.all([
        db.set(senderBalanceKey, newSenderBalance),
        db.set(targetBalanceKey, newTargetBalance),
        db.set(lastHackKey, now)
      ])

      await sock.sendMessage(from, {
        text: `╔═〘 💻ʜᴀᴄᴋ sᴜᴄᴄᴇss 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ: @${target.split('@')[0]}
┃
┃➠ 📝 ${successMsg}
┃➠ 💰 sᴛᴏʟᴇɴ: ${currencySymbol}${formatCash(stolen)}
┃➠ 📊 ᴘᴇʀᴄᴇɴᴛ: ${Math.floor(stealPercent * 100)}%
┃
┃➠ 💰 ʏᴏᴜʀ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
┃➠ 💸 ᴛʜᴇɪʀ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newTargetBalance)}
┃
┃➠ ${hasLaptop? '💻 ʟᴀᴘᴛᴏᴘ ʙᴏᴏsᴛ ᴀᴄᴛɪᴠᴇ' : '💻 ɴᴏ ʟᴀᴘᴛᴏᴘ ʙᴏᴏsᴛ'}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 1ʜ
╚═══════════════════╝`,
        mentions: [sender, target]
      }, { quoted: m })

    } else {
      // FAIL - PAY FINE 5-15% OF YOUR BALANCE
      const finePercent = Math.random() * 0.10 + 0.05 // 5-15%
      const fine = Math.floor(currentSenderBalance * finePercent)
      const newSenderBalance = Math.max(0, currentSenderBalance - fine)
      const failMsg = HACK_SCENARIOS.fail[Math.floor(Math.random() * HACK_SCENARIOS.fail.length)]

      await Promise.all([
        db.set(senderBalanceKey, newSenderBalance),
        db.set(lastHackKey, now)
      ])

      await sock.sendMessage(from, {
        text: `╔═〘 🚨ʜᴀᴄᴋ ғᴀɪʟᴇᴅ 〙═╗
┃➠ ᴛᴀʀɢᴇᴛ: @${target.split('@')[0]}
┃
┃➠ 📝 ${failMsg}
┃➠ 💸 ғɪɴᴇ: ${currencySymbol}${formatCash(fine)}
┃➠ 📊 ᴘᴇʀᴄᴇɴᴛ: ${Math.floor(finePercent * 100)}%
┃
┃➠ 💰 ʏᴏᴜʀ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newSenderBalance)}
┃
┃➠ ${hasLaptop? '💻 ʟᴀᴘᴛᴏᴘ ʜᴇʟᴘᴇᴅ ʙᴜᴛ sᴛɪʟʟ ғᴀɪʟᴇᴅ' : '💻 ᴜsᴇ ʟᴀᴘᴛᴏᴘ ғᴏʀ ʙᴇᴛᴛᴇʀ ᴏᴅᴅs'}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 1ʜ
╚═══════════════════╝`,
        mentions: [sender, target]
      }, { quoted: m })
    }
  }
}