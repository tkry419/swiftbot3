/**
 * SwiftBot - plugins/commands/fun/bomb.js
 * Fake Time Bomb Prank - Countdown + bars spam
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

const BOMB_STEPS = [
  { msg: 'C4 Explosive armed...', percent: 5, time: 60 },
  { msg: 'Detonator connected...', percent: 10, time: 55 },
  { msg: 'Timer initialized: 60 seconds', percent: 15, time: 50 },
  { msg: 'Checking blast radius: 500m', percent: 20, time: 45 },
  { msg: 'Evacuation protocol: FAILED', percent: 25, time: 40 },
  { msg: 'Arming primary charge...', percent: 30, time: 35 },
  { msg: 'Primary charge: ARMED', percent: 35, time: 30 },
  { msg: 'Arming secondary charge...', percent: 40, time: 25 },
  { msg: 'Secondary charge: ARMED', percent: 45, time: 20 },
  { msg: 'Warning: Bomb cannot be defused', percent: 50, time: 18 },
  { msg: 'Thermal sensors: CRITICAL', percent: 55, time: 15 },
  { msg: 'Radiation levels rising...', percent: 60, time: 12 },
  { msg: 'Pressure building in chamber...', percent: 65, time: 10 },
  { msg: 'T-MINUS 10 SECONDS', percent: 70, time: 10 },
  { msg: 'T-MINUS 9 SECONDS', percent: 74, time: 9 },
  { msg: 'T-MINUS 8 SECONDS', percent: 78, time: 8 },
  { msg: 'T-MINUS 7 SECONDS', percent: 82, time: 7 },
  { msg: 'T-MINUS 6 SECONDS', percent: 86, time: 6 },
  { msg: 'T-MINUS 5 SECONDS', percent: 90, time: 5 },
  { msg: 'T-MINUS 4 SECONDS', percent: 93, time: 4 },
  { msg: 'T-MINUS 3 SECONDS', percent: 96, time: 3 },
  { msg: 'T-MINUS 2 SECONDS', percent: 98, time: 2 },
  { msg: 'T-MINUS 1 SECOND', percent: 99, time: 1 },
  { msg: 'DETONATION SEQUENCE START', percent: 100, time: 0 }
]

export default {
  name: 'bomb',
  alias: ['nuke', 'c4', 'explode'],
  desc: 'Fake time bomb prank with countdown',
  usage: '<@tag | number | group>',
  category: 'fun',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const isGroup = from.endsWith('@g.us')

    let target = null
    let targetName = ''
    let targetPic = null

    // 1. CHECK TARGET
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant
    const arg = args[0]

    if (mentioned) {
      target = mentioned
      targetName = getName(m, target)
    } else if (quoted) {
      target = quoted
      targetName = getName(m, target)
    } else if (arg) {
      const num = arg.replace(/[^0-9]/g, '')
      if (num) {
        target = num + '@s.whatsapp.net'
        targetName = '+' + num
      }
    } else if (isGroup) {
      target = from
      targetName = 'this group chat'
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TIME BOMB* 💣\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}bomb @user\n║ ${prefix}bomb 1555xxx\n║ ${prefix}bomb - bomb group\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. GET PROFILE PIC
    try {
      targetPic = await sock.profilePictureUrl(target, 'image')
    } catch {
      targetPic = null
    }

    // 3. SEND TARGET PIC FIRST
    if (targetPic) {
      await sock.sendMessage(from, {
        image: { url: targetPic },
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET LOCKED* 💣\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Victim: ${targetName}\n║ Explosive: C4 Plastic\n║ Yield: 50 Kilotons\n║ Radius: 500 meters\n║ Status: ARMED\n║\n║ Initializing bomb...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2500)
    } else {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET LOCKED* 💣\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Victim: ${targetName}\n║ Explosive: C4 Plastic\n║ Yield: 50 Kilotons\n║ Radius: 500 meters\n║ Status: ARMED\n║\n║ Initializing bomb...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2000)
    }

    // 4. SPAM BOMB COUNTDOWN
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUCLEAR BOMB ACTIVATED* 💣\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Planter: ${senderName}\n║ Type: Time Bomb\n║ Countdown: 60 SECONDS\n║\n║ WARNING: NO DEFUSE CODE\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    for (const step of BOMB_STEPS) {
      const bar = createProgressBar(step.percent)
      await sleep(step.time > 10? 700 : 1000)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *BOMB TIMER* 💣\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ >> ${step.msg}\n║\n║ ${bar}\n║\n║ ⏰ ${step.time} SECONDS LEFT\n║ 💀 CASUALTIES: ${Math.floor(step.percent * 10)}\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }

    await sleep(1000)

    // 5. EXPLOSION
    await sock.sendMessage(from, {
      text: `💥💥💥💥💥💥💥💥💥\n💥💥💥 BOOOOOOOM!!! 💥💥💥\n💥💥💥`
    })

    await sleep(1000)

    // 6. DAMAGE REPORT
    const damage = [
      `☠️ Casualties: ${Math.floor(Math.random() * 10000) + 5000}`,
      `🏢 Buildings Destroyed: ${Math.floor(Math.random() * 50) + 20}`,
      `🚗 Vehicles Vaporized: ${Math.floor(Math.random() * 200) + 100}`,
      `🌳 Trees Burned: ${Math.floor(Math.random() * 500) + 200}`,
      `📱 Phones Melted: ${Math.floor(Math.random() * 1000) + 500}`,
      `💻 Computers: DESTROYED`,
      `☢️ Radiation Level: LETHAL`,
      `🌪️ Blast Wave: 500m radius`,
      `🔥 Fire: UNCONTROLLABLE`,
      `⚠️ Area: UNINHABITABLE`
    ]

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DETONATION COMPLETE* ☠️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Status: OBLITERATED\n║\n║ ${damage.join('\n║ ')}\n║\n║ Total Damage: $${(Math.random() * 100 + 50).toFixed(1)}M\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *MISSION REPORT* 💣\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Bomber: ${senderName}\n║ Victim: ${targetName}\n║ Weapon: C4 Time Bomb\n║ Result: TOTAL ANNIHILATION\n║\n║ CNN Breaking News: Live\n║ Police: On the way\n║\n║ THIS IS NOT A JOKE! 😂\n║ It's just a prank bro\n║ Nobody actually exploded\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}