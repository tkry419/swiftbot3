/**
 * SwiftBot - plugins/commands/tools/ocr.js
 * Extract Text from Image - Tesseract + 15 Online APIs
 * English only - vs Bot
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import Tesseract from 'tesseract.js'
import fetch from 'node-fetch'

const OCR_FALLBACKS = [
  { url: 'https://api.ocr.space/parse/image', key: 'helloworld', type: 'ocrspace' },
  { url: 'https://api.api-ninjas.com/v1/imagetotext', key: 'demo', type: 'ninjas' },
  { url: 'https://ocr.asprise.com/api/v1/receipt', key: 'TEST', type: 'asprise' },
  { url: 'https://vision.googleapis.com/v1/images:annotate', key: 'demo', type: 'google' },
  { url: 'https://api.mathpix.com/v3/text', key: 'demo', type: 'mathpix' },
  { url: 'https://api.taggun.io/api/receipt/v1/simple/encoded', key: 'demo', type: 'taggun' },
  { url: 'https://api.cloudmersive.com/ocr/image/toText', key: 'demo', type: 'cloudmersive' },
  { url: 'https://api.mindee.net/v1/products/mindee/invoice/v4/predict', key: 'demo', type: 'mindee' },
  { url: 'https://app.nanonets.com/api/v2/OCR/Model/ocr', key: 'demo', type: 'nanonets' },
  { url: 'https://api.abbyy.com/v1/recognizeText', key: 'demo', type: 'abbyy' },
  { url: 'https://api.extracta.ai/v1/ocr', key: 'demo', type: 'extracta' },
  { url: 'https://api.docsumo.com/v1/ocr', key: 'demo', type: 'docsumo' },
  { url: 'https://api.veryfi.com/api/v8/partner/documents', key: 'demo', type: 'veryfi' },
  { url: 'https://api.sensible.so/v0/extract_from_bytes', key: 'demo', type: 'sensible' },
  { url: 'https://api.klearly.dev/v1/ocr', key: 'demo', type: 'klearly' }
]

async function extractTextOnline(buffer, api) {
  try {
    const form = new FormData()
    const blob = new Blob([buffer], { type: 'image/jpeg' })

    if (api.type === 'ocrspace') {
      form.append('file', blob)
      form.append('apikey', api.key)
      form.append('language', 'eng')
    } else {
      form.append('image', blob)
      form.append('file', blob)
    }

    const headers = {}
    if (api.key!== 'demo' && api.key!== 'helloworld' && api.key!== 'TEST') {
      headers['apikey'] = api.key
      headers['Authorization'] = `Bearer ${api.key}`
    }

    const res = await fetch(api.url, {
      method: 'POST',
      headers,
      body: form
    })

    if (!res.ok) return null
    const data = await res.json()

    // Parse different API responses
    if (api.type === 'ocrspace') return data.ParsedResults?.[0]?.ParsedText
    if (api.type === 'ninjas') return data[0]?.text
    if (api.type === 'asprise') return data.ocrText
    return data.text || data.result || data.output || null
  } catch {
    return null
  }
}

export default {
  name: 'ocr',
  alias: ['extracttext', 'totext', 'readtext'],
  desc: 'Extract text from image - 15 fallbacks',
  usage: 'reply image',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const img = quoted?.imageMessage || m.message?.imageMessage
    const doc = quoted?.documentMessage || m.message?.documentMessage

    if (!img &&!doc?.mimetype?.startsWith('image')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Reply an image\n╚━━━━━━━━━━━━━━━━━═❒`
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

      let extractedText = null

      // Try Tesseract first - offline
      try {
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng', {
          logger: () => {}
        })
        if (text && text.trim().length > 5) extractedText = text.trim()
      } catch {}

      // Try 15 online fallbacks if Tesseract fails
      if (!extractedText) {
        for (const api of OCR_FALLBACKS) {
          extractedText = await extractTextOnline(buffer, api)
          if (extractedText && extractedText.trim().length > 2) break
        }
      }

      if (!extractedText || extractedText.trim().length < 2) {
        throw new Error('NO_TEXT_FOUND')
      }

      await sock.sendMessage(from, {
        text: extractedText
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (error) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ OCR failed\n║ No text found in image\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}