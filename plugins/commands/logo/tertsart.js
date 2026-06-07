/**
 * SwiftBot - plugins/commands/logo/textart.js
 * Text Art Generator — 20 styles, each as direct alias
 * 3D, chrome, vintage, grunge, pop-art, sticker, badge, etc.
 * 15+ real API fallbacks — no SVG, no local generation
 */

// ─────────────────────────────────────────────
// 20 TEXT ART STYLES — All different from logomenu
// ─────────────────────────────────────────────
const STYLES = {
  '3d': {
    label: '3D Block',
    emoji: '🧱',
    desc:  'Bold 3D extruded block letters',
    color: 'ff6600', bg: '1a1a2e',
    font: 'Bebas Neue', effect: '3d-block',
    twoNames: false
  },
  chrome: {
    label: 'Chrome',
    emoji: '🪞',
    desc:  'Shiny metallic chrome reflection',
    color: 'e8e8e8', bg: '0d0d0d',
    font: 'Impact', effect: 'chrome',
    twoNames: false
  },
  vintage: {
    label: 'Vintage',
    emoji: '📜',
    desc:  'Old worn retro distressed text',
    color: 'd4a853', bg: '2c1810',
    font: 'Playfair Display', effect: 'vintage',
    twoNames: false
  },
  sticker: {
    label: 'Sticker',
    emoji: '🏷️',
    desc:  'Bold outlined sticker style',
    color: 'ffffff', bg: 'ff2d55',
    font: 'Fredoka One', effect: 'sticker',
    twoNames: false
  },
  badge: {
    label: 'Badge',
    emoji: '🎖️',
    desc:  'Official shield badge stamp',
    color: 'ffd700', bg: '003087',
    font: 'Oswald', effect: 'badge',
    twoNames: false
  },
  popart: {
    label: 'Pop Art',
    emoji: '🎭',
    desc:  'Bold Warhol comic pop art style',
    color: 'ff0066', bg: 'ffff00',
    font: 'Bangers', effect: 'pop-art',
    twoNames: false
  },
  grunge: {
    label: 'Grunge',
    emoji: '🎸',
    desc:  'Torn dirty rock grunge style',
    color: 'c0392b', bg: '1c1c1c',
    font: 'Special Elite', effect: 'grunge',
    twoNames: false
  },
  bubble: {
    label: 'Bubble',
    emoji: '🫧',
    desc:  'Puffy rounded bubble letters',
    color: 'ff9ff3', bg: '1e1e2e',
    font: 'Nunito', effect: 'bubble',
    twoNames: false
  },
  thunder: {
    label: 'Thunder',
    emoji: '⚡',
    desc:  'Electric lightning bold impact',
    color: 'facc15', bg: '1e0a00',
    font: 'Anton', effect: 'thunder',
    twoNames: false
  },
  sketch: {
    label: 'Sketch',
    emoji: '✏️',
    desc:  'Hand drawn pencil sketch style',
    color: '374151', bg: 'f9fafb',
    font: 'Caveat', effect: 'sketch',
    twoNames: false
  },
  rusty: {
    label: 'Rusty',
    emoji: '🔩',
    desc:  'Old corroded metal rust style',
    color: 'b7410e', bg: '1a0a00',
    font: 'Oswald', effect: 'rust',
    twoNames: false
  },
  gamer: {
    label: 'Gamer',
    emoji: '🎮',
    desc:  'RGB gaming clan tag style',
    color: '00ff88', bg: '0d0d1a',
    font: 'Orbitron', effect: 'gamer',
    twoNames: false
  },
  floral: {
    label: 'Floral',
    emoji: '🌸',
    desc:  'Decorative flower ornament style',
    color: 'f472b6', bg: 'fdf2f8',
    font: 'Great Vibes', effect: 'floral',
    twoNames: false
  },
  blood: {
    label: 'Blood',
    emoji: '🩸',
    desc:  'Dripping blood horror text',
    color: 'cc0000', bg: '0d0000',
    font: 'Creepster', effect: 'blood',
    twoNames: false
  },
  matrix2: {
    label: 'Matrix II',
    emoji: '🟢',
    desc:  'Falling code rain deeper style',
    color: '00ff41', bg: '001100',
    font: 'Share Tech Mono', effect: 'matrix',
    twoNames: false
  },
  hologram: {
    label: 'Hologram',
    emoji: '🔮',
    desc:  'Sci-fi holographic scan lines',
    color: '67e8f9', bg: '000820',
    font: 'Exo', effect: 'hologram',
    twoNames: false
  },
  lava: {
    label: 'Lava',
    emoji: '🌋',
    desc:  'Molten lava cracked earth style',
    color: 'ff4500', bg: '1a0500',
    font: 'Righteous', effect: 'lava',
    twoNames: false
  },
  crypto: {
    label: 'Crypto',
    emoji: '₿',
    desc:  'Blockchain tech digital style',
    color: 'f7931a', bg: '0a0a0a',
    font: 'Rajdhani', effect: 'cyber',
    twoNames: false
  },
  comic: {
    label: 'Comic',
    emoji: '💥',
    desc:  'POW comic book explosion style',
    color: 'ffd700', bg: '1a1a1a',
    font: 'Bangers', effect: 'comic',
    twoNames: false
  },
  marble: {
    label: 'Marble',
    emoji: '🏛️',
    desc:  'Luxury white marble stone style',
    color: 'e2e8f0', bg: '1e293b',
    font: 'Cinzel', effect: 'marble',
    twoNames: false
  }
}

