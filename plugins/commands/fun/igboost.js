/**
 * SwiftBot - plugins/commands/fun/igboost.js
 * Fake Instagram Followers + Likes Boost Prank - Random Stats
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function createProgressBar(percent) {
  const filled = Math.floor(percent / 5)
  const empty = 20 - filled
  return '█'.repeat(filled) + '░'.repeat(empty) + ` ${percent}%`
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function formatNum(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return num.toLocaleString()
}

const IG_STEPS = [
  'Connecting to Instagram API...',
  'Bypassing Meta rate limits...',
  'Account verified: ACTIVE',
  'Injecting bot accounts...',
  'Adding followers from USA...',
  'Adding followers from India...',
  'Adding followers from Brazil...',
  'Adding followers from Indonesia...',
  'Boosting post engagement...',
  'Triggering Explore algorithm...',
  'Reels going viral...',
  'Story views spiking...',
  'Comments flooding in...',
  'Saves increasing...',
  'Collab requests: INCOMING',
  'Blue tick: PROCESSING...',
  'Brand partnerships: UNLOCKED',
  'Shadowban check: PASSED',
  'Final sync with Meta servers...',
  'BOOST COMPLETE'
]

const COUNTRIES = ['USA', 'India', 'Brazil', 'Indonesia', 'UK', 'Mexico', 'Turkey', 'Russia', 'Germany', 'Japan', 'Canada', 'France']

export default {
  name: 'igboost',
  alias: [],
  desc: 'Fake Instagram followers + likes boost prank with random stats',
  usage: '<username | email | number>',
  category: 'fun',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    // 1. CHECK INPUT
    const input = args.join(' ').trim()

    if (!input) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *INSTAGRAM BOOST* 🚀\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}igboost @username\n║ ${prefix}igboost email@gmail.com\n║ ${prefix}igboost +15551234567\n║\n║ Example:\n║ ${prefix}igboost @cristiano\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Determine input type
    let accountType = 'Username'
    let displayInput = input
    if (input.includes('@') && input.includes('.')) {
      accountType = 'Email'
    } else if (input.replace(/[^0-9]/g, '').length >= 10) {
      accountType = 'Phone Number'
      displayInput = '+' + input.replace(/[^0-9]/g, '')
    } else if (input.startsWith('@')) {
      accountType = 'Username'
    } else {
      accountType = 'Nickname'
      displayInput = '@' + input.replace(/@/g, '')
    }

    // 2. GENERATE RANDOM TARGETS
    const targetFollowers = rand(50000, 250000)
    const targetLikes = rand(500000, 5000000)
    const targetComments = rand(10000, 100000)
    const targetShares = rand(5000, 50000)
    const targetViews = rand(1000000, 10000000)

    // 3. START BOOST MESSAGE
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *INSTAGRAM BOOST INITIATED* 🚀\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Account: ${displayInput}\n║ Type: ${accountType}\n║ Requested: ${senderName}\n║ Package: ${formatNum(targetFollowers)} Followers\n║ Package: ${formatNum(targetLikes)} Likes\n║ Speed: MAXIMUM\n║\n║ Connecting to Instagram API...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await sleep(2000)

    // 4. SPAM BOOST MESSAGES WITH BARS - REAL MATH
    let currentFollowers = 0
    let currentLikes = 0
    let currentComments = 0
    let currentShares = 0

    for (let i = 0; i < IG_STEPS.length; i++) {
      const percent = Math.floor(((i + 1) / IG_STEPS.length) * 100)
      const bar = createProgressBar(percent)

      // Real progressive math
      currentFollowers = Math.floor((percent / 100) * targetFollowers)
      currentLikes = Math.floor((percent / 100) * targetLikes)
      currentComments = Math.floor((percent / 100) * targetComments)
      currentShares = Math.floor((percent / 100) * targetShares)

      const randomCountry = COUNTRIES[rand(0, COUNTRIES.length - 1)]
      const speed = rand(500, 2500)

      await sleep(800)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BOOSTING ${displayInput}* 📈\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ >> ${IG_STEPS[i]}\n║\n║ ${bar}\n║\n║ 👥 Followers: +${currentFollowers.toLocaleString()}\n║ ❤️ Likes: +${currentLikes.toLocaleString()}\n║ 💬 Comments: +${currentComments.toLocaleString()}\n║ 🔄 Shares: +${currentShares.toLocaleString()}\n║ 🌍 Active: ${randomCountry}\n║ ⚡ Speed: ${speed}/sec\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }

    await sleep(1500)

    // 5. SUCCESS REPORT - RANDOM STATS EACH TIME
    const finalViews = Math.floor(targetViews * (rand(80, 120) / 100))
    const finalEarnings = rand(500, 5000)
    const finalStoryViews = rand(100000, 800000)
    const engagementRate = (rand(850, 980) / 10).toFixed(1)
    const countriesReached = rand(35, 65)
    const blueTickStatus = ['APPROVED', 'VERIFIED', 'GRANTED'][rand(0, 2)]
    const exploreStatus = ['VIRAL', 'TRENDING', 'TOP 1%'][rand(0, 2)]

    const stats = [
      `👥 Followers Added: ${targetFollowers.toLocaleString()}`,
      `❤️ Likes Added: ${targetLikes.toLocaleString()}`,
      `💬 Comments: +${targetComments.toLocaleString()}`,
      `🔄 Shares: +${targetShares.toLocaleString()}`,
      `📹 Reel Views: +${formatNum(finalViews)}`,
      `🔥 Explore Status: ${exploreStatus}`,
      `💰 Earnings Est: $${finalEarnings.toLocaleString()}`,
      `✅ Blue Tick: ${blueTickStatus}`,
      `📊 Story Views: +${formatNum(finalStoryViews)}`,
      `📈 Engagement Rate: ${engagementRate}%`,
      `🌍 Countries Reached: ${countriesReached}`,
      `⭐ Account Rating: ${(rand(45, 50) / 10).toFixed(1)}/5.0`
    ]

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BOOST SUCCESSFUL* ✅\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Account: ${displayInput}\n║ Status: IG FAMOUS\n║\n║ ${stats.join('\n║ ')}\n║\n║ Total Cost: $0.00 FREE\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *INSTAGRAM BOOST COMPLETE* 🚀\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Operator: ${senderName}\n║ Account: ${displayInput}\n║ Duration: ${IG_STEPS.length} cycles\n║ Result: ACCOUNT BLOWING UP\n║\n║ Check your Instagram now!\n║ Algorithm fully boosted\n║\n║ Just kidding! It's a prank 😂\n║ No real followers were added\n║ This is just for fun bro\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}