/**
 * SwiftBot - plugins/commands/tools/readqr.js
 * Read QR Code - JSQR + 15 Online APIs
 * English only - vs Bot
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import jsQR from 'jsqr'
import Jimp from 'jimp'
import fetch from 'node-fetch'

const QR_READER_APIS = [
  { url: 'https://api.qrserver.com/v1/read-qr-code/', type: 'qrserver' },
  { url: 'https://api.qrapi.io/v1/decode', type: 'qrapi' },
  { url: 'https://api.qrcode-monkey.com/qr/read', type: 'monkey' },
  { url: 'https://zxing.org/w/decode', type: 'zxing' },
  { url: 'https://api.qr-code-generator.com/v1/read', type: 'qrcodegen' },
  { url: 'https://www.qrcode-decoder.net/api/decode', type: 'decoder' },
  { url: 'https://api.qr4gen.com/v1/read', type: 'qr4gen' },
  { url: 'https://qr.io/api/v1/read', type: 'qrio' },
  { url: 'https://api.qr-tag.net/v1/read', type: 'qrtag' },
  { url: 'https://qrickit.com/api/read', type: 'qrickit' },
  { url: 'https://api.qrcode.show/read', type: 'qrcodeshow' },
  { url: 'https://api.qr-decoder.com/v1/decode', type: 'qrdecoder' },
  { url: 'https://api.qrscanner.io/v1/scan', type: 'qrscanner' },
  { url: 'https://api.qr-reader.com/v1/read', type: 'qrreader' },
  { url: 'https://api.qrtool.io/v1/decode', type: 'qrtool' }
]

async function readQROnline(buffer, api) {
  try {
    const form = new FormData()
    const blob = new Blob([buffer], { type: 'image/png' })
    form.append('file', blob)
    form.append('image', blob)

    const res = await fetch(api.url, {
      method: 'POST',
      body: form
    })

    if (!res.ok) return null
    const data = await res.json()

    // Parse different API responses
    if (api.type === 'qrserver') return data[0]?.symbol[0]?.data
    return data.text || data.data || data.result || data.content || null
  } catch {
    return null
  }
}

export default {
  name: 'readqr',
  alias: ['scanqr', 'decodeqr', 'scan'],
  desc: 'Read QR code - 15 fallbacks',
  usage: 'reply qr image',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const img = quoted?.imageMessage || m.message?.imageMessage

    if (!img) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Reply a QR code image\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      const buffer = await downloadMediaMessage(
        quoted? { message: quoted } : m,
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      )

      let qrData = null

      // Try JSQR first - local
      try {
        const image = await Jimp.read(buffer)
        const { data, width, height } = image.bitmap
        const code = jsQR(new Uint8ClampedArray(data.buffer), width, height)
        if (code && code.data) qrData = code.data
      } catch {}

      // Try 15 online fallbacks if local fails
      if (!qrData) {
        for (const api of QR_READER_APIS) {
          qrData = await readQROnline(buffer, api)
          if (qrData && qrData.length > 0) break
        }
      }

      if (!qrData) throw new Error('NO_QR_FOUND')

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *QR CODE CONTENT*\n╚━━━━━━━━━━━━━━━━━═❒\n\n${qrData}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ QR read failed\n║ No QR code found\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}