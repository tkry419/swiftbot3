/**
 * SwiftBot - plugins/commands/tools/enhance.js
 * Enhance Image Quality - Sharp + 15 Online APIs
 * English only - vs Bot
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import sharp from 'sharp'
import fetch from 'node-fetch'

const ENHANCE_FALLBACKS = [
  { url: 'https://api.deepai.org/api/torch-srgan', key: 'quickstart', type: 'deepai' },
  { url: 'https://api.clarifai.com/v2/models/sr-general-image', key: 'demo', type: 'clarifai' },
  { url: 'https://api.replicate.com/v1/predictions', key: 'demo', type: 'replicate' },
  { url: 'https://api.stability.ai/v1/generation/esrgan-v1-x2plus/image-to-image/upscale', key: 'demo', type: 'stability' },
  { url: 'https://api.bria.ai/v1/tools/enhance', key: 'demo', type: 'bria' },
  { url: 'https://api.letsenhance.io/v1/enhance', key: 'demo', type: 'letsenhance' },
  { url: 'https://api.photokit.com/v1/enhance', key: 'demo', type: 'photokit' },
  { url: 'https://api.upscaler.io/v1/upscale', key: 'demo', type: 'upscaler' },
  { url: 'https://api.picsart.io/tools/1.0/upscale', key: 'demo', type: 'picsart' },
  { url: 'https://api.fotor.com/v1/enhance', key: 'demo', type: 'fotor' },
  { url: 'https://api.cutout.pro/v1/enhancePhoto', key: 'demo', type: 'cutout' },
  { url: 'https://api.remini.ai/v1/enhance', key: 'demo', type: 'remini' },
  { url: 'https://api.waifu2x.udp.jp/api', key: 'none', type: 'waifu2x' },
  { url: 'https://api.bigjpg.com/api/task/', key: 'demo', type: 'bigjpg' },
  { url: 'https://api.imglarger.com/v1/enhance', key: 'demo', type: 'imglarger' }
]

async function enhanceOnline(buffer, api) {
  try {
    const form = new FormData()
    const blob = new Blob([buffer], { type: 'image/jpeg' })
    form.append('image', blob)
    form.append('file', blob)
    form.append('scale', '2')

    const headers = {}
    if (api.key!== 'demo' && api.key!== 'quickstart' && api.key!== 'none') {
      headers['api-key'] = api.key
      headers['Authorization'] = `Bearer ${api.key}`
    }

    const res = await fetch(api.url, {
      method: 'POST',
      headers,
      body: form
    })

    if (!res.ok) return null
    const result = await res.arrayBuffer()
    if (result.byteLength < 1000) return null

    return Buffer.from(result)
  } catch {
    return null
  }
}

export default {
  name: 'enhance',
  alias: ['hd', 'upscale', '4k'],
  desc: 'Enhance image quality - 15 fallbacks',
  usage: 'reply image',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const img = quoted?.imageMessage || m.message?.imageMessage

    if (!img) {
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

      let enhancedBuffer = null

      // Try Sharp first - local processing
      try {
        enhancedBuffer = await sharp(buffer)
        .sharpen({ sigma: 1.5 })
        .modulate({ brightness: 1.1, saturation: 1.2 })
        .jpeg({ quality: 95, mozjpeg: true })
        .toBuffer()
      } catch {}

      // Try 15 online fallbacks if Sharp fails or result too small
      if (!enhancedBuffer || enhancedBuffer.length < buffer.length * 1.2) {
        for (const api of ENHANCE_FALLBACKS) {
          enhancedBuffer = await enhanceOnline(buffer, api)
          if (enhancedBuffer && enhancedBuffer.length > buffer.length) break
        }
      }

      if (!enhancedBuffer) throw new Error('ENHANCE_FAILED')

      await sock.sendMessage(from, {
        image: enhancedBuffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Image enhanced ✅\n║ Quality improved\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Enhance failed\n║ Try another image\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}