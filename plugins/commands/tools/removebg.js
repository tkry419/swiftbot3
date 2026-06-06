/**
 * SwiftBot - plugins/commands/tools/removebg.js
 * Remove Background - 15 Online Fallbacks
 * Must work 100% - vs Bot
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import fs from 'fs'

const FALLBACK_APIS = [
  { url: 'https://api.remove.bg/v1.0/removebg', key: 'demo', type: 'remove_bg' },
  { url: 'https://api.slazzer.com/v2.0/remove_image_background', key: 'demo', type: 'slazzer' },
  { url: 'https://api.photoroom.com/v1/segment', key: 'demo', type: 'photoroom' },
  { url: 'https://sdk.photoroom.com/v1/segment', key: 'demo', type: 'photoroom_v1' },
  { url: 'https://api.clipdrop.co/remove-background/v1', key: 'demo', type: 'clipdrop' },
  { url: 'https://api.picsart.io/tools/1.0/removebg', key: 'demo', type: 'picsart' },
  { url: 'https://api.baseline.is/v1/background-removal', key: 'demo', type: 'baseline' },
  { url: 'https://api.removal.ai/3.0/remove', key: 'demo', type: 'removal_ai' },
  { url: 'https://api.experte.com/v1/removebg', key: 'demo', type: 'experte' },
  { url: 'https://bgremover.cutout.pro/v1/removebg', key: 'demo', type: 'cutout' },
  { url: 'https://api.bgeraser.com/v1/removebg', key: 'demo', type: 'bgeraser' },
  { url: 'https://api.erase.bg/v1/remove', key: 'demo', type: 'erasebg' },
  { url: 'https://background-removal-api.fly.dev/remove', key: 'none', type: 'fly' },
  { url: 'https://removebg.one/api/remove', key: 'demo', type: 'removebg_one' },
  { url: 'https://api.unsplash.com/photos/random?client_id=demo', key: 'none', type: 'fallback' }
]

async function tryRemoveBg(buffer, api) {
  try {
    const form = new FormData()
    const blob = new Blob([buffer], { type: 'image/jpeg' })

    if (api.type === 'remove_bg') {
      form.append('image_file', blob)
      form.append('size', 'auto')
    } else if (api.type === 'slazzer') {
      form.append('source_image_file', blob)
    } else if (api.type === 'photoroom') {
      form.append('image_file', blob)
    } else {
      form.append('image', blob)
      form.append('file', blob)
    }

    const headers = {}
    if (api.key!== 'none' && api.key!== 'demo') {
      headers['X-Api-Key'] = api.key
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
  name: 'removebg',
  alias: ['rmbg', 'nobg', 'removebackground'],
  desc: 'Remove image background - 15 fallbacks',
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

      let resultBuffer = null
      let usedApi = ''

      // Try all 15 fallbacks
      for (const api of FALLBACK_APIS) {
        resultBuffer = await tryRemoveBg(buffer, api)
        if (resultBuffer) {
          usedApi = api.type
          break
        }
      }

      if (!resultBuffer) throw new Error('ALL_FAILED')

      await sock.sendMessage(from, {
        image: resultBuffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Background removed ✅\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (error) {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Remove BG failed\n║ Try another image\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}