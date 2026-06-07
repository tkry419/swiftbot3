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

const RANDOM_EVENTS = [
  { type: 'bonus', chance: 0.15, msg: 'Boss gave you a bonus', min: 200, max: 1000 },
  { type: 'tip', chance: 0.1, msg: 'Customer left a huge tip', min: 100, max: 500 },
  { type: 'promotion', chance: 0.05, msg: 'You got promoted for this shift', multiplier: 1.5 },
  { type: 'overtime', chance: 0.08, msg: 'You worked overtime', multiplier: 1.3 },
  { type: 'tax', chance: 0.05, msg: 'Tax office took a cut', multiplier: 0.8 },
  { type: 'fine', chance: 0.03, msg: 'You broke equipment', min: 100, max: 300 }
]

const getJobLevel = (xp) => {
  if (xp >= 10000) return { level: 5, title: 'CEO', multiplier: 2.0 }
  if (xp >= 5000) return { level: 4, title: 'Manager', multiplier: 1.7 }
  if (xp >= 2000) return { level: 3, title: 'Senior', multiplier: 1.4 }
  if (xp >= 500) return { level: 2, title: 'Expert', multiplier: 1.2 }
  return { level: 1, title: 'Intern', multiplier: 1.0 }
}

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
    const streakKey = `eco_${groupId}_streak_${sender}`
    const lastStreakKey = `eco_${groupId}_laststreak_${sender}`

    // 3. FETCH DATA FROM DB
    const [
      balance,
      lastWork,
      currentXp,
      workCount,
      currency,
      jailTime,
      streak,
      lastStreak
    ] = await Promise.all([
      db.get(balanceKey),
      db.get(lastWorkKey),
      db.get(xpKey),
      db.get(workCountKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.get(`eco_${groupId}_jail_${sender}`),
      db.get(streakKey),
      db.get(lastStreakKey)
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

    // 6. STREAK SYSTEM
    const oneHour = 60 * 60 * 1000
    let currentStreak = streak || 0
    if (lastStreak && now - lastStreak <= oneHour) {
      currentStreak++
    } else if (lastStreak && now - lastStreak > oneHour * 2) {
      currentStreak = 1
    } else {
      currentStreak = currentStreak || 1
    }
    const streakBonus = Math.min(currentStreak * 0.05, 0.5) // Max 50% bonus

    // 7. RANDOM JOB SELECTION
    const job = JOBS[Math.floor(Math.random() * JOBS.length)]
    let earned = Math.floor(Math.random() * (job.max - job.min + 1)) + job.min
    let xpGained = job.xp + Math.floor(Math.random() * 20) // Bonus XP
    const currencySymbol = currency || '$'

    // 8. LEVEL SYSTEM
    const jobLevel = getJobLevel(currentXp || 0)
    earned = Math.floor(earned * jobLevel.multiplier)

    // 9. APPLY STREAK BONUS
    earned = Math.floor(earned * (1 + streakBonus))

    // 10. RANDOM EVENTS
    let eventMsg = ''
    let eventAmount = 0
    const eventRoll = Math.random()
    let cumulativeChance = 0

    for (const event of RANDOM_EVENTS) {
      cumulativeChance += event.chance
      if (eventRoll < cumulativeChance) {
        if (event.multiplier) {
          earned = Math.floor(earned * event.multiplier)
          eventMsg = `🎲 ${event.msg}`
        } else {
          eventAmount = Math.floor(Math.random() * (event.max - event.min + 1)) + event.min
          if (event.type === 'fine') {
            earned = Math.max(0, earned - eventAmount)
            eventMsg = `🎲 ${event.msg} -${currencySymbol}${formatCash(eventAmount)}`
          } else {
            earned += eventAmount
            eventMsg = `🎲 ${event.msg} +${currencySymbol}${formatCash(eventAmount)}`
          }
        }
        break
      }
    }

    // 11. UPDATE DB
    const newBalance = (balance || 0) + earned
    const newXp = (currentXp || 0) + xpGained
    const newWorkCount = (workCount || 0) + 1

    await Promise.all([
      db.set(balanceKey, newBalance),
      db.set(lastWorkKey, now),
      db.set(xpKey, newXp),
      db.set(jobKey, job.name),
      db.set(workCountKey, newWorkCount),
      db.set(streakKey, currentStreak),
      db.set(lastStreakKey, now)
    ])

    // 12. GET GROUP NAME
    let groupName = 'Global'
    if (isGroup) {
      try {
        const groupMetadata = await sock.groupMetadata(from)
        groupName = groupMetadata.subject
      } catch {
        groupName = 'This Group'
      }
    }

    // 13. SEND WORK RESULT BOX
    await sock.sendMessage(from, {
      text: `╔═〘 ${job.emoji}ᴡᴏʀᴋ 〙═╗
┃➠ ᴊᴏʙ ᴄᴏᴍᴘʟᴇᴛᴇᴅ
┃➠ ɢʀᴏᴜᴘ: ${groupName}
┃
┃➠ 💼 ᴊᴏʙ: ${job.name}
┃➠ 🏆 ʀᴀɴᴋ: ${jobLevel.title} LV${jobLevel.level}
┃➠ 📝 ᴛᴀsᴋ: ${job.msg}
┃${eventMsg? '\n┃➠ ' + eventMsg + '\n┃' : ''}
┃➠ 💰 ᴇᴀʀɴᴇᴅ: ${currencySymbol}${formatCash(earned)}
┃➠ ⭐ xᴘ ɢᴀɪɴᴇᴅ: +${xpGained}
┃➠ 🔥 sᴛʀᴇᴀᴋ: ${currentStreak}x (+${Math.floor(streakBonus * 100)}%)
┃➠ 💰 ɴᴇᴡ ʙᴀʟᴀɴᴄᴇ: ${currencySymbol}${formatCash(newBalance)}
┃
┃➠ 💼 ᴛᴏᴛᴀʟ ᴡᴏʀᴋs: ${newWorkCount}
┃➠ ⏰ ᴄᴏᴏʟᴅᴏᴡɴ: 10ᴍ
╚═══════════════════╝

╭━━━━❮ ᴛɪᴘs ❯━⊷
┃➠ ᴡᴏʀᴋ ᴇᴠᴇʀʏ 10ᴍ ᴛᴏ ɢʀɪɴᴅ
┃➠ ʜɪɢʜᴇʀ ʟᴇᴠᴇʟ = ʙᴇᴛᴛᴇʀ ᴊᴏʙs
┃➠ ᴋᴇᴇᴘ sᴛʀᴇᴀᴋ ғᴏʀ ʙᴏɴᴜs
┃➠ ${prefix}bank - Check balance
╰━━━━━━━━━━━━━━━━━⊷`
    }, { quoted: m })
  }
}