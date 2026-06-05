/**
 * SwiftBot - plugins/commands/general/menu.js
 * Menu with hardcoded boxes - NO nobox option
 * Real-time from DB - botimage, botname, prefix
 */

export default {
  name: 'menu',
  alias: ['help', 'commands'],
  desc: 'Show bot command menu',
  usage: '[category]',
  category: 'general',
  permission: 'all',

  execute: async (sock, m, args, { db, fonts }) => {
    const from = m.key.remoteJid
    const category = args[0]?.toLowerCase()
    const { getAllCategories, getCategoryCommands } = await import('../../../system/loader.js')

    const [botname, owner, mode, prefix, botimage, version, platform] = await Promise.all([
      db.get('botname'),
      db.get('owner'),
      db.get('mode'),
      db.get('prefix'),
      db.get('botimage'),
      db.get('version'),
      db.get('platform')
    ])

    // If category specified, show commands in that category
    if (category) {
      const cmds = getCategoryCommands(category)
      if (!cmds.length) {
        const msg = `
╔═━━━━━━━━━━━━━━━━═❒
║ SWIFTBOT v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 𖠁 ERROR
║ 𖠁 Category "${category}" not found
║ 𖠁 Use ${prefix}menu to see all categories
╚━━━━━━━━━━━━━━━━━═❒
`
        return await sock.sendMessage(from, {
          image: { url: botimage },
          caption: msg
        }, { quoted: m })
      }

      // Build category menu - KUSHUKA DESIGN
      const uptime = process.uptime()
      const days = Math.floor(uptime / 86400)
      const hours = Math.floor((uptime % 86400) / 3600)
      const mins = Math.floor((uptime % 3600) / 60)

      let msg = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${botname.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 𖠁 CATEGORY: ${category.toUpperCase()}
║ 𖠁 PREFIX: [ ${prefix} ]
║ 𖠁 MODE: ${mode?.toUpperCase() || 'PUBLIC'}
║ 𖠁 UPTIME: ${days}d ${hours}h ${mins}m
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ COMMANDS ⌬
`

      // List zote za commands - KUSHUKA
      cmds.forEach(cmd => {
        const usage = cmd.usage? ` ${cmd.usage}` : ''
        msg += `║ 𖠁 ${prefix}${cmd.name}${usage}\n`
        if (cmd.desc) msg += `║ ${cmd.desc}\n`
        msg += `║\n`
      })

      msg += `╚━━━━━━━━━━━━━━━━━═❒`

      return await sock.sendMessage(from, {
        image: { url: botimage },
        caption: msg
      }, { quoted: m })
    }

    // Show main menu with categories - KUSHUKA DESIGN
    const categories = getAllCategories()
    const uptime = process.uptime()
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const mins = Math.floor((uptime % 3600) / 60)
    const mem = process.memoryUsage()
    const used = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const total = (mem.heapTotal / 1024 / 1024).toFixed(1)

    let msg = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${botname.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 𖠁 PREFIX: [ ${prefix} ]
║ 𖠁 OWNER: ${owner || 'Not Set'}
║ 𖠁 MODE: ${mode?.toUpperCase() || 'PUBLIC'}
║ 𖠁 PLATFORM: ${platform || 'whatsapp'}
║ 𖠁 UPTIME: ${days}d ${hours}h ${mins}m
║ 𖠁 RAM: ${used}MB / ${total}MB
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ CATEGORIES ⌬
`

    // Categories zote - KUSHUKA
    categories.forEach((cat, i) => {
      msg += `║ 𖠁 ${i + 1}. ${cat.name.toUpperCase()}\n`
    })

    msg += `║\n`
    msg += `║ 𖠁 USAGE: ${prefix}menu <category>\n`
    msg += `║ 𖠁 EXAMPLE: ${prefix}menu general\n`
    msg += `╚━━━━━━━━━━━━━━━━━═❒`

    await sock.sendMessage(from, {
      image: { url: botimage },
      caption: msg
    }, { quoted: m })
  }
}