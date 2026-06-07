/**
 * SwiftBot - plugins/commands/fun/expose.js
 * Fake Doxx/Expose Prank - Spam leaked info with bars
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

const EXPOSE_STEPS = [
  { msg: 'Accessing dark web database...', percent: 5 },
  { msg: 'Database connected. Searching records...', percent: 10 },
  { msg: 'Found 3 matching profiles...', percent: 15 },
  { msg: 'Cross-referencing social media...', percent: 20 },
  { msg: 'Facebook profile: LOCATED', percent: 25 },
  { msg: 'Instagram account: FOUND', percent: 30 },
  { msg: 'Extracting personal details...', percent: 35 },
  { msg: 'Full Name: [REDACTED]', percent: 40 },
  { msg: 'Date of Birth: **/**/****', percent: 45 },
  { msg: 'Phone Number: +1*******', percent: 50 },
  { msg: 'Email Address: *******@gmail.com', percent: 55 },
  { msg: 'Home Address: Street ***', percent: 60 },
  { msg: 'Bank Account: 02********', percent: 65 },
  { msg: 'Mobile Money PIN: ****', percent: 70 },
  { msg: 'Passwords Dump: 47 found', percent: 75 },
  { msg: 'Browser History: 8,492 sites', percent: 80 },
  { msg: 'Private Photos: 1,247 files', percent: 85 },
  { msg: 'WhatsApp Chats: 34,891 messages', percent: 90 },
  { msg: 'Location History: TRACKED', percent: 94 },
  { msg: 'Credit Score: EXPOSED', percent: 97 },
  { msg: 'All data compiled...', percent: 99 },
  { msg: 'EXPOSE COMPLETE', percent: 100 }
]

export default {
  name: 'expose',
  alias: ['doxx', 'leak', 'leaked'],
  desc: 'Fake doxx/expose prank',
  usage: '<@tag | number>',
  category: 'fun',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

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
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *EXPOSE PRANK* 🕵️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}expose @user\n║ ${prefix}expose 1555xxx\n║ ${prefix}expose - reply to msg\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. GET PROFILE PIC
    try {
      targetPic = await sock.profilePictureUrl(target, 'image')
    } catch {
      targetPic = null
    }

    // 3. SEND TARGET PIC FIRST
    const fakeNumber = `+1${Math.floor(Math.random() * 900000000) + 100000000}`
    const fakeEmail = `${targetName.toLowerCase().replace(/[^a-z]/g, '')}${Math.floor(Math.random() * 999)}@gmail.com`

    if (targetPic) {
      await sock.sendMessage(from, {
        image: { url: targetPic },
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET ACQUIRED* 🎯\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Name: ${targetName}\n║ Status: DOXXED\n║ Threat: MAXIMUM\n║\n║ Gathering intelligence...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2500)
    } else {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET ACQUIRED* 🎯\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Name: ${targetName}\n║ Status: DOXXED\n║ Threat: MAXIMUM\n║\n║ Gathering intelligence...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2000)
    }

    // 4. SPAM EXPOSE MESSAGES
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DOXX.EXE RUNNING* 🕵️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Operator: ${senderName}\n║ Source: Dark Web\n║ Method: OSINT\n║\n║ Leaking personal data...\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    for (const step of EXPOSE_STEPS) {
      const bar = createProgressBar(step.percent)
      await sleep(800)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *EXPOSING ${targetName}* 📂\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ >> ${step.msg}\n║\n║ ${bar}\n║\n║ Files Leaked: ${Math.floor(step.percent * 15)}\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }

    await sleep(2000)

    // 5. FAKE LEAKED DATA
    const leakedData = [
      `📱 Phone: ${fakeNumber}`,
      `📧 Email: ${fakeEmail}`,
      `🏠 Location: Los Angeles, ${['Downtown', 'Hollywood', 'Beverly Hills', 'Santa Monica'][Math.floor(Math.random() * 4)]}`,
      `🎂 Age: ${Math.floor(Math.random() * 30) + 18} years`,
      `💰 Bank Balance: $${(Math.random() * 50000 + 1000).toFixed(2)}`,
      `💳 Cash App PIN: ****`,
      `🔑 FB Password: ********`,
      `🔑 IG Password: ********`,
      `📍 Last Seen: Starbucks, 2 mins ago`,
      `📸 Private Pics: ${Math.floor(Math.random() * 50)} files`,
      `💬 Secret Chats: ${Math.floor(Math.random() * 100)} exposed`,
      `🌐 IP Address: 192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      `📶 WiFi: "Netgear_${Math.random().toString(36).slice(2,6).toUpperCase()}"`
    ]

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *DATA LEAK COMPLETE* 💀\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Victim: ${targetName}\n║ Status: FULLY EXPOSED\n║\n║ ${leakedData.join('\n║ ')}\n║\n║ All data posted on Pastebin\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *EXPOSE FINISHED* 🕵️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Exposer: ${senderName}\n║ Victim: ${targetName}\n║ Method: Deep Doxx\n║ Result: LIFE RUINED\n║\n║ Link: https://pastebin.com/fake\n║ Views: ${Math.floor(Math.random() * 10000) + 1000}\n║\n║ RELAX! It's just a prank 😂\n║ No real data here\n║ Don't worry bro, you're safe\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}