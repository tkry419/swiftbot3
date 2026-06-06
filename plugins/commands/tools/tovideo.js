/**
 * SwiftBot - plugins/commands/tools/tovideo.js
 * Convert Animated Sticker to Video - vs Bot
 */

import { downloadMediaMessage } from '@whiskeysockets/baileys'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

const execAsync = promisify(exec)

export default {
  name: 'tovideo',
  alias: ['tovid', 'tomp4', 'togif'],
  desc: 'Convert animated sticker to video',
  usage: 'reply sticker',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const sticker = quoted?.stickerMessage

    if (!sticker) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Reply an animated sticker\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    const tempDir = './temp'
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })

    const rand = crypto.randomBytes(6).toString('hex')
    const inputPath = path.join(tempDir, `in_${rand}.webp`)
    const outputPath = path.join(tempDir, `out_${rand}.mp4`)

    try {
      const buffer = await downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { logger: console, reuploadRequest: sock.updateMediaMessage }
      )

      fs.writeFileSync(inputPath, buffer)

      // Convert webp to mp4
      await execAsync(`ffmpeg -i "${inputPath}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p -movflags +faststart "${outputPath}"`)

      if (!fs.existsSync(outputPath)) throw new Error('CONVERSION_FAILED')

      const videoBuffer = fs.readFileSync(outputPath)

      await sock.sendMessage(from, {
        video: videoBuffer,
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ Sticker → Video ✅\n╚━━━━━━━━━━━━━━━━━═❒`,
        gifPlayback: false
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })
    } catch {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Conversion failed\n║ Not animated?\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    } finally {
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
      } catch {}
    }
  }
}