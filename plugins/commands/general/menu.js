export default {
  name: 'menu',
  alias: ['help', 'commands'],
  desc: 'Show bot command menu',
  usage: '[category]',
  category: 'general',
  permission: 'all',

  execute: async (sock, m, args, { db, box, fonts, nobox, prefix }) => {
    const from = m.key.remoteJid
    const category = args[0]?.toLowerCase()
    const { getAllCategories, getCategoryCommands } = await import('../../../system/loader.js')

    const [botname, owner, mode] = await Promise.all([
      db.get('botname'),
      db.get('owner'),
      db.get('mode')
    ])

    // If category specified, show commands in that category
    if (category) {
      const cmds = getCategoryCommands(category)
      if (!cmds.length) {
        const msg = nobox
      ? `Category "${category}" not found.\nUse ${prefix}menu to see all categories.`
          : await box.error(`Category "${category}" not found.\nUse ${prefix}menu to see all categories.`)
        return await sock.sendMessage(from, { text: msg }, { quoted: m })
      }

      const cmdList = cmds.map(c => ({
        name: c.name,
        usage: c.usage || '',
        desc: c.desc || 'No description'
      }))

      const msg = nobox
    ? `${botname} - ${category.toUpperCase()}\n\n${cmdList.map(c => `• ${prefix}${c.name} ${c.usage}\n ${c.desc}`).join('\n\n')}`
        : await box.category(botname, prefix, category, cmdList)

      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // Show main menu with categories
    const categories = getAllCategories()
    const catList = categories.map(cat => ({
      name: cat.name,
      desc: `${cat.commands.length} commands`
    }))

    const msg = nobox
  ? `${botname.toUpperCase()} MENU\n\nPrefix: ${prefix}\nMode: ${mode}\nOwner: ${owner}\n\n${catList.map((c, i) => `${i + 1}. ${c.name} - ${c.desc}`).join('\n')}\n\nReply with number or use ${prefix}menu <category>`
      : await box.menu(botname, prefix, catList)

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}