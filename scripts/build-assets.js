import fs from 'fs'
import axios from 'axios'
import ffmpeg from 'fluent-ffmpeg'
import path from 'path'
import os from 'os'

const ASSETS_DIR = 'plugins/commands/economy/assets'
const ASSETS_JS = 'plugins/commands/economy/assets.js'
const assets = JSON.parse(fs.readFileSync('assets.json', 'utf8'))

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true })

const download = async (url, filepath, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, { 
        responseType: 'arraybuffer', 
        timeout: 30000,
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.pexels.com/'
        }
      })
      fs.writeFileSync(filepath, res.data)
      console.log(`✅ Downloaded: ${path.basename(filepath)}`)
      return
    } catch (e) {
      console.error(`❌ Attempt ${i + 1} failed: ${url} - ${e.message}`)
      if (i === retries - 1) throw e
      await new Promise(r => setTimeout(r, 2000))
    }
  }
}

const extractFrameFromUrl = (videoUrl, outputPath) => {
  return new Promise((resolve, reject) => {
    const tempVideo = path.join(os.tmpdir(), `temp_${Date.now()}.mp4`)
    
    axios.get(videoUrl, { 
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    }).then(res => {
      const writer = fs.createWriteStream(tempVideo)
      res.data.pipe(writer)
      writer.on('finish', () => {
        ffmpeg(tempVideo)
         .screenshots({ 
           count: 1, 
           timemarks: ['0'], 
           filename: path.basename(outputPath), 
           folder: path.dirname(outputPath) 
         })
         .on('end', () => {
           fs.unlinkSync(tempVideo) // delete temp video
           resolve()
         })
         .on('error', reject)
      })
      writer.on('error', reject)
    }).catch(reject)
  })
}

const main = async () => {
  console.log('🚀 Building assets...')
  
  for (const bg of assets.backgrounds) {
    const basePath = path.join(ASSETS_DIR, bg.id)
    
    // 1. Download static PNG for Sharp
    try {
      await download(bg.url, `${basePath}.png`)
    } catch (e) {
      console.error(`❌ Skipping ${bg.id} - static download failed`)
      continue
    }
    
    // 2. If animated, extract frame only - DON'T SAVE VIDEO
    if (bg.type === 'animated' && bg.videoUrl) {
      try {
        await extractFrameFromUrl(bg.videoUrl, `${basePath}_frame.png`)
        console.log(`✅ Frame extracted: ${bg.id}_frame.png`)
      } catch (e) {
        console.error(`❌ Frame extract failed for ${bg.id}: ${e.message}`)
      }
    }
  }
  
  // Download overlays
  for (const [key, url] of Object.entries(assets.overlays || {})) {
    try {
      await download(url, path.join(ASSETS_DIR, `${key}.png`))
    } catch (e) {
      console.error(`❌ Overlay ${key} failed: ${e.message}`)
    }
  }
  
  // Auto-generate assets.js - store videoUrl for streaming later
  const assetsExport = {}
  assets.backgrounds.forEach(bg => {
    assetsExport[bg.id] = {
      id: bg.id,
      name: bg.name,
      type: bg.type,
      price: bg.price,
      glow: bg.glow,
      tier: bg.tier,
      videoUrl: bg.videoUrl || null // Keep URL for streaming
    }
  })
  
  assetsExport.overlays = Object.keys(assets.overlays || {})
  
  fs.writeFileSync(ASSETS_JS, `// AUTO-GENERATED - DO NOT EDIT\n// Run GitHub Action to rebuild\n\nexport default ${JSON.stringify(assetsExport, null, 2)}`)
  
  console.log('🎉 All assets built! Commit ready.')
}

main().catch(e => {
  console.error('💥 Build failed:', e)
  process.exit(1)
})