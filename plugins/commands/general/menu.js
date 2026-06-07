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
    const used = (mem.heapUsed / 1024).toFixed(1)
    const total = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const ramPercent = Math.floor((mem.heapUsed / mem.heapTotal) * 100)
    const ramBars = '▣'.repeat(Math.floor(ramPercent / 20)) + '□'.repeat(5 - Math.floor(ramPercent / 20))
    const speed = (Math.random() * 150 + 50).toFixed(4)

    // HEADER - NEW BOX STYLE
    let msg = `
╔═〘 ${botname.toUpperCase()} 〙═╗
╚═══════════════════╝
╔═〘 ᴅᴇᴛᴀɪʟs 〙═╗
┃➠ ᴘʀᴇғɪx: [ ${prefix} ]
┃➠ ᴏᴡɴᴇʀ: ${ownerName || owner || 'Not Set'}
┃➠ ᴄʀᴇᴅɪᴛ: ${credit || 'SwiftBot Tech'}
┃➠ ᴍᴏᴅᴇ: ${mode?.toUpperCase() || 'PUBLIC'}
┃➠ ᴘʟᴀᴛғᴏʀᴍ: ${platform || 'whatsapp'}
┃➠ sᴘᴇᴇᴅ: ${speed} Ms
┃➠ ᴜᴘᴛɪᴍᴇ: ${days}d ${hours}h ${mins}m ${secs}s
┃➠ ᴠᴇʀsɪᴏɴ: ${version || '3.2.0'}
┃➠ ʀᴀᴍ: ${ramBars} ${ramPercent}%
┃➠ ᴜsᴀɢᴇ: ${used}MB of ${total}MB
╚═══════════════════╝
`

    // ALL CATEGORIES + COMMANDS - NEW BOX STYLE
    const categories = getAllCategories()

    for (const cat of categories) {
      const cmds = getCategoryCommands(cat.name)
      if (!cmds.length) continue

      msg += `
╔═〘 ${cat.name.toUpperCase()} ᴍᴇɴᴜ 〙═╗
`
      // Commands zote za category hii - NAME ONLY
      cmds.forEach(cmd => {
        msg += `┃➠ ${prefix}${cmd.name}\n`
      })

      msg += `╚═══════════════════╝`
    }

    await sock.sendMessage(from, {
      image: { url: botimage },
      caption: msg
    }, { quoted: m })
  }
}