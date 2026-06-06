/**
 * SwiftBot - plugins/commands/misc/xmenu.js
 * 100% Dynamic Menu System - Auto detects all categories
 * Clean bullet design - no numbers - WITH IMAGE
 */

// Hifadhi categories hapa kutoka init()
let CATEGORIES = new Map()

export default {
  name: 'xmenu',
  alias: [], // Auto-filled by init()
  desc: 'Dynamic menu system - lists all category menus',
  usage: 'xmenu',
  category: 'General',
  permission: 'all',

  // Generate aliases for all categories dynamically
  init: async ({ db, categories }) => {
    // Save categories kwa execute
    CATEGORIES = categories

    const aliases = []
    for (const [categoryName] of categories) {
      const cat = categoryName.toLowerCase()
      if (cat!== 'misc' && cat!== 'general') aliases.push(`${cat}menu`)
    }
    return { alias: aliases }
  },

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m
    const categories = CATEGORIES // Tumia categories kutoka init

    const [botname, botimage] = await Promise.all([
      db.get('botname'),
      db.get('botimage')
    ])

    const body = m.message?.conversation || m.message?.extendedTextMessage?.text || ''
    const usedCommand = body.slice(prefix.length).trim().split(' ')[0].toLowerCase()

    // If user types #xmenu - show all available category menus
    if (usedCommand === 'xmenu') {
      const catList = Array.from(categories.entries())
    .filter(([name]) => name.toLowerCase()!== 'misc' && name.toLowerCase()!== 'general')
    .map(([name, data]) => `║ ❒ ${prefix}${name.toLowerCase()}menu\n║ ${data.commands.length} commands`)
    .join('\n║\n')

      const text = nobox
    ? `CATEGORY MENUS\n\n${Array.from(categories.keys()).filter(c => c.toLowerCase()!== 'misc' && c.toLowerCase()!== 'general').map((c) => `• ${prefix}${c.toLowerCase()}menu`).join('\n')}\n\nUse any menu to see commands`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ ${botname.toUpperCase()}\n╠═══════════════════\n║ CATEGORY MENUS\n╠═══════════════════\n${catList}\n╠═══════════════════\n║ Use any menu above\n╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, {
        image: { url: botimage },
        caption: text
      }, { quoted: msg })
    }

    // If user types #videomenu, #aimenu, etc - show that category
    if (!usedCommand.endsWith('menu')) {
      return await sock.sendMessage(from, {
        text: `Use ${prefix}xmenu to see all menus`
      }, { quoted: msg })
    }

    let categoryName = usedCommand.replace('menu', '')

    // Handle case sensitivity - find actual category
    let finalCategory = null
    for (const [cat] of categories) {
      if (cat.toLowerCase() === categoryName) {
        finalCategory = cat
        break
      }
    }

    if (!finalCategory) {
      const availableCats = Array.from(categories.keys()).filter(c => c.toLowerCase()!== 'misc' && c.toLowerCase()!== 'general').join(', ')
      return await sock.sendMessage(from, {
        text: nobox
      ? `Category not found\nAvailable: ${availableCats}`
          : await box.error(`Category not found\nAvailable: ${availableCats}`)
      }, { quoted: msg })
    }

    const categoryData = categories.get(finalCategory)

    if (!categoryData || categoryData.commands.length === 0) {
      return await sock.sendMessage(from, {
        text: nobox
      ? `Category "${finalCategory}" is empty`
          : await box.error(`Category "${finalCategory}" is empty`)
      }, { quoted: msg })
    }

    // BULLET DESIGN - HAKUNA NAMBA
    const cmdList = categoryData.commands
  .map((c) => `║ • ${prefix}${c.name}`)
  .join('\n')

    const text = nobox
  ? `${categoryData.name.toUpperCase()} MENU\n\n${categoryData.commands.map((c) => `• ${prefix}${c.name}`).join('\n')}\n\nTotal: ${categoryData.commands.length} commands`
      : `╔═━━━━━━━━━━━━━━━━═❒\n║ ${botname.toUpperCase()}\n╠═══════════════════\n║ ${categoryData.name.toUpperCase()}\n╠═══════════════════\n${cmdList}\n╠═══════════════════\n║ Total: ${categoryData.commands.length} commands\n╚━━━━━━━━━━━━━━━━━═❒`

    await sock.sendMessage(from, {
      image: { url: botimage },
      caption: text
    }, { quoted: msg })
  }
}