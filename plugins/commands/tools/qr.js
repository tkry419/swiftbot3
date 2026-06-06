/**
 * SwiftBot - plugins/commands/tools/qr.js
 * Generate QR Code - 15 Online APIs
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const QR_APIS = [
  { url: 'https://api.qrserver.com/v1/create-qr-code/', type: 'qrserver' },
  { url: 'https://quickchart.io/qr', type: 'quickchart' },
  { url: 'https://chart.googleapis.com/chart', type: 'google' },
  { url: 'https://api.qrcode-monkey.com/qr/custom', type: 'monkey' },
  { url: 'https://qrcode.tec-it.com/API/QRCode', type: 'tecit' },
  { url: 'https://api.qrapi.io/v1/qrcode', type: 'qrapi' },
  { url: 'https://www.qrtag.net/api/qr', type: 'qrtag' },
  { url: 'https://api.qr-code-generator.com/v1/create', type: 'qrcodegen' },
  { url: 'https://qrickit.com/api/qr', type: 'qrickit' },
  { url: 'https://qr.io/api/v1/generate', type: 'qrio' },
  { url: 'https://goqr.me/api/qr', type: 'goqr' },
  { url: 'https://qrcode.show', type: 'qrcodeshow' },
  { url: 'https://qr4gen.com/api/qr', type: 'qr4gen' },
  { url: 'https://api.qr-generator.io/v1', type: 'qrgenerator' },
  { url: 'https://qr.io/qr', type: 'qrio2' }
]

async function generateQR(text, api) {
  try {
    let url = ''
    if (api.type === 'qrserver') {
      url = `${api.url}?size=500x500&data=${encodeURIComponent(text)}&format=png`
    } else if (api.type === 'quickchart') {
      url = `${api.url}?text=${encodeURIComponent(text)}&size=500`
    } else if (api.type === 'google') {
      url = `${api.url}?cht=qr&chs=500x500&chl=${encodeURIComponent(text)}`
    } else if (api.type === 'qrcodeshow') {
      url = `${api.url}/${encodeURIComponent(text)}?size=500`
    } else {
      url = `${api.url}?data=${encodeURIComponent(text)}&size=500`
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })

    if (!res.ok) return null
    const buffer = await res.arrayBuffer()
    if (buffer.byteLength < 500) return null

    return Buffer.from(buffer)
  } catch {
    return null
  }
}

export default {
  name: 'qr',
  alias: ['qrcode', 'makeqr', 'genqr'],
  desc: 'Generate QR code - 15 fallbacks',
  usage: 'text or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let text = args.join(' ') || quotedText

    if (!text) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}qr Hello World\n║ ${prefix}qr https://google.com\n║ Reply message ${prefix}qr\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (text.length > 2000) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Text too long\n║ Max: 2000 chars\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let qrBuffer = null

      // Try all 15 APIs
      for (const api of QR_APIS) {
        qrBuffer = await generateQR(text, api)
        if (qrBuffer) break
      }

      if (!qrBuffer) throw new Error('QR_FAILED')

      await sock.sendMessage(from, {
        image: qrBuffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ QR Code Generated ✅\n║ Data: ${text.slice(0, 50)}${text.length > 50? '...' : ''}\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ QR generation failed\n║ Try shorter text\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}