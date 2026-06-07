/**
 * SwiftBot - plugins/commands/fun/hack.js
 * Fake Hack Prank - Spam messages with increasing bars
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

const HACK_STEPS = [
  { msg: 'Establishing secure connection to target server...', percent: 5 },
  { msg: 'Connection established. Scanning for open ports...', percent: 8 },
  { msg: 'Port 443 detected. Initiating SSL bypass...', percent: 12 },
  { msg: 'SSL bypassed successfully. Accessing firewall...', percent: 15 },
  { msg: 'Firewall detected: Norton 360. Preparing exploit...', percent: 18 },
  { msg: 'Exploit injected. Firewall bypassed successfully!', percent: 22 },
  { msg: 'Gaining root access to mainframe...', percent: 26 },
  { msg: 'Root access granted. Enumerating users...', percent: 30 },
  { msg: 'Found 3 admin accounts. Cracking passwords...', percent: 34 },
  { msg: 'Password hash extracted. Running bruteforce...', percent: 38 },
  { msg: 'Admin password cracked: ********', percent: 42 },
  { msg: 'Injecting SQL payload into database...', percent: 46 },
  { msg: 'Database access granted. Dumping tables...', percent: 50 },
  { msg: 'Users table dumped. 15,847 records found', percent: 54 },
  { msg: 'Decrypting AES-256 encrypted files...', percent: 58 },
  { msg: 'Files decrypted. Downloading sensitive data...', percent: 62 },
  { msg: 'Downloading personal photos... 847 files', percent: 66 },
  { msg: 'Downloading chat logs... 12,493 messages', percent: 70 },
  { msg: 'Downloading browser history... 5,291 URLs', percent: 74 },
  { msg: 'Installing persistent backdoor...', percent: 78 },
  { msg: 'Backdoor installed at /usr/bin/.hidden', percent: 82 },
  { msg: 'Setting up keylogger...', percent: 86 },
  { msg: 'Keylogger active. Recording keystrokes...', percent: 90 },
  { msg: 'Clearing system logs...', percent: 93 },
  { msg: 'Covering digital footprints...', percent: 96 },
  { msg: 'Wiping connection history...', percent: 98 },
  { msg: 'Hack completed successfully!', percent: 100 }
]

export default {
  name: 'hack',
  alias: ['hacker', 'ddos'],
  desc: 'Fake hack prank with spam messages',
  usage: '<@tag | number | group>',
  category: 'fun',
  permission: 'all',

  execute: async (sock, m, args, { prefix, body }) => {
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *HACK PRANK*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}hack @user\n║ ${prefix}hack 255xxx\n║ ${prefix}hack - hack group\n╚━━━━━━━━━━━━━━━━━═❒`
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
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET LOCKED* 🎯\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Victim: ${targetName}\n║ IP Address: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}\n║ Device: Android 14\n║ Location: ${isGroup? 'Group Chat' : 'Private'}\n║ Status: VULNERABLE\n║\n║ Initiating cyber attack...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2500)
    } else {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET LOCKED* 🎯\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Victim: ${targetName}\n║ IP Address: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}\n║ Status: VULNERABLE\n║\n║ Initiating cyber attack...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2000)
    }

    // 4. SPAM HACK MESSAGES - NO EDIT
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *SYSTEM BREACH INITIATED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Hacker: ${senderName}\n║ Method: Zero-Day Exploit\n║\n║ Launching attack...\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    for (const step of HACK_STEPS) {
      const bar = createProgressBar(step.percent)
      await sleep(900)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *HACKING ${targetName}*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ >> ${step.msg}\n║\n║ ${bar}\n║\n║ Time: ${new Date().toLocaleTimeString()}\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }

    await sleep(2000)

    // 5. FINAL RESULTS SPAM
    const fakeData = [
      `💰 Bank Accounts: ${Math.floor(Math.random() * 5) + 1} found`,
      `💳 Credit Cards: ${Math.floor(Math.random() * 8) + 2} extracted`,
      `📱 WhatsApp Chats: ${Math.floor(Math.random() * 50000) + 10000} messages`,
      `📸 Gallery: ${Math.floor(Math.random() * 5000) + 500} photos`,
      `📹 Videos: ${Math.floor(Math.random() * 800) + 100} files`,
      `🌐 Browser History: ${Math.floor(Math.random() * 10000) + 2000} sites`,
      `🔑 Saved Passwords: ${Math.floor(Math.random() * 300) + 50} cracked`,
      `📧 Emails: ${Math.floor(Math.random() * 15000) + 3000} accessed`,
      `📍 GPS Location: Tracked in real-time`,
      `🎤 Microphone: Activated`,
      `📷 Camera: Remotely accessed`
    ]

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *HACK COMPLETE* ✅\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Status: FULLY COMPROMISED\n║ Access Level: ROOT\n║\n║ ${fakeData.join('\n║ ')}\n║\n║ Total Data Stolen: ${(Math.random() * 50 + 10).toFixed(2)} GB\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *MISSION ACCOMPLISHED* 🎭\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Hacker: ${senderName}\n║ Victim: ${targetName}\n║ Duration: ${HACK_STEPS.length} steps\n║\n║ All data uploaded to dark web\n║ Selling price: $${Math.floor(Math.random() * 10000) + 1000}\n║\n║ Just kidding! It's a prank 😂\n║ No one was actually hacked\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}