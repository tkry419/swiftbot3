/**
 * SwiftBot - plugins/commands/fun/nuke.js
 * Fake Virus Nuke Prank - Spam messages with bars
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

const NUKE_STEPS = [
  { msg: 'Loading NUKE.exe...', percent: 3 },
  { msg: 'Initializing nuclear protocols...', percent: 7 },
  { msg: 'Connecting to satellite network...', percent: 11 },
  { msg: 'Satellite link established. Targeting...', percent: 15 },
  { msg: 'Calculating GPS coordinates...', percent: 19 },
  { msg: 'Coordinates locked: Lat -6.7924, Long 39.2083', percent: 23 },
  { msg: 'Uploading Trojan horse virus...', percent: 27 },
  { msg: 'Virus injected successfully into system...', percent: 31 },
  { msg: 'Disabling antivirus protection...', percent: 35 },
  { msg: 'Windows Defender terminated...', percent: 39 },
  { msg: 'Encrypting personal files...', percent: 43 },
  { msg: 'Documents encrypted: 2,847 files', percent: 47 },
  { msg: 'Photos encrypted: 1,923 files', percent: 51 },
  { msg: 'Videos encrypted: 492 files', percent: 55 },
  { msg: 'Corrupting system registry...', percent: 59 },
  { msg: 'Registry damage: 87% complete', percent: 63 },
  { msg: 'Overloading CPU cores...', percent: 67 },
  { msg: 'CPU Temperature: 97°C - CRITICAL', percent: 71 },
  { msg: 'RAM overflow initiated...', percent: 75 },
  { msg: 'Memory leak: 15.8GB/16GB used', percent: 79 },
  { msg: 'Deleting system32...', percent: 83 },
  { msg: 'System32 deletion: 94% complete', percent: 87 },
  { msg: 'Formatting C: drive...', percent: 91 },
  { msg: 'Format progress: 98% - No recovery possible', percent: 95 },
  { msg: 'Planting ransomware message...', percent: 98 },
  { msg: 'NUKE ACTIVATION COMPLETE', percent: 100 }
]

export default {
  name: 'nuke',
  alias: ['virus', 'infect', 'destroy'],
  desc: 'Fake virus nuke prank',
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
      targetName = 'this group'
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUKE PRANK* ☢️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}nuke @user\n║ ${prefix}nuke 255xxx\n║ ${prefix}nuke - nuke group\n╚━━━━━━━━━━━━━━━━━═❒`
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
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUCLEAR TARGET ACQUIRED* ☢️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Threat Level: CRITICAL\n║ Device ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}\n║ OS: Windows 11 Pro\n║ Status: VULNERABLE\n║\n║ Launching NUKE.exe...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2500)
    } else {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUCLEAR TARGET ACQUIRED* ☢️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Threat Level: CRITICAL\n║ Device ID: ${Math.random().toString(36).substring(2, 10).toUpperCase()}\n║ Status: VULNERABLE\n║\n║ Launching NUKE.exe...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2000)
    }

    // 4. SPAM NUKE MESSAGES
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUCLEAR WARHEAD ARMED* ☢️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Attacker: ${senderName}\n║ Weapon: NUKE v4.2.0\n║ Payload: Ransomware + Trojan\n║\n║ Countdown initiated...\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    for (const step of NUKE_STEPS) {
      const bar = createProgressBar(step.percent)
      await sleep(800)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *NUKING ${targetName}* ☢️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ >> ${step.msg}\n║\n║ ${bar}\n║\n║ ETA: ${Math.floor((100 - step.percent) / 10)} seconds\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }

    await sleep(2000)

    // 5. FINAL DESTRUCTION
    const damage = [
      `💀 System Files: DELETED`,
      `💀 Personal Data: ENCRYPTED`,
      `💀 Bank Details: STOLEN`,
      `💀 Photos/Videos: CORRUPTED`,
      `💀 Contacts: WIPED`,
      `💀 WhatsApp: BANNED`,
      `💀 Instagram: HACKED`,
      `💀 TikTok: DELETED`,
      `💀 Mobile Money: DRAINED`,
      `💀 Device: BRICKED`,
      `💀 Recovery: IMPOSSIBLE`
    ]

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET DESTROYED* 💀\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Victim: ${targetName}\n║ Status: TERMINATED\n║\n║ ${damage.join('\n║ ')}\n║\n║ Total Damage: $${Math.floor(Math.random() * 50000) + 10000}\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *MISSION COMPLETE* ☢️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Attacker: ${senderName}\n║ Casualty: ${targetName}\n║ Method: Nuclear Virus\n║\n║ Ransom Note Sent: Pay 5 BTC\n║ Wallet: 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa\n║\n║ Just kidding! Chill 😂\n║ Hakuna kilichoharibika\n║ It's just a prank bro\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}