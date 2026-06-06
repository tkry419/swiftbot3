/**
 * SwiftBot - plugins/commands/tools/sticker.js
 * Create Sticker from Image/Video/GIF - vs Bot
 * 15 Fallbacks, Custom Packname Support
 * Default: packname = sender pushName, pack = BOTNAME
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const execAsync = promisify(exec)
const BOTNAME = 'SwiftBot' // Change this to your bot name

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

// 15 Fallback commands for sticker conversion
const FFMPEG_FALLBACKS = [
  'ffmpeg -i {input} -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=#00000000" -c:v libwebp -lossless 1 -q:v 50 -preset default -loop 0 -an -vsync 0 {output}',
  'ffmpeg -i {input} -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=12,pad=512:512:(ow-iw)/2:(oh-ih)/2" -c:v libwebp -q:v 80 -preset default -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=10" -c:v libwebp -q:v 70 -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=400:400:force_original_aspect_ratio=decrease,fps=10,pad=512:512:(ow-iw)/2:(oh-ih)/2" -c:v libwebp -q:v 60 -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=512:512,fps=8" -c:v libwebp -q:v 50 -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=320:320:force_original_aspect_ratio=decrease,fps=10,pad=512:512:(ow-iw)/2:(oh-ih)/2" -c:v libwebp -q:v 40 -loop 0 -an {output}',
  'ffmpeg -i {input} -t 6 -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=8" -c:v libwebp -q:v 60 -loop 0 -an {output}',
  'ffmpeg -i {input} -t 4 -vf "scale=512:512,fps=6" -c:v libwebp -q:v 50 -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=256:256:force_original_aspect_ratio=decrease,fps=8,pad=512:512:(ow-iw)/2:(oh-ih)/2" -c:v libwebp -q:v 30 -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=512:512" -c:v libwebp -q:v 90 -loop 0 -an -pix_fmt yuva420p {output}',
  'ffmpeg -i {input} -vf "scale=512:512:force_original_aspect_ratio=decrease" -frames:v 1 -c:v libwebp -q:v 80 {output}',
  'ffmpeg -i {input} -vf "scale=400:400" -c:v libwebp -q:v 70 -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=300:300,fps=5" -c:v libwebp -q:v 40 -loop 0 -an {output}',
  'ffmpeg -i {input} -t 3 -vf "scale=512:512,fps=5" -c:v libwebp -q:v 30 -loop 0 -an {output}',
  'ffmpeg -i {input} -vf "scale=512:512" -c:v libwebp -compression_level 6 -q:v 50 {output}'
]

async function convertToSticker(inputPath, outputPath) {
  for (let i = 0; i < FFMPEG_FALLBACKS.length; i++) {
    try {
      const cmd = FFMPEG_FALLBACKS[i]
       .replace('{input}', `"${inputPath}"`)
       .replace('{output}', `"${outputPath}"`)

      await execAsync(cmd)

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0) {
        return true
      }
    } catch (err) {
      continue
    }
  }
  return false
}

export default {
  name: 'sticker',
  alias: ['s', 'stiker', 'stick'],
  desc: 'Convert image/video/gif to sticker',
  usage: '[packname] reply media',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    // Get quoted message or current message
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const msg = quoted || m.message

    const img = msg?.imageMessage
    const vid = msg?.videoMessage
    const gif = msg?.videoMessage?.gifPlayback
    const doc = msg?.documentMessage

    let mediaType = null
    if (img) mediaType = 'image'
    else if (gif) mediaType = 'gif'
    else if (vid) mediaType = 'video'
    else if (doc?.mimetype?.startsWith('image')) mediaType = 'document-image'
    else if (doc?.mimetype?.startsWith('video')) mediaType = 'document-video'

    if (!mediaType) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *STICKER MAKER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reply image/video/gif\n║ Max: 10 seconds\n║\n║ Usage: ${await db.get('prefix')}s packname\n║ Default packname: Your name\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    const tempDir = './temp'
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const rand = crypto.randomBytes(6).toString('hex')
    const inputPath = path.join(tempDir, `in_${rand}`)
    const outputPath = path.join(tempDir, `out_${rand}.webp`)

    try {
      // Download media
      const buffer = await downloadMediaMessage(
        quoted? { message: quoted } : m,
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      )

      // Determine extension
      let ext = '.jpg'
      if (vid || gif) ext = '.mp4'
      else if (doc?.mimetype === 'image/webp') ext = '.webp'
      else if (doc?.mimetype === 'image/gif') ext = '.gif'

      fs.writeFileSync(inputPath + ext, buffer)

      // Custom packname from args or default to sender name
      const packname = args.join(' ') || senderName
      const author = BOTNAME

      // Convert with 15 fallbacks
      const success = await convertToSticker(inputPath + ext, outputPath)

      if (!success ||!fs.existsSync(outputPath)) {
        throw new Error('CONVERSION_FAILED')
      }

      const stickerBuffer = fs.readFileSync(outputPath)

      // Send sticker with metadata
      await sock.sendMessage(from, {
        sticker: stickerBuffer,
        packname: packname,
        author: author
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (error) {
      let errorMsg = 'Conversion failed'
      if (error.message === 'CONVERSION_FAILED') errorMsg = 'File too large or unsupported'
      else if (error.message.includes('not found')) errorMsg = 'ffmpeg not installed'

      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *STICKER FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n║ Try smaller file\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    } finally {
      // Cleanup
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
        if (fs.existsSync(inputPath + '.jpg')) fs.unlinkSync(inputPath + '.jpg')
        if (fs.existsSync(inputPath + '.mp4')) fs.unlinkSync(inputPath + '.mp4')
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
      } catch {}
    }
  }
}