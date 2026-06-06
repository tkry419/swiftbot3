/**
 * SwiftBot - plugins/commands/tools/tovideo.js
 * Convert Animated Sticker to Video - 15 Fallbacks
 */

import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'

const execAsync = promisify(exec)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 15 Download methods - same kama toimg
async function downloadSticker(sticker, sock) {
  const methods = [
    async () => await sock.downloadMediaMessage({ message: { stickerMessage: sticker } }, 'buffer', {}, {}),
    async () => await sock.downloadMediaMessage({ message: { stickerMessage: sticker } }, 'buffer'),
    async () => await sock.downloadMediaMessage({ message: { stickerMessage: sticker } }),
    async () => await downloadStream(sticker, 'sticker'),
    async () => await downloadStream(sticker, 'sticker', {}),
    async () => await downloadStream(sticker, 'sticker', { reuploadRequest: () => {} }),
    async () => await downloadStream(sticker, 'sticker', { startByte: 0 }),
    async () => await downloadStream(sticker, 'sticker', { logger: console }),
    async () => await streamToBuf(downloadContentFromMessage(sticker, 'sticker')),
    async () => await streamChunks(sticker),
    async () => await downloadURL(sticker),
    async () => await downloadURLV2(sticker),
    async () => await downloadURLV3(sticker),
    async () => await downloadDirectPath(sticker),
    async () => await downloadFallback(sticker)
  ]

  for (const method of methods) {
    try {
      const buf = await method()
      if (buf && buf.length > 100) return buf
    } catch { continue }
  }
  throw new Error('DOWNLOAD_FAILED')
}

async function downloadStream(sticker, type, opts = {}) {
  const stream = await downloadContentFromMessage(sticker, type, opts)
  return await streamToBuf(stream)
}

async function streamToBuf(stream) {
  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)
  return Buffer.concat(chunks)
}

async function streamChunks(sticker) {
  const stream = await downloadContentFromMessage(sticker, 'sticker')
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', c => chunks.push(c))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

async function downloadURL(sticker) {
  if (!sticker.url) throw new Error('No URL')
  const res = await fetch(sticker.url, { headers: { 'User-Agent': 'WhatsApp/2.23.20.76' } })
  return Buffer.from(await res.arrayBuffer())
}

async function downloadURLV2(sticker) {
  if (!sticker.directPath) throw new Error('No directPath')
  const res = await fetch(`https://mmg.whatsapp.net${sticker.directPath}`)
  return Buffer.from(await res.arrayBuffer())
}

async function downloadURLV3(sticker) {
  const url = sticker.url || `https://mmg.whatsapp.net${sticker.directPath}`
  const res = await fetch(url, { headers: { 'Referer': 'https://web.whatsapp.com/' } })
  return Buffer.from(await res.arrayBuffer())
}

async function downloadDirectPath(sticker) {
  if (sticker.fileSha256) {
    const res = await fetch(`https://mmg.whatsapp.net${sticker.directPath}`)
    const buf = await res.buffer()
    if (buf.length > 100) return buf
  }
  throw new Error('DirectPath fail')
}

async function downloadFallback(sticker) {
  const url = sticker.url || `https://mmg.whatsapp.net${sticker.directPath}`
  const res = await fetch(url)
  const buf = await res.buffer()
  return buf
}

// 5 FFmpeg conversion methods
async function convertToVideo(inputPath, outputPath, isAnimated) {
  const methods = [
    // Method 1: Standard animated webp to mp4
    `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=20,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart -an "${outputPath}" -y`,
    
    // Method 2: For animated webp with transparency
    `ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,format=yuva420p,fps=20,pad=512:512:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset medium -crf 23 -pix_fmt yuv420p "${outputPath}" -y`,
    
    // Method 3: Loop single frame if not animated
    `ffmpeg -loop 1 -i "${inputPath}" -vf "scale=512:512,fps=15" -c:v libx264 -t 3 -pix_fmt yuv420p "${outputPath}" -y`,
    
    // Method 4: Force animation extraction
    `ffmpeg -i "${inputPath}" -vf "fps=20,scale=512:-1:flags=lanczos" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${outputPath}" -y`,
    
    // Method 5: Webp demux then encode
    `ffmpeg -i "${inputPath}" -vcodec libx264 -vf "scale=512:512" -an -pix_fmt yuv420p "${outputPath}" -y`
  ]

  for (const cmd of methods) {
    try {
      await execAsync(cmd)
      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
        return true
      }
    } catch { continue }
  }
  return false
}

async function convertToGif(inputPath, outputPath) {
  const cmd = `ffmpeg -i "${inputPath}" -vf "fps=15,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${outputPath}" -y`
  try {
    await execAsync(cmd)
    return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000
  } catch { return false }
}

export default {
  name: 'tovideo',
  alias: ['tovid', 'tomp4', 'togif'],
  desc: 'Convert animated sticker to video - 15 fallbacks',
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

    await sock.sendMessage(from, { react: { text: '⏳', key: m.key } })

    const tempDir = path.join(__dirname, '../../../temp')
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const rand = crypto.randomBytes(6).toString('hex')
    const inputPath = path.join(tempDir, `in_${rand}.webp`)
    const outputPath = path.join(tempDir, `out_${rand}.mp4`)
    const gifPath = path.join(tempDir, `out_${rand}.gif`)

    try {
      // Download with 15 fallbacks
      const buffer = await downloadSticker(sticker, sock)
      fs.writeFileSync(inputPath, buffer)

      // Check if animated
      const isAnimated = sticker.isAnimated || sticker.mimetype === 'image/webp'

      // Try MP4 first
      const videoSuccess = await convertToVideo(inputPath, outputPath, isAnimated)

      if (videoSuccess) {
        const videoBuffer = fs.readFileSync(outputPath)
        await sock.sendMessage(from, {
          video: videoBuffer,
          caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Sticker → Video ✅\n║ ${isAnimated ? 'Animated' : 'Static'}\n╚━━━━━━━━━━━━━━━━━═❒`,
          gifPlayback: false
        }, { quoted: m })
        await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
      } else {
        // Try GIF as fallback
        const gifSuccess = await convertToGif(inputPath, gifPath)
        
        if (gifSuccess) {
          const gifBuffer = fs.readFileSync(gifPath)
          await sock.sendMessage(from, {
            video: gifBuffer,
            caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Sticker → GIF ✅\n║ MP4 failed, sent as GIF\n╚━━━━━━━━━━━━━━━━━═❒`,
            gifPlayback: true
          }, { quoted: m })
          await sock.sendMessage(from, { react: { text: '✅', key: m.key } })
        } else {
          throw new Error('CONVERSION_FAILED')
        }
      }

    } catch (e) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Conversion failed\n║ ${e.message === 'DOWNLOAD_FAILED' ? 'Cannot download sticker' : 'FFmpeg error'}\n║ Try: ${db.get('prefix') || '.'}toimg\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
        if (fs.existsSync(gifPath)) fs.unlinkSync(gifPath)
      } catch {}
    }
  }
}