// ─────────────────────────────────────────────
// 16 REAL API FALLBACKS — No SVG, No local
// ─────────────────────────────────────────────
const TEXT_ART_APIS = [
  {
    name: 'textpro-effects',
    fetch: async (text, style) => {
      const effectMap = {
        '3d-block': '3d-text-effect', chrome: 'chrome-text-effect',
        vintage:    'vintage-text-effect', sticker: 'sticker-text-effect',
        badge:      'badge-text-effect', 'pop-art': 'pop-art-text',
        grunge:     'grunge-text-effect', bubble: 'bubble-text-effect',
        thunder:    'lightning-text-effect', sketch: 'pencil-sketch-text',
        rust:       'rusty-metal-text', gamer: 'gaming-text-effect',
        floral:     'floral-text-effect', blood: 'blood-dripping-text',
        matrix:     'matrix-text-effect', hologram: 'hologram-text-effect',
        lava:       'lava-text-effect', cyber: 'cyber-text-effect',
        comic:      'comic-text-effect', marble: 'marble-text-effect'
      }
      const effect = effectMap[style.effect] || '3d-text-effect'
      const r = await fetch('https://textpro.me/api/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, effect, font: style.font }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.output || d?.image || d?.url
      if (!url) return null
      return url.startsWith('http') ? url : `https://textpro.me${url}`
    }
  },
  {
    name: 'flamingtext',
    fetch: async (text, style) => {
      const designMap = {
        '3d-block': '3d', chrome: 'chrome', vintage: 'aged',
        sticker:    'outlined', badge: 'badge', 'pop-art': 'warhol',
        grunge:     'grunge', bubble: 'bubble', thunder: 'electric',
        sketch:     'sketch', rust: 'rusty', gamer: 'gamer',
        floral:     'flower', blood: 'bloody', matrix: 'matrix',
        hologram:   'hologram', lava: 'lava', cyber: 'cyber',
        comic:      'comic', marble: 'stone'
      }
      const design = designMap[style.effect] || '3d'
      const r = await fetch('https://flamingtext.com/net-fu/proxy_form.cgi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          script:    design,
          text:      text,
          doScale:   'true',
          scaleWidth: 500
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.imageUrl || d?.url
      if (!url) return null
      return url.startsWith('http') ? url : `https://flamingtext.com${url}`
    }
  },
  {
    name: 'cooltext-api',
    fetch: async (text, style) => {
      const styleMap = {
        '3d-block': 58, chrome: 55, vintage: 22, sticker: 45,
        badge:      36, 'pop-art': 48, grunge: 37, bubble: 40,
        thunder:    6,  sketch: 51, rust: 37, gamer: 25,
        floral:     33, blood: 16, matrix: 4, hologram: 7,
        lava:       6,  cyber: 25, comic: 48, marble: 55
      }
      const logoId = styleMap[style.effect] || 58
      const r = await fetch('https://cooltext.com/PostChange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          LogoID:               logoId,
          Text:                 text,
          FontSize:             70,
          Color1_color:         style.color,
          BackgroundColor_color: style.bg,
          Integer1:             0,
          Boolean1:             'false',
          fileformat:           1,
          ok:                   'Get+Logo'
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.renderLocation
      if (!url) return null
      return url
    }
  },
  {
    name: 'textgiraffe',
    fetch: async (text, style) => {
      const effectMap = {
        '3d-block': '3d-block', chrome: 'metallic', vintage: 'retro',
        sticker:    'sticker', badge: 'emblem', 'pop-art': 'pop',
        grunge:     'grunge', bubble: 'bubble', thunder: 'electric',
        sketch:     'sketch', rust: 'rust', gamer: 'gaming',
        floral:     'floral', blood: 'drip', matrix: 'code',
        hologram:   'hologram', lava: 'lava', cyber: 'cyber',
        comic:      'comic', marble: 'stone'
      }
      const fx = effectMap[style.effect] || '3d-block'
      const r = await fetch(
        `https://www.textgiraffe.com/logos/${encodeURIComponent(text)}/?design=${fx}&color=${style.color}&bg=${style.bg}`,
        { signal: AbortSignal.timeout(15000) }
      )
      const html = await r.text()
      const match = html.match(/src="(https:\/\/[^"]+\.(png|jpg|gif|webp)[^"]*)"/i)
      if (!match) return null
      return match[1]
    }
  },
  {
    name: 'fontmeme',
    fetch: async (text, style) => {
      const fontMap = {
        '3d-block': '3d', chrome: 'chrome', vintage: 'vintage',
        sticker:    'cartoon', badge: 'military', 'pop-art': 'pop-art',
        grunge:     'grunge', bubble: 'bubble', thunder: 'thunder',
        sketch:     'handwriting', rust: 'metal', gamer: 'gamer',
        floral:     'floral', blood: 'horror', matrix: 'matrix',
        hologram:   'futuristic', lava: 'fire', cyber: 'cyber',
        comic:      'comic', marble: 'stone'
      }
      const f = fontMap[style.effect] || '3d'
      const r = await fetch(
        `https://fontmeme.com/permalink/${f}/?text=${encodeURIComponent(text)}&color=${style.color}&size=80`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!r.ok) return null
      const buf = await r.arrayBuffer()
      if (buf.byteLength < 2000) return null
      return { buffer: Buffer.from(buf) }
    }
  },
  {
    name: 'glyphter',
    fetch: async (text, style) => {
      const r = await fetch(`https://glyphter.com/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          effect:     style.effect,
          foreground: `#${style.color}`,
          background: `#${style.bg}`,
          font:       style.font,
          size:       500
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.url || d?.image
      if (!url) return null
      return url
    }
  },
  {
    name: 'patorjk-figlet',
    fetch: async (text, style) => {
      // Patorjk returns ASCII art — we render it as image via another service
      const fontMap = {
        '3d-block': 'Blocks', chrome: 'Shimrod', vintage: 'Old Banner',
        sticker:    'Banner3', badge: 'Banner4', 'pop-art': 'Puffy',
        grunge:     'Graffiti', bubble: 'Bubble', thunder: 'Colossal',
        sketch:     'Sketch', rust: 'Rusted', gamer: 'Cybermedium',
        floral:     'Flower Power', blood: 'Blood', matrix: 'Matrix',
        hologram:   'Cyberlarge', lava: 'Fire Font-s', cyber: 'Cybersmall',
        comic:      'Banner3-D', marble: 'Big'
      }
      const font = fontMap[style.effect] || 'Blocks'
      const r = await fetch(
        `https://patorjk.com/software/taag/process.php?text=${encodeURIComponent(text)}&font=${encodeURIComponent(font)}&halign=c&valign=m`,
        { signal: AbortSignal.timeout(10000) }
      )
      const ascii = await r.text()
      if (!ascii || ascii.length < 10) return null

      // Render ASCII to image via carbon-now-sh style API
      const imgR = await fetch('https://carbonara.solopython.com/api/cook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code:      ascii,
          theme:     style.bg === '000000' ? 'night-owl' : 'seti',
          fontFamily: 'Source Code Pro',
          fontSize:   '16px',
          language:   'plaintext'
        }),
        signal: AbortSignal.timeout(18000)
      })
      if (!imgR.ok) return null
      const buf = await imgR.arrayBuffer()
      if (buf.byteLength < 2000) return null
      return { buffer: Buffer.from(buf) }
    }
  },
  {
    name: 'canva-text-api',
    fetch: async (text, style) => {
      const r = await fetch('https://api.canva.com/rest/v1/designs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design_type: { name: 'SocialMediaPost' },
          title:       text,
          style_preset: style.effect
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.design?.urls?.view_url || d?.url
      if (!url) return null
      return url
    }
  },
  {
    name: 'text-image-io',
    fetch: async (text, style) => {
      const r = await fetch(
        `https://texttoimage.io/api/v1?text=${encodeURIComponent(text)}&font=${encodeURIComponent(style.font)}&color=${style.color}&bg=${style.bg}&effect=${style.effect}&size=80&width=600`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!r.ok) return null
      const d = await r.json()
      const url = d?.url || d?.image
      if (!url) return null
      return url
    }
  },
  {
    name: 'renderforest-text',
    fetch: async (text, style) => {
      const r = await fetch('https://www.renderforest.com/api/v1/text-animation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          style:   style.effect,
          color:   `#${style.color}`,
          bgcolor: `#${style.bg}`
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.thumbnail || d?.preview_url || d?.url
      if (!url) return null
      return url
    }
  },
  {
    name: 'logomaster',
    fetch: async (text, style) => {
      const r = await fetch('https://logomaster.ai/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:   text,
          style:  style.effect,
          color:  `#${style.color}`,
          bgColor: `#${style.bg}`,
          font:   style.font
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.logo_url || d?.image || d?.url
      if (!url) return null
      return url
    }
  },
  {
    name: 'text2art-online',
    fetch: async (text, style) => {
      const r = await fetch(`https://text2art.com/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          style:       style.effect,
          primaryColor: style.color,
          bgColor:     style.bg,
          fontName:    style.font
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.imageUrl || d?.result || d?.url
      if (!url) return null
      return url
    }
  },
  {
    name: 'photofunia-text',
    fetch: async (text, style) => {
      // PhotoFunia text effects
      const effectList = [
        'theatre', 'neon-sign', 'letter-press', 'chalk-board',
        'wood-board', 'wall-graffiti', 'stamp', 'stargate'
      ]
      const idx = Object.keys(STYLES).indexOf(
        Object.keys(STYLES).find(k => STYLES[k].effect === style.effect) || '3d'
      ) % effectList.length
      const effect = effectList[idx]

      const r = await fetch(`https://photofunia.com/api/v1/effects/${effect}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ text1: text }),
        signal: AbortSignal.timeout(18000)
      })
      const d = await r.json()
      const url = d?.image?.output?.url?.lg || d?.image?.output?.url?.md
      if (!url) return null
      return url
    }
  },
  {
    name: 'imagechef-text',
    fetch: async (text, style) => {
      const r = await fetch(`https://www.imagechef.com/ic/make.jsp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          text,
          fid:    style.effect,
          fcolor: style.color,
          bcolor: style.bg
        }),
        signal: AbortSignal.timeout(15000)
      })
      const html = await r.text()
      const match = html.match(/img src="([^"]+\.(png|jpg))"/)
      if (!match) return null
      const url = match[1]
      return url.startsWith('http') ? url : `https://www.imagechef.com${url}`
    }
  },
  {
    name: 'fotor-text',
    fetch: async (text, style) => {
      const r = await fetch('https://www.fotor.com/api/text-effect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          effect:    style.effect,
          color:     `#${style.color}`,
          bgColor:   `#${style.bg}`,
          fontFamily: style.font,
          fontSize:   80
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.result?.url || d?.output || d?.image
      if (!url) return null
      return url
    }
  },
  {
    name: 'designevo-text',
    fetch: async (text, style) => {
      const r = await fetch('https://www.designevo.com/api/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          font:       style.font,
          effect:     style.effect,
          color:      `#${style.color}`,
          background: `#${style.bg}`
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.logoUrl || d?.imageUrl || d?.url
      if (!url) return null
      return url
    }
  }
]

// ─────────────────────────────────────────────
// NEVER-FAIL ENGINE
// ─────────────────────────────────────────────
async function generateTextArt(text, style) {
  for (const api of TEXT_ART_APIS) {
    try {
      const result = await api.fetch(text, style)
      if (!result) continue
      if (typeof result === 'string' && result.startsWith('http')) {
        return { type: 'url', value: result, api: api.name }
      }
      if (result?.buffer instanceof Buffer) {
        return { type: 'buffer', value: result.buffer, api: api.name }
      }
    } catch {
      // Silent — try next
    }
  }
  return null
}

// ─────────────────────────────────────────────
// SEND HELPER
// ─────────────────────────────────────────────
async function sendArt(sock, from, m, result, caption) {
  if (result.type === 'url') {
    await sock.sendMessage(from, { image: { url: result.value }, caption }, { quoted: m })
  } else {
    await sock.sendMessage(from, { image: result.value, caption }, { quoted: m })
  }
}

// ─────────────────────────────────────────────
// MENU BUILDER
// ─────────────────────────────────────────────
function buildMenu(prefix) {
  const lines = Object.entries(STYLES).map(([key, s]) =>
    `║  ${s.emoji} *${s.label}*\n║    ${prefix}${key} <name>\n║    _${s.desc}_`
  )
  return (
    `╔═━━━━━━━━━━━━━━━━═❒\n` +
    `║  🖼️  TEXT ART GENERATOR\n` +
    `║  20 Styles — Real APIs Only\n` +
    `╠═━━━━━━━━━━━━━━━━═❒\n` +
    lines.join('\n║\n') + '\n' +
    `╠═━━━━━━━━━━━━━━━━═❒\n` +
    `║  📌 Usage: ${prefix}3d SwiftBot\n` +
    `║  📌 Or:    ${prefix}textart chrome MyName\n` +
    `╚━━━━━━━━━━━━━━━━━═❒`
  )
}

// ─────────────────────────────────────────────
// COMMAND EXPORT
// ─────────────────────────────────────────────
export default {
  name: 'textart',
  alias: [
    'tart',
    ...Object.keys(STYLES)   // 3d, chrome, vintage, sticker, badge ...
  ],
  desc: 'Text Art generator — 20 styles, real APIs, no SVG',
  usage: '<name>  OR  <style> <name>',
  category: 'logo',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox, logger }) => {
    const from   = m.key.remoteJid
    const prefix = await db.get('prefix') || '#'

    // ─── DETECT USED ALIAS ───────────────────
    const body    = m.message?.conversation
                 || m.message?.extendedTextMessage?.text
                 || ''
    const usedCmd = body.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase()
    const isRoot  = usedCmd === 'textart' || usedCmd === 'tart'

    // ─── SHOW MENU ───────────────────────────
    if (isRoot && args.length === 0) {
      return await sock.sendMessage(from, { text: buildMenu(prefix) }, { quoted: m })
    }

    // ─── RESOLVE STYLE + NAME ────────────────
    let styleKey = null
    let nameInput = ''

    // Way 1: alias is the style  (#chrome MyName)
    if (STYLES[usedCmd]) {
      styleKey  = usedCmd
      nameInput = args.join(' ').trim()
    }
    // Way 2: #textart <style> <name>
    else if (isRoot && STYLES[args[0]?.toLowerCase()]) {
      styleKey  = args[0].toLowerCase()
      nameInput = args.slice(1).join(' ').trim()
    }
    // Way 3: #textart <name> — pick random style
    else if (isRoot && args.length > 0) {
      const keys = Object.keys(STYLES)
      styleKey   = keys[Math.floor(Math.random() * keys.length)]
      nameInput  = args.join(' ').trim()
    }

    if (!styleKey || !nameInput) {
      return await sock.sendMessage(from, { text: buildMenu(prefix) }, { quoted: m })
    }

    const style = STYLES[styleKey]

    // ─── REACT + LOADING ─────────────────────
    await sock.sendMessage(from, { react: { text: '🎨', key: m.key } })
    await sock.sendMessage(from, {
      text: nobox
        ? `🖼️ Creating *${style.label}* art for: _${nameInput}_...`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║  🖼️ Creating Text Art...\n║  ${style.emoji} Style: ${style.label}\n║  ✏️  Text: ${nameInput}\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    // ─── GENERATE ────────────────────────────
    const result = await generateTextArt(nameInput, style)

    if (!result) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: nobox
          ? '❌ All 16 APIs failed. Try again later.'
          : await box.error('All 16 APIs failed. Try again later.')
      }, { quoted: m })
    }

    // ─── CAPTION ─────────────────────────────
    const caption =
      `╔═━━━━━━━━━━━━━━━━═❒\n` +
      `║  ${style.emoji}  ${style.label.toUpperCase()} ART\n` +
      `╠═━━━━━━━━━━━━━━━━═❒\n` +
      `║  ✏️  ${nameInput}\n` +
      `║  🎨 ${style.desc}\n` +
      `╚━━━━━━━━━━━━━━━━━═❒`

    try {
      await sendArt(sock, from, m, result, caption)
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

      // Suggest 3 other styles
      const others = Object.keys(STYLES).filter(k => k !== styleKey).slice(0, 3)
      await sock.sendMessage(from, {
        text: `💡 Try: ${others.map(k => `${prefix}${k} ${nameInput}`).join('  |  ')}`
      })

    } catch (sendErr) {
      logger.error?.('TEXTART', 'Send failed', sendErr.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Art created but send failed: ${sendErr.message}`
          : await box.error(`Send failed: ${sendErr.message}`)
      }, { quoted: m })
    }
  }
}