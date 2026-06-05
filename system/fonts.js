/**
 * SwiftBot - system/fonts.js
 * Fancy text styles engine — WhatsApp Safe Version
 * Used by box.js, commands, and AI replies
 * All functions are pure — no DB dependency
 * FIX: Unicode replaced with WhatsApp native to prevent �
 */

// ─────────────────────────────────────────────
// WHATSAPP NATIVE FORMATTING — Safe for all phones
// ─────────────────────────────────────────────
export const fonts = {
  // Main styles — WhatsApp native
  bold: (text) => `*${text}*`,
  italic: (text) => `_${text}_`,
  boldItalic: (text) => `*_${text}_*`,
  mono: (text) => `\`${text}\``,
  double: (text) => `*${text}*`, // Fallback to bold
  sans: (text) => text, // Plain
  sansBold: (text) => `*${text}*`, // Native bold
  circle: (text) => `(${text})`, // Fallback to parentheses
  square: (text) => `[${text}]`, // Fallback to brackets
  smallCaps: (text) => text.toUpperCase(), // Plain uppercase

  // WhatsApp native — use sparingly
  strike: (text) => `~${text}~`,
  code: (text) => `\`\`\`${text}\`\`\``,
  quote: (text) => `> ${text}`,

  // Combo helpers
  title: (text) => `*${text}*`,
  header: (text) => `*${text}*`,
  label: (text) => text.toUpperCase(),
  list: (text) => `• ${text}`,

  // Dynamic — call any font by name
  style: (text, styleName) => {
    const styles = {
      bold: `*${text}*`,
      italic: `_${text}_`,
      boldItalic: `*_${text}_*`,
      mono: `\`${text}\``,
      strike: `~${text}~`,
      code: `\`\`\`${text}\`\`\``,
      quote: `> ${text}`,
      sansBold: `*${text}*`,
      smallCaps: text.toUpperCase()
    }
    return styles[styleName] || text
  },

  // List all available styles
  listStyles: () => ['bold', 'italic', 'boldItalic', 'mono', 'strike', 'code', 'quote', 'sansBold', 'smallCaps'],

  // Random style — for fun commands
  random: (text) => {
    const keys = ['bold', 'italic', 'mono', 'strike']
    const rand = keys[Math.floor(Math.random() * keys.length)]
    return fonts.style(text, rand)
  }
}