/**
 * SwiftBot - plugins/commands/economy/work.js
 * Group-Based Work System with Random Jobs
 * Uses db keys: eco_${groupJid}_balance_${user}, eco_${groupJid}_lastwork_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const formatTime = (ms) => {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return `${minutes}m ${seconds}s`
}

const JOBS = [
  { name: 'Teacher', emoji: '👨‍🏫', min: 300, max: 800, xp: 30, msg: 'You taught students about quantum physics' },
  { name: 'Miner', emoji: '⛏️', min: 400, max: 1200, xp: 40, msg: 'You mined some rare diamonds' },
  { name: 'Hacker', emoji: '💻', min: 500, max: 2000, xp: 50, msg: 'You hacked a government database' },
  { name: 'Chef', emoji: '👨‍🍳', min: 350, max: 900, xp: 35, msg: 'You cooked 5-star meals for VIPs' },
  { name: 'Doctor', emoji: '👨‍⚕️', min: 600, max: 1500, xp: 45, msg: 'You performed a life-saving surgery' },
  { name: 'Driver', emoji: '🚗', min: 250, max: 700, xp: 25, msg: 'You drove rich clients around city' },
  { name: 'Artist', emoji: '🎨', min: 400, max: 3000, xp: 60, msg: 'You sold your painting for millions' },
  { name: 'Youtuber', emoji: '📹', min: 300, max: 5000, xp: 55, msg: 'Your video went viral' },
  { name: 'Streamer', emoji: '🎮', min: 200, max: 4000, xp: 50, msg: 'You got 10k subs in one stream' },
  { name: 'Engineer', emoji: '🔧', min: 500, max: 1800, xp: 40, msg: 'You built a robot that does homework' }
]

export default {
  name: 'work',
  alias: ['job', 'earn', 'grind'],
  desc: 'Work a random job to earn money for this group - 10min cooldown',
  usage: '',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    
    // 1. CHECK IF ECONOMY ENABLED FOR THIS GROUP
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

    // 2. DB KEYS - GROUP ISOLATED
    const groupId = isGroup? from : 'global'
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const lastWorkKey = `eco_${groupId}_lastwork_${sender}`
    const xpKey = `eco_${groupId}_xp_${sender}`
    const jobKey = `eco_${groupId}_job_${sender}`
    const workCountKey = `eco_${groupId}_workcount_${sender}`

    // 3. FETCH DATA FROM DB
    const [
      balance,
      lastWork,
      currentXp,
      workCount,
      currency,
      jailTime
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(lastWorkKey),
      db.get(xpKey),
      db.get(workCountKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.get(`eco_${groupId}_jail_${sender}`)
    ])

    // 4. CHECK JAIL STATUS
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴡᴏʀᴋ ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CHECK COOLDOWN - 10 MINUTES
    const now = Date.now()
    const cooldown = 10 * 60 * 1000 // 10min
    const timeLeft = lastWork? (lastWork + cooldown) - now : 0

    if (lastWork && timeLeft > 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ⏰ᴄᴏᴏʟᴅᴏᴡɴ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ᴛɪʀᴇᴅ
┃
┃➠ ⏳ ʀᴇsᴛ ғᴏʀ: ${formatTime(timeLeft)}
┃➠ 💼 ᴡᴏʀᴋs ᴅᴏɴᴇ: ${workCount || 0}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. RANDOM JOB SELECTION
    const job = JOBS[Math.floor(Math.random() * JOBS.length)]
    const earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min
    const xpGained = job.xp + Math.floor(Math.random() * 20) // Bonus XP
    const currencySymbol = currency || '$'

    // 7. UPDATE DB
    const newBalance = (balance || 0) + earned
    const newXp = (currentXp || 0) + xpGained
    const newWorkCount = (workCount || 0) + 1

    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(lastWorkKey, now),
      db.set(xpKey, newXp),
      db.set(jobKey, job.name),
      db.set(workCountKey, newWorkCount)
    ])

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

    // 9. SEND WORK RESULT BOX
    await sock.sendMessage(from, {
      text: `╔═〘 ${job.emoji}ᴡᴏʀᴋ 〙═╗
┃➠ ᴊᴏʙ ᴄᴏᴍᴘʟᴇᴛᴇᴅ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💼 ᴊᴏʙ: ${job.name}
┃➠ 📝 ᴛᴀsᴋ: ${job.msg}
┃
┃➠ 💰 ᴇᴀʀɴᴇᴅ: ${currencySymbol}${formatCash(earned)}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ: +${xpGained}
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ 💼 ᴛᴏᴛᴀʟ ᴡᴏʀᴋs: ${newWorkCount}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 10ᴍ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ᴡᴏʀᴋ ᴇᴠᴇʀʏ 10ᴍ ᴛᴏ ɢʀɪɴᴅ
┃➠ ʜɪɢʜᴇʀ ʟᴇᴠᴇʟ = ʙᴇᴛᴛᴇʀ ᴊᴏʙs
┃➠ ${prefix}bank - Check balance
╰━━━━━━━━━━━━━━━━━⊷

> *ᴘᴏᴡᴇʀᴇᴅ ʙʏ ᴘʀɪɴᴄᴇ ᴛᴇᴄʜ*`
    }, { quoted: m })
  }
}