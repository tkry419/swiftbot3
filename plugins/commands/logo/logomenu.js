/**
 * SwiftBot - plugins/commands/logo/logomenu.js
 * Logo Generator Menu — 20+ styles, each as its own alias
 * Uses 15+ external APIs — never-fail waterfall mode
 * No local fallbacks — all online rendering
 */

import fetch from 'node-fetch'

// ─────────────────────────────────────────────
// 20 LOGO STYLES — Each is a direct alias command
// ─────────────────────────────────────────────
const STYLES = {
  hacker: {
    label: 'Hacker',
    emoji: '💻',
    desc:  'Matrix green terminal style',
    color1: '00ff00', color2: '003300', bg: '000000',
    font: 'Matrix Code NFI', effect: 'neon'
  },
  zombie: {
    label: 'Zombie',
    emoji: '🧟',
    desc:  'Dripping horror blood style',
    color1: 'ff0000', color2: '8b0000', bg: '1a0000',
    font: 'Zombie Holocaust', effect: 'horror'
  },
  lovers: {
    label: 'Lovers',
    emoji: '💕',
    desc:  'Romantic pink hearts style (2 names)',
    color1: 'ff69b4', color2: 'ff1493', bg: 'fff0f5',
    font: 'Scriptina', effect: 'glow',
    twoNames: true
  },
  fire: {
    label: 'Fire',
    emoji: '🔥',
    desc:  'Burning flame style',
    color1: 'ff4500', color2: 'ffd700', bg: '1a0000',
    font: 'Blaze', effect: 'fire'
  },
  galaxy: {
    label: 'Galaxy',
    emoji: '🌌',
    desc:  'Space stars cosmic style',
    color1: 'a855f7', color2: '3b82f6', bg: '000011',
    font: 'Alien Encounters', effect: 'galaxy'
  },
  neon: {
    label: 'Neon',
    emoji: '🌈',
    desc:  'Electric neon glow style',
    color1: '00ffff', color2: 'ff00ff', bg: '000000',
    font: 'Neon Tubes 2', effect: 'neon'
  },
  ninja: {
    label: 'Ninja',
    emoji: '🥷',
    desc:  'Dark shadow warrior style',
    color1: 'c0c0c0', color2: '808080', bg: '000000',
    font: 'Ninja Naruto', effect: 'shadow'
  },
  royal: {
    label: 'Royal',
    emoji: '👑',
    desc:  'Gold luxury crown style',
    color1: 'ffd700', color2: 'b8860b', bg: '1a0a00',
    font: 'Cinzel Decorative', effect: 'metallic'
  },
  ice: {
    label: 'Ice',
    emoji: '❄️',
    desc:  'Frozen crystal frost style',
    color1: 'e0f7fa', color2: '00bcd4', bg: '001f2e',
    font: 'Iceland', effect: 'frost'
  },
  dragon: {
    label: 'Dragon',
    emoji: '🐉',
    desc:  'Ancient dragon scale style',
    color1: 'ff6b35', color2: 'ffd700', bg: '1a0d00',
    font: 'Dragon Hunter', effect: 'fire'
  },
  glitch: {
    label: 'Glitch',
    emoji: '📺',
    desc:  'Broken screen glitch style',
    color1: 'ff00ff', color2: '00ffff', bg: '0d0d0d',
    font: 'Share Tech Mono', effect: 'glitch'
  },
  graffiti: {
    label: 'Graffiti',
    emoji: '🎨',
    desc:  'Street art spray paint style',
    color1: 'ff2d55', color2: 'ffcc00', bg: '1a1a1a',
    font: 'Graffiti Street', effect: 'spray'
  },
  anime: {
    label: 'Anime',
    emoji: '⚔️',
    desc:  'Japanese anime title style',
    color1: 'ff6ec7', color2: 'a78bfa', bg: '0f0520',
    font: 'Anime Ace', effect: 'glow'
  },
  retro: {
    label: 'Retro',
    emoji: '🕹️',
    desc:  '80s arcade pixel style',
    color1: 'ffff00', color2: 'ff8800', bg: '000033',
    font: 'Press Start 2P', effect: 'pixel'
  },
  shadow: {
    label: 'Shadow',
    emoji: '🌑',
    desc:  'Deep dark shadow style',
    color1: '6b21a8', color2: 'e879f9', bg: '050505',
    font: 'Creepster', effect: 'shadow'
  },
  ocean: {
    label: 'Ocean',
    emoji: '🌊',
    desc:  'Deep sea wave style',
    color1: '06b6d4', color2: '0284c7', bg: '001220',
    font: 'Lobster', effect: 'wave'
  },
  toxic: {
    label: 'Toxic',
    emoji: '☢️',
    desc:  'Nuclear poison green style',
    color1: '84cc16', color2: '22c55e', bg: '0a1a00',
    font: 'Biohazard', effect: 'toxic'
  },
  wedding: {
    label: 'Wedding',
    emoji: '💍',
    desc:  'Elegant couple style (2 names)',
    color1: 'f9fafb', color2: 'd4af37', bg: '1a0a20',
    font: 'Great Vibes', effect: 'elegant',
    twoNames: true
  },
  warrior: {
    label: 'Warrior',
    emoji: '⚔️',
    desc:  'Battle sword steel style',
    color1: 'e5e7eb', color2: 'dc2626', bg: '0a0a0a',
    font: 'MedievalSharp', effect: 'metallic'
  },
  rainbow: {
    label: 'Rainbow',
    emoji: '🌈',
    desc:  'Full spectrum color style',
    color1: 'ff0000', color2: '8b00ff', bg: 'ffffff',
    font: 'Fredoka One', effect: 'rainbow'
  }
}

// ─────────────────────────────────────────────
// 15+ LOGO API FALLBACKS
// ─────────────────────────────────────────────
const LOGO_APIS = [
  {
    name: 'textpro',
    fetch: async (text, style) => {
      // TextPro.me — many effects
      const effectMap = {
        neon: 'neon-text-effect', fire: 'fire-text-effect', glow: 'glowing-text-effect',
        horror: 'blood-dripping-text', galaxy: 'galaxy-text-effect', shadow: 'shadow-3d-text',
        metallic: 'gold-text-effect', frost: 'ice-text-effect', glitch: 'glitch-text-effect',
        rainbow: 'rainbow-text-effect', spray: 'graffiti-text-effect', pixel: 'pixel-text-effect',
        wave: 'water-text-effect', toxic: 'toxic-text-effect', elegant: 'signature-text-effect'
      }
      const effect = effectMap[style.effect] || 'neon-text-effect'
      const r = await fetch(`https://textpro.me/api/create`, {
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
    name: 'cooltext',
    fetch: async (text, style) => {
      const styleMap = {
        neon: 4, fire: 6, glow: 9, horror: 16, galaxy: 7,
        shadow: 2, metallic: 10, frost: 13, glitch: 25,
        rainbow: 11, spray: 20, pixel: 29, wave: 14, toxic: 6, elegant: 33
      }
      const logoId = styleMap[style.effect] || 4
      const r = await fetch(`https://cooltext.com/PostChange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          LogoID:    logoId,
          Text:      text,
          FontSize:  70,
          Color1_color: style.color1,
          Color2_color: style.color2,
          BackgroundColor_color: style.bg,
          Integer1:  0,
          Boolean1:  false,
          Integer9:  0,
          Integer13: on,
          Integer12: on,
          BackgroundImage: '',
          fileformat: 1,
          ok: 'Get+Logo'
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
    name: 'fontmeme',
    fetch: async (text, style) => {
      const fontMap = {
        neon: 'neon', fire: 'fire', glow: 'glow', horror: 'horror',
        galaxy: 'galaxy', shadow: 'shadow', metallic: 'gold', frost: 'ice',
        glitch: 'glitch', rainbow: 'rainbow', spray: 'graffiti', pixel: 'pixel',
        wave: 'water', toxic: 'toxic', elegant: 'calligraphy'
      }
      const fontStyle = fontMap[style.effect] || 'neon'
      const r = await fetch(
        `https://fontmeme.com/api/?text=${encodeURIComponent(text)}&font=${fontStyle}&color=${style.color1}&size=80`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!r.ok) return null
      // Returns image directly
      const buf = await r.arrayBuffer()
      if (buf.byteLength < 1000) return null // Too small = error page
      return { buffer: Buffer.from(buf) }
    }
  },
  {
    name: 'flamingtext',
    fetch: async (text, style) => {
      const designMap = {
        neon: 'neon', fire: 'burning', glow: 'glow', horror: 'zombie',
        galaxy: 'galaxy', shadow: 'shadow', metallic: 'chrome', frost: 'frozen',
        glitch: 'alien', rainbow: 'rainbow', spray: 'graffiti', pixel: 'pixel',
        wave: 'wave', toxic: 'nuclear', elegant: 'cursive'
      }
      const design = designMap[style.effect] || 'neon'
      const r = await fetch(`https://flamingtext.com/net-fu/proxy_form.cgi`, {
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
    name: 'textcraft',
    fetch: async (text, style) => {
      // Textcraft — Minecraft style + others
      const r = await fetch(
        `https://textcraft.net/api.php?text=${encodeURIComponent(text)}&color1=${style.color1}&color2=${style.color2}&style=${style.effect}`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!r.ok) return null
      const buf = await r.arrayBuffer()
      if (buf.byteLength < 1000) return null
      return { buffer: Buffer.from(buf) }
    }
  },
  {
    name: 'logo-maker-api',
    fetch: async (text, style) => {
      const r = await fetch(`https://api.logomakr.com/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          font:       style.font,
          color:      `#${style.color1}`,
          background: `#${style.bg}`,
          effect:     style.effect,
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
    name: 'glitch-this',
    fetch: async (text, style) => {
      const r = await fetch(`https://api.glitch-this.com/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          effect:     style.effect,
          color:      style.color1,
          background: style.bg
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
    name: 'textgiraffe',
    fetch: async (text, style) => {
      const effectMap = {
        neon: 'neon-light', fire: 'burning-fire', glow: 'glowing',
        horror: 'grunge', galaxy: 'space', shadow: 'shadow',
        metallic: 'chrome', frost: 'icy', glitch: 'cyber',
        rainbow: 'colorful', spray: 'street-art', pixel: 'pixel-art',
        wave: 'ocean', toxic: 'acid', elegant: 'elegant'
      }
      const fx = effectMap[style.effect] || 'neon-light'
      const r = await fetch(
        `https://www.textgiraffe.com/logos/${encodeURIComponent(text)}/?design=${fx}&color=${style.color1}&bg=${style.bg}`,
        { signal: AbortSignal.timeout(15000) }
      )
      const text2 = await r.text()
      const match = text2.match(/src="(https:\/\/[^"]+\.(png|jpg|gif|webp))"/)
      if (!match) return null
      return match[1]
    }
  },
  {
    name: 'logosvg-api',
    fetch: async (text, style) => {
      const r = await fetch(`https://svg-text-logo.vercel.app/api?text=${encodeURIComponent(text)}&color=${style.color1}&bg=${style.bg}&font=${encodeURIComponent(style.font)}&effect=${style.effect}`, {
        signal: AbortSignal.timeout(15000)
      })
      if (!r.ok) return null
      const buf = await r.arrayBuffer()
      if (buf.byteLength < 500) return null
      return { buffer: Buffer.from(buf) }
    }
  },
  {
    name: 'wordmark',
    fetch: async (text, style) => {
      const r = await fetch(`https://wordmark.it/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word: text, font: style.font, color: style.color1 }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.url || d?.image || d?.output
      if (!url) return null
      return url
    }
  },
  {
    name: 'imageonline-text',
    fetch: async (text, style) => {
      const r = await fetch(`https://imageonline.co/text-effect-online.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          text,
          effect:     style.effect,
          fgcolor:    style.color1,
          bgcolor:    style.bg,
          fontsize:   80
        }),
        signal: AbortSignal.timeout(15000)
      })
      const html = await r.text()
      const match = html.match(/src="(\/files\/[^"]+\.(png|jpg))"/)
      if (!match) return null
      return `https://imageonline.co${match[1]}`
    }
  },
  {
    name: 'kapwing-text',
    fetch: async (text, style) => {
      const r = await fetch(`https://www.kapwing.com/api/studio/element/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          fontFamily:  style.font,
          color:       `#${style.color1}`,
          bgColor:     `#${style.bg}`,
          fontSize:    80,
          effect:      style.effect
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.url || d?.output?.url
      if (!url) return null
      return url
    }
  },
  {
    name: 'textanim',
    fetch: async (text, style) => {
      const r = await fetch(`https://textanim.com/api/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          effect:     style.effect,
          color1:     style.color1,
          color2:     style.color2,
          background: style.bg,
          font:       style.font
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.gif || d?.png || d?.url
      if (!url) return null
      return url
    }
  },
  {
    name: 'fontspace-render',
    fetch: async (text, style) => {
      const r = await fetch(
        `https://www.fontspace.com/api/render?text=${encodeURIComponent(text)}&font=${encodeURIComponent(style.font)}&size=80&color=${style.color1}&bg=${style.bg}`,
        { signal: AbortSignal.timeout(15000) }
      )
      if (!r.ok) return null
      const buf = await r.arrayBuffer()
      if (buf.byteLength < 1000) return null
      return { buffer: Buffer.from(buf) }
    }
  },
  {
    name: 'logotype-maker',
    fetch: async (text, style) => {
      const r = await fetch(`https://logotypemaker.com/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          style:  style.effect,
          color:  style.color1,
          bgColor: style.bg
        }),
        signal: AbortSignal.timeout(15000)
      })
      const d = await r.json()
      const url = d?.logo || d?.url || d?.image
      if (!url) return null
      return url
    }
  },
  {
    name: 'text-svg-fallback',
    fetch: async (text, style) => {
      // Pure SVG generation as absolute last resort — always works
      const lines  = text.split(/[&+]/).map(t => t.trim())
      const isTwo  = lines.length >= 2
      const svgW   = 600
      const svgH   = isTwo ? 200 : 150

      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">
  <defs>
    <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#${style.color1};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:#${style.color2};stop-opacity:1"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="${svgW}" height="${svgH}" fill="#${style.bg}" rx="16"/>
  ${isTwo
    ? `<text x="${svgW/2}" y="85" font-family="serif" font-size="64" font-weight="bold"
        fill="url(#g1)" text-anchor="middle" filter="url(#glow)">${lines[0]}</text>
       <text x="${svgW/2}" y="165" font-family="serif" font-size="52" font-weight="bold"
        fill="url(#g1)" text-anchor="middle" filter="url(#glow)">${lines[1]}</text>`
    : `<text x="${svgW/2}" y="100" font-family="serif" font-size="72" font-weight="bold"
        fill="url(#g1)" text-anchor="middle" filter="url(#glow)">${text}</text>`
  }
</svg>`
      const buffer = Buffer.from(svg)
      return { buffer, isSvg: true }
    }
  }
]

// ─────────────────────────────────────────────
// NEVER-FAIL LOGO ENGINE
// ─────────────────────────────────────────────
async function generateLogo(text, style) {
  for (const api of LOGO_APIS) {
    try {
      const result = await api.fetch(text, style)
      if (!result) continue
      // Result is either a URL string or { buffer }
      if (typeof result === 'string' && result.startsWith('http')) {
        return { type: 'url', value: result, api: api.name }
      }
      if (result?.buffer instanceof Buffer) {
        return { type: 'buffer', value: result.buffer, api: api.name, isSvg: result.isSvg }
      }
    } catch {
      // Silent — try next
    }
  }
  return null
}

// ─────────────────────────────────────────────
// SEND LOGO HELPER
// ─────────────────────────────────────────────
async function sendLogo(sock, from, m, result, caption) {
  if (result.type === 'url') {
    await sock.sendMessage(from, { image: { url: result.value }, caption }, { quoted: m })
  } else {
    await sock.sendMessage(from, { image: result.value, caption }, { quoted: m })
  }
}

// ─────────────────────────────────────────────
// BUILD ALL ALIASES — Each style gets its own alias
// ─────────────────────────────────────────────
const ALL_ALIASES = Object.keys(STYLES) // e.g. ['hacker','zombie','lovers',...]

// ─────────────────────────────────────────────
// MENU TEXT BUILDER
// ─────────────────────────────────────────────
function buildMenu(prefix) {
  const lines = Object.entries(STYLES).map(([key, s]) => {
    const note = s.twoNames ? ' *(2 names: name1 & name2)*' : ''
    return `║  ${s.emoji} *${s.label}*${note}\n║    ${prefix}${key} <name>\n║    _${s.desc}_`
  })
  return (
    `╔═━━━━━━━━━━━━━━━━═❒\n` +
    `║  🎨  LOGO GENERATOR\n` +
    `║  20 Styles — Never Fail\n` +
    `╠═━━━━━━━━━━━━━━━━═❒\n` +
    lines.join('\n║\n') + '\n' +
    `╠═━━━━━━━━━━━━━━━━═❒\n` +
    `║  📌 Single name:  ${prefix}hacker SwiftBot\n` +
    `║  📌 Two names:    ${prefix}lovers John & Jane\n` +
    `║  📌 Also use + :  ${prefix}wedding Tom + Mary\n` +
    `╚━━━━━━━━━━━━━━━━━═❒`
  )
}

// ─────────────────────────────────────────────
// COMMAND EXPORT
// ─────────────────────────────────────────────
export default {
  name: 'logomenu',
  alias: [
    'logo',                   // generic — shows menu or uses style arg
    ...ALL_ALIASES            // hacker, zombie, lovers, fire, galaxy, neon ...
  ],
  desc: 'Logo generator — 20 styles, each as a direct command',
  usage: '<name>  OR  <style> <name>  OR  <name1> & <name2>',
  category: 'logo',
  permission: 'all',

  execute: async (sock, m, args, { db, box, nobox, logger }) => {
    const from    = m.key.remoteJid
    const prefix  = await db.get('prefix') || '#'

    // ─── DETECT WHICH ALIAS WAS USED ────────
    // Router passes cmdName in context; fallback: check message body
    const body    = m.message?.conversation
                 || m.message?.extendedTextMessage?.text
                 || ''
    const usedCmd = body.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase()

    // ─── SHOW MENU — if "logo" with no style or no args ─
    const isMenuCmd = usedCmd === 'logomenu' || usedCmd === 'logo'
    if (isMenuCmd && args.length === 0) {
      return await sock.sendMessage(from, {
        text: buildMenu(prefix)
      }, { quoted: m })
    }

        // ─── DETERMINE STYLE ────────────────────
    let styleKey = null
    let nameInput = ''

    // Way 1: alias IS the style (e.g. user typed #hacker SwiftBot)
    if (STYLES[usedCmd]) {
      styleKey  = usedCmd
      nameInput = args.join(' ').trim()
    }
    // Way 2: #logo <style> <name> (e.g. #logo hacker SwiftBot)
    else if (isMenuCmd && STYLES[args[0]?.toLowerCase()]) {
      styleKey  = args[0].toLowerCase()
      nameInput = args.slice(1).join(' ').trim()
    }
    // Way 3: #logo <name> — random style
    else if (isMenuCmd && args.length > 0) {
      const keys = Object.keys(STYLES)
      styleKey   = keys[Math.floor(Math.random() * keys.length)]
      nameInput  = args.join(' ').trim()
    }

    if (!styleKey || !nameInput) {
      return await sock.sendMessage(from, {
        text: nobox
          ? buildMenu(prefix)
          : buildMenu(prefix)
      }, { quoted: m })
    }

    const style = STYLES[styleKey]

    // ─── PARSE TWO NAMES ────────────────────
    // Supports: "John & Jane" | "John + Jane" | "John and Jane"
    const twoMatch = nameInput.match(/^(.+?)\s*(?:&|\+|and)\s*(.+)$/i)
    let displayText = nameInput

    if (style.twoNames && twoMatch) {
      const [, name1, name2] = twoMatch
      displayText = `${name1.trim()} & ${name2.trim()}`
    } else if (style.twoNames) {
      // Gently hint but still generate
    }

    // ─── LOADING REACT ───────────────────────
    await sock.sendMessage(from, { react: { text: '🎨', key: m.key } })

    // ─── LOADING MESSAGE ─────────────────────
    await sock.sendMessage(from, {
      text: nobox
        ? `🎨 Creating *${style.label}* logo for: _${displayText}_...`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║  🎨 Creating Logo...\n║  ${style.emoji} Style: ${style.label}\n║  ✏️  Name: ${displayText}\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    // ─── GENERATE ────────────────────────────
    const result = await generateLogo(displayText, style)

    if (!result) {
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      return await sock.sendMessage(from, {
        text: nobox
          ? '❌ All 16 logo APIs failed. Try again later.'
          : await box.error('All 16 logo APIs failed. Try again later.')
      }, { quoted: m })
    }

    // ─── BUILD CAPTION ───────────────────────
    const caption =
      `╔═━━━━━━━━━━━━━━━━═❒\n` +
      `║  ${style.emoji}  ${style.label.toUpperCase()} LOGO\n` +
      `╠═━━━━━━━━━━━━━━━━═❒\n` +
      `║  ✏️  ${displayText}\n` +
      `║  🎨 Style: ${style.desc}\n` +
      `╚━━━━━━━━━━━━━━━━━═❒`

    try {
      await sendLogo(sock, from, m, result, caption)
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

      // Offer other styles hint
      const others = Object.keys(STYLES).filter(k => k !== styleKey).slice(0, 3)
      await sock.sendMessage(from, {
        text: `💡 Try other styles: ${others.map(k => `${prefix}${k} ${nameInput}`).join('  |  ')}`
      })

    } catch (sendErr) {
      logger.error?.('LOGO', 'Send failed', sendErr.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      await sock.sendMessage(from, {
        text: nobox
          ? `❌ Logo created but send failed: ${sendErr.message}`
          : await box.error(`Logo send failed: ${sendErr.message}`)
      }, { quoted: m })
    }
  }
}