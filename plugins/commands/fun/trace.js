/**
 * SwiftBot - plugins/commands/fun/trace.js
 * Fake IP Trace Prank - Spam messages with bars
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

const TRACE_STEPS = [
  { msg: 'Initializing trace protocol...', percent: 4 },
  { msg: 'Connecting to CIA database...', percent: 8 },
  { msg: 'Access granted. Scanning network...', percent: 12 },
  { msg: 'IP Address detected: 192.168.xxx.xxx', percent: 16 },
  { msg: 'Bypassing VPN encryption...', percent: 20 },
  { msg: 'VPN bypassed. Real IP exposed...', percent: 24 },
  { msg: 'Geolocating target device...', percent: 28 },
  { msg: 'Satellite triangulation active...', percent: 32 },
  { msg: 'Location ping: Dar es Salaam, TZ', percent: 36 },
  { msg: 'ISP identified: Vodacom Tanzania', percent: 40 },
  { msg: 'Accessing phone tower data...', percent: 44 },
  { msg: 'Cell tower ID: VTZ-${Math.floor(Math.random() * 9999)}', percent: 48 },
  { msg: 'Extracting device fingerprint...', percent: 52 },
  { msg: 'Device: Samsung Galaxy S24 Ultra', percent: 56 },
  { msg: 'IMEI captured: 35${Math.floor(Math.random() * 999999999999)}', percent: 60 },
  { msg: 'Scanning active WiFi networks...', percent: 64 },
  { msg: 'WiFi SSID: "Home_WiFi_5G" detected', percent: 68 },
  { msg: 'MAC Address: ${Math.random().toString(16).slice(2,14).toUpperCase()}', percent: 72 },
  { msg: 'Accessing front camera...', percent: 76 },
  { msg: 'Camera feed: ACTIVE - Face detected', percent: 80 },
  { msg: 'Recording microphone audio...', percent: 84 },
  { msg: 'Audio sample captured: 3.2 seconds', percent: 88 },
  { msg: 'Downloading WhatsApp database...', percent: 92 },
  { msg: 'Decrypting msgstore.db.crypt14...', percent: 96 },
  { msg: 'Database decrypted: 47,392 messages', percent: 99 },
  { msg: 'TRACE COMPLETE - Full access granted', percent: 100 }
]

export default {
  name: 'trace',
  alias: ['track', 'locate', 'ip'],
  desc: 'Fake IP trace prank',
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
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *IP TRACE* 🌐\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}trace @user\n║ ${prefix}trace 255xxx\n║ ${prefix}trace - trace group\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // 2. GET PROFILE PIC
    try {
      targetPic = await sock.profilePictureUrl(target, 'image')
    } catch {
      targetPic = null
    }

    // 3. SEND TARGET PIC FIRST
    const fakeIP = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`
    const fakeISP = ['Vodacom', 'Airtel', 'Tigo', 'Halotel'][Math.floor(Math.random() * 4)]

    if (targetPic) {
      await sock.sendMessage(from, {
        image: { url: targetPic },
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET IDENTIFIED* 🎯\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Name: ${targetName}\n║ Status: ONLINE\n║ IP: ${fakeIP}\n║ ISP: ${fakeISP} Tanzania\n║ Protocol: TCP/IP\n║\n║ Initiating deep trace...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2500)
    } else {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TARGET IDENTIFIED* 🎯\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Name: ${targetName}\n║ Status: ONLINE\n║ IP: ${fakeIP}\n║ ISP: ${fakeISP} Tanzania\n║\n║ Initiating deep trace...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
      await sleep(2000)
    }

    // 4. SPAM TRACE MESSAGES
    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TRACE.EXE RUNNING* 🌐\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Target: ${targetName}\n║ Operator: ${senderName}\n║ Agency: NSA/CIA Joint Op\n║ Clearance: TOP SECRET\n║\n║ Establishing connection...\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    for (const step of TRACE_STEPS) {
      const bar = createProgressBar(step.percent)
      await sleep(750)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TRACING ${targetName}* 📡\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ >> ${step.msg}\n║\n║ ${bar}\n║\n║ Signal: ${Math.floor(Math.random() * 30) + 70}dBm\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }

    await sleep(2000)

    // 5. FINAL INTEL REPORT
    const intel = [
      `📍 Location: Dar es Salaam, Kariakoo`,
      `📱 Device: Samsung Galaxy S24 Ultra`,
      `🔋 Battery: ${Math.floor(Math.random() * 100)}%`,
      `📶 Network: 5G - ${fakeISP}`,
      `🌐 IP: ${fakeIP}`,
      `🏠 Address: Street ${Math.floor(Math.random() * 50)}, House ${Math.floor(Math.random() * 200)}`,
      `💻 OS: Android 14`,
      `🔐 Encryption: Bypassed`,
      `📷 Camera: Accessed`,
      `🎤 Microphone: Active`,
      `📊 Data Usage: ${(Math.random() * 50 + 10).toFixed(2)} GB/month`
    ]

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TRACE SUCCESSFUL* ✅\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Subject: ${targetName}\n║ Status: FULLY TRACKED\n║\n║ ${intel.join('\n║ ')}\n║\n║ Threat Level: MAXIMUM\n╚━━━━━━━━━━━━━━━━━═❒`
    })

    await sleep(1500)

    await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *OPERATION COMPLETE* 🕵️\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Agent: ${senderName}\n║ Target: ${targetName}\n║ Duration: ${TRACE_STEPS.length} scans\n║\n║ All data sent to headquarters\n║ FBI has been notified\n║\n║ Just kidding! Prank tu 😂\n║ Hakuna mtu anaku-trace\n╚━━━━━━━━━━━━━━━━━═❒`
    })
  }
}