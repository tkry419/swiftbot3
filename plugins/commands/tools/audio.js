/**
 * SwiftBot - plugins/commands/audio/audio.js
 * Audio Effects - 25+ Filters with Triple Fallback
 * Owner/Public - Requires ffmpeg
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

const execAsync = promisify(exec)

// 25+ AUDIO EFFECTS - ALL TESTED WORKING
const AUDIO_EFFECTS = {
  // SPEED & PITCH
  blown: { filter: 'acrusher=.1:1:64:0:log', desc: 'Distorted crushed' },
  earrape: { filter: 'acrusher=level_in=8:level_out=18:bits=8:mode=log:aa=1', desc: 'Loud distorted' },
  slow: { filter: 'atempo=0.8', desc: '0.8x speed' },
  fast: { filter: 'atempo=1.5', desc: '1.5x speed' },
  nightcore: { filter: 'asetrate=48000*1.25,aresample=48000,atempo=1.1', desc: 'High pitch + fast' },
  deep: { filter: 'asetrate=48000*0.8,aresample=48000', desc: 'Low pitch' },
  squirrel: { filter: 'asetrate=48000*1.5,aresample=48000', desc: 'Chipmunk voice' },
  smooth: { filter: 'atempo=0.9,asetrate=44100*1.1', desc: 'Smooth slow' },

  // VOICE EFFECTS
  robot: { filter: 'afftfilt=real=\'hypot(re,im)*sin(0)\':imag=\'hypot(re,im)*cos(0)\':win_size=512:overlap=0.75', desc: 'Robotic voice' },
  demon: { filter: 'asetrate=48000*0.6,aresample=48000,atempo=1.1', desc: 'Demon voice' },
  child: { filter: 'asetrate=48000*1.6,aresample=48000', desc: 'Child voice' },
  alien: { filter: 'asetrate=48000*0.7,aresample=48000,atempo=1.3', desc: 'Alien voice' },
  ghost: { filter: 'aecho=0.8:0.9:1000:0.3,asetrate=48000*0.9', desc: 'Ghostly echo' },

  // BASS & TREBLE
  bass: { filter: 'bass=g=15:f=110:w=0.6', desc: 'Heavy bass boost' },
  bassboost: { filter: 'bass=g=20:f=80:w=0.5', desc: 'Extreme bass' },
  treble: { filter: 'treble=g=10:f=3000:w=0.5', desc: 'High treble' },
  subwoofer: { filter: 'bass=g=25:f=60:w=0.4,lowpass=f=150', desc: 'Subwoofer effect' },

  // ECHO & REVERB
  echo: { filter: 'aecho=0.8:0.88:60:0.4', desc: 'Echo effect' },
  reverb: { filter: 'aecho=0.8:0.9:1000:0.3', desc: 'Reverb effect' },
  cave: { filter: 'aecho=0.8:0.9:1000:0.5,aecho=0.8:0.9:1500:0.3', desc: 'Cave echo' },

  // SPECIAL
  reverse: { filter: 'areverse', desc: 'Play backwards' },
  vibrato: { filter: 'vibrato=f=5:d=0.5', desc: 'Vibrato effect' },
  tremolo: { filter: 'tremolo=f=5:d=0.8', desc: 'Tremolo effect' },
  phaser: { filter: 'aphaser=type=t:speed=2:decay=0.6', desc: 'Phaser effect' },
  flanger: { filter: 'flanger=speed=2', desc: 'Flanger effect' },

  // QUALITY
  lofi: { filter: 'lowpass=f=3000,atempo=0.9', desc: 'Lo-fi effect' },
  radio: { filter: 'highpass=f=200,lowpass=f=3000,acrusher=level_in=1:level_out=1:bits=8', desc: 'Radio effect' },
  telephone: { filter: 'highpass=f=300,lowpass=f=3400', desc: 'Phone call' },
  underwater: { filter: 'lowpass=f=300,afftfilt=real=\'hypot(re,im)*sin(0)\'', desc: 'Underwater' }
}

// TRIPLE FALLBACK METHODS
async function processAudio(inputPath, outputPath, filter, logger) {
  // METHOD 1: Standard ffmpeg
  try {
    await execAsync(`ffmpeg -i "${inputPath}" -af "${filter}" -b:a 192k -y "${outputPath}"`, {
      timeout: 90000
    })
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) return true
  } catch (e) {
    logger?.warn('AUDIO', `Method 1 failed: ${e.message}`)
  }

  // METHOD 2: Force re-encode with libmp3lame
  try {
    await execAsync(`ffmpeg -i "${inputPath}" -af "${filter}" -c:a libmp3lame -q:a 2 -y "${outputPath}"`, {
      timeout: 90000
    })
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) return true
  } catch (e) {
    logger?.warn('AUDIO', `Method 2 failed: ${e.message}`)
  }

  // METHOD 3: Last resort - convert to wav first then mp3
  try {
    const wavPath = outputPath.replace('.mp3', '.wav')
    await execAsync(`ffmpeg -i "${inputPath}" -af "${filter}" -y "${wavPath}"`, { timeout: 90000 })
    await execAsync(`ffmpeg -i "${wavPath}" -c:a libmp3lame -q:a 2 -y "${outputPath}"`, { timeout: 60000 })
    if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath)
    if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) return true
  } catch (e) {
    logger?.error('AUDIO', `All methods failed: ${e.message}`)
  }

  return false
}

export default {
  name: 'audio',
  alias: Object.keys(AUDIO_EFFECTS),
  desc: 'Apply audio effects - 25+ filters',
  usage: 'reply audio + [effect]',
  category: 'Tools',
  permission: 'public',

  execute: async (sock, m, args, { prefix, command, logger }) => {
    const from = m.key.remoteJid
    const effect = command.toLowerCase()
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage

    // LIST EFFECTS
    if (!quoted || (!quoted.audioMessage &&!quoted.videoMessage)) {
      const effectsList = Object.entries(AUDIO_EFFECTS)
       .map(([name, data]) => `║ 𖠁 ${prefix}${name} - ${data.desc}`)
       .join('\n')

      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *ᴀᴜᴅɪᴏ ᴍᴇɴᴜ* ⌬
╠═══════════════════
${effectsList}
╠═══════════════════
║ 📝 USAGE:
║ Reply audio/video with:
║ ${prefix}bass
║ ${prefix}nightcore
║ ${prefix}demon
║ ${prefix}reverse
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // Check if effect exists
    const effectData = AUDIO_EFFECTS[effect]
    if (!effectData) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Invalid effect\n║ Use: ${prefix}audio\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    // SEND LOADING
    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    const tmpDir = './tmp'
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })

    const timestamp = Date.now()
    const inputPath = path.join(tmpDir, `input_${timestamp}.mp3`)
    const outputPath = path.join(tmpDir, `output_${timestamp}.mp3`)

    try {
      // Download audio/video
      const buffer = await downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { logger }
      )

      fs.writeFileSync(inputPath, buffer)

      // Check file size - max 50MB
      const stats = fs.statSync(inputPath)
      if (stats.size > 50 * 1024 * 1024) {
        throw new Error('File too large - max 50MB')
      }

      // Process with triple fallback
      const success = await processAudio(inputPath, outputPath, effectData.filter, logger)

      if (!success ||!fs.existsSync(outputPath)) {
        throw new Error('All processing methods failed')
      }

      // Send result
      const audioBuffer = fs.readFileSync(outputPath)
      await sock.sendMessage(from, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        ptt: false,
        caption: `🎵 Effect: ${effect.toUpperCase()}\n📝 ${effectData.desc}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (e) {
      logger.error('AUDIO', 'Command failed', e.message)
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ ❌ Failed to process\n║ ${e.message}\n║ Make sure ffmpeg is installed\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    } finally {
      // Cleanup
      try {
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
      } catch {}
    }
  }
}