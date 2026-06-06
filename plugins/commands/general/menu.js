/**
 * SwiftBot - plugins/commands/general/menu.js
 * Menu with hardcoded boxes - NO nobox option
 * Real-time from DB - botimage, botname, prefix
 * SHOWS ALL CATEGORIES + ALL COMMANDS - KUSHUKA STYLE
 */

export default {
  name: 'menu',
  alias: ['help', 'commands'],
  desc: 'Show bot command menu',
  usage: '',
  category: 'general',
  permission: 'all',

  execute: async (sock, m, args, { db, fonts }) => {
    const from = m.key.remoteJid
    const { getAllCategories, getCategoryCommands } = await import('../../../system/loader.js')

    const [botname, owner, ownerName, mode, prefix, botimage, version, platform, credit] = await Promise.all([
      db.get('botname'),
      db.get('owner'),
      db.get('ownerName'),
      db.get('mode'),
      db.get('prefix'),
      db.get('botimage'),
      db.get('version'),
      db.get('platform'),
      db.get('credit')
    ])

    const uptime = process.uptime()
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const mins = Math.floor((uptime % 3600) / 60)
    const secs = Math.floor(uptime % 60)
    const mem = process.memoryUsage()
    const used = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const total = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const ramPercent = Math.floor((mem.heapUsed / mem.heapTotal) * 100)
    const ramBars = '▣'.repeat(Math.floor(ramPercent / 20)) + '□'.repeat(5 - Math.floor(ramPercent / 20))
    const speed = (Math.random() * 150 + 50).toFixed(4)

    // HEADER - IMPERIAL STYLE
    let msg = `
╔═━━━━━━━━━━━━━━━━═❒
║    ${botname.toUpperCase()}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 𖠁 *𝕻𝖗𝖊𝖋𝖎𝖝:* [ ${prefix} ]
║ 𖠁 *𝕺𝖜𝖓𝖊𝖗:* ${ownerName || owner || 'Not Set'}
║ 𖠁 *𝕮𝖗𝖊𝖉𝖎𝖙:* ${credit || 'SwiftBot Tech'}
║ 𖠁 *𝕸𝖔𝖉𝖊:* ${mode?.toUpperCase() || 'PUBLIC'}
║ 𖠁 *𝕻𝖑𝖆𝖙𝖋𝖔𝖗𝖒:* ${platform || 'whatsapp'}
║ 𖠁 *𝖘𝖕𝖊𝖉:* ${speed} Ms
║ 𖠁 *𝖚𝖕𝖙𝖎𝖒𝖊:* ${days}d ${hours}h ${mins}m ${secs}s
║ 𖠁 *𝖁𝖊𝖗𝖘𝖎𝖔𝖒:* ${version || '3.2.0'}
║ 𖠁 *𝕽𝖆𝖒:* ${ramBars} ${ramPercent}%
║ 𖠁 *𝖀𝖘𝖆𝖌𝖊:* ${used}MB of ${total}MB
╚━━━━━━━━━━━━━━━━━═❒
`

    // ALL CATEGORIES + COMMANDS - KUSHUKA DESIGN
    const categories = getAllCategories()
    
    for (const cat of categories) {
      const cmds = getCategoryCommands(cat.name)
      if (!cmds.length) continue

      msg += `
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *${cat.name.toUpperCase()} MENU* ⌬
`
      // Commands zote za category hii
      cmds.forEach(cmd => {
        const usage = cmd.usage? ` ${cmd.usage}` : ''
        msg += `║ 𖠁 .${cmd.name}${usage}\n`
      })

      msg += `╚━━━━━━━━━━━━━━━━━═❒`
    }

    await sock.sendMessage(from, {
      image: { url: botimage },
      caption: msg
    }, { quoted: m })
  }
}