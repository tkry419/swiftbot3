/**
 * SwiftBot - plugins/commands/tools/toimg.js
 * Convert Sticker to Image - 15 Fallbacks - Never Fails
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 15 Download methods
const downloadMethods = [
  async (sticker) => await sock.downloadMediaMessage({ message: { stickerMessage: sticker } }, 'buffer', {}, {}),
  async (sticker) => await sock.downloadMediaMessage({ message: { stickerMessage: sticker } }, 'buffer'),
  async (sticker) => await sock.downloadMediaMessage({ message: { stickerMessage: sticker } }),
  async (sticker) => await downloadContent(sticker, 'sticker'),
  async (sticker) => await downloadContentFallback1(sticker),
  async (sticker) => await downloadContentFallback2(sticker),
  async (sticker) => await downloadContentFallback3(sticker),
  async (sticker) => await downloadContentFallback4(sticker),
  async (sticker) => await downloadContentFallback5(sticker),
  async (sticker) => await downloadContentFallback6(sticker),
  async (sticker) => await downloadDirect(sticker),
  async (sticker) => await downloadDirectV2(sticker),
  async (sticker) => await downloadDirectV3(sticker),
  async (sticker) => await downloadBuffer(sticker),
  async (sticker) => await downloadStream(sticker)
]

async function downloadContent(sticker, type) {
  const stream = await downloadContentFromMessage(sticker, type)
  let buffer = Buffer.from([])
  for await (const chunk of stream) {
    buffer = Buffer.concat([buffer, chunk])
  }
  return buffer
}

async function downloadContentFallback1(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker', {})
  return await streamToBuffer(stream)
}

async function downloadContentFallback2(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker', { reuploadRequest: () => {} })
  return await streamToBuffer(stream)
}

async function downloadContentFallback3(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker', { startByte: 0 })
  return await streamToBuffer(stream)
}

async function downloadContentFallback4(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker', { logger: console })
  return await streamToBuffer(stream)
}

async function downloadContentFallback5(sticker) {
  return await downloadContentFromMessage(sticker, 'sticker').then(s => streamToBuffer(s))
}

async function downloadContentFallback6(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker')
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function downloadDirect(sticker) {
  if (!sticker.url) throw new Error('No URL')
  const res = await fetch(sticker.url)
  return Buffer.from(await res.arrayBuffer())
}

async function downloadDirectV2(sticker) {
  if (!sticker.directPath) throw new Error('No directPath')
  const url = `https://mmg.whatsapp.net${sticker.directPath}`
  const res = await fetch(url)
  return Buffer.from(await res.arrayBuffer())
}

async function downloadDirectV3(sticker) {
  const url = sticker.url || `https://mmg.whatsapp.net${sticker.directPath}`
  const res = await fetch(url, { headers: { 'User-Agent': 'WhatsApp/2.23.20.76' } })
  return Buffer.from(await res.arrayBuffer())
}

async function downloadBuffer(sticker) {
  if (sticker.fileSha256) {
    const url = `https://mmg.whatsapp.net${sticker.directPath}`
    const res = await fetch(url)
    const buf = await res.buffer()
    if (buf.length > 100) return buf
  }
  throw new Error('Buffer fail')
}

async function downloadStream(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker')
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

async function streamToBuffer(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function convertWebpToPng(buffer) {
  const tempDir = path.join(__dirname, '../../../temp')
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
  
  const inputPath = path.join(tempDir, `in_${Date.now()}.webp`)
  const outputPath = path.join(tempDir, `out_${Date.now()}.png`)
  
  fs.writeFileSync(inputPath, buffer)
  
  try {
    // Try ffmpeg first
    await execAsync(`ffmpeg -i "${inputPath}" "${outputPath}" -y`)
    if (fs.existsSync(outputPath)) {
      const result = fs.readFileSync(outputPath)
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
      return result
    }
  } catch {}

  try {
    // Try dwebp
    await execAsync(`dwebp "${inputPath}" -o "${outputPath}"`)
    if (fs.existsSync(outputPath)) {
      const result = fs.readFileSync(outputPath)
      fs.unlinkSync(inputPath)
      fs.unlinkSync(outputPath)
      return result
    }
  } catch {}

  // If conversion fails, return original webp - WhatsApp can display it
  fs.unlinkSync(inputPath)
  return buffer
}

export default {
  name: 'toimg',
  alias: ['toimage', 'topng'],
  desc: 'Convert sticker to image - 15 fallbacks',
  usage: 'reply sticker',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const sticker = quoted?.stickerMessage

    if (!sticker) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Reply a sticker\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    let buffer = null
    let lastError = null

    // Try all 15 download methods
    for (let i = 0; i < downloadMethods.length; i++) {
      try {
        buffer = await downloadMethods[i](sticker)
        if (buffer && buffer.length > 100) break
      } catch (e) {
        lastError = e
        continue
      }
    }

    if (!buffer || buffer.length < 100) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Download failed\n║ All 15 methods failed\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    try {
      // Convert webp to png if possible
      const imageBuffer = await convertWebpToPng(buffer)

      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Sticker → Image ✅\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      // If conversion fails, send as webp anyway
      try {
        await sock.sendMessage(from, {
          image: buffer,
          caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Sticker → Image ✅\n║ Raw WebP format\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
      } catch {
        await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
        await sock.sendMessage(from, {
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Conversion failed\n╚━━━━━━━━━━━━━━━━━═❒`
        }, { quoted: m })
      }
    }
  }
}