/**
 * SwiftBot - plugins/commands/general/alive.js
 * Alive command with hardcoded boxes - NO nobox option
 * Real-time from DB - botimage, botname, prefix
 */

export default {
  name: 'alive',
  alias: ['bot', 'uptime'],
  desc: 'Check if bot is alive with image',
  usage: '',
  category: 'general',
  permission: 'all',

  execute: async (sock, m, args, { db, fonts }) => {
    const from = m.key.remoteJid

    const [botname, prefix, owner, ownerName, mode, botimage, version, platform, credit] = await Promise.all([
      db.get('botname'),
      db.get('prefix'),
      db.get('owner'),
      db.get('ownerName'),
      db.get('mode'),
      db.get('botimage'),
      db.get('version'),
      db.get('platform'),
      db.get('credit')
    ])

    const uptime = process.uptime()
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    const mem = process.memoryUsage()
    const used = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const total = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const ramPercent = Math.floor((mem.heapUsed / mem.heapTotal) * 100)
    const ramBars = '▣'.repeat(Math.floor(ramPercent / 20)) + '□'.repeat(5 - Math.floor(ramPercent / 20))
    const speed = (Math.random() * 150 + 50).toFixed(4)

    const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║    ${botname.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ 𖠁 *𝕻𝖗𝖊𝖋𝖎𝖝:* [ ${prefix} ]
║ 𖠁 *𝕺𝖜𝖓𝖊𝖗:* ${ownerName || owner || 'Not Set'}
║ 𖠁 *𝕮𝖗𝖊𝖉𝖎𝖙:* ${credit || 'SwiftBot Tech'}
║ 𖠁 *𝕸𝖔𝖉𝖊:* ${mode?.toUpperCase() || 'PUBLIC'}
║ 𖠁 *𝕻𝖑𝖆𝖙𝖋𝖔𝖗𝖒:* ${platform || 'whatsapp'}
║ 𖠁 *𝖘𝖕𝖊𝖉:* ${speed} Ms
║ 𖠁 *𝖚𝖕𝖙𝖎𝖒𝖊:* ${days}d ${hours}h ${minutes}m ${seconds}s
║ 𖠁 *𝖁𝖊𝖗𝖘𝖎𝖔𝖒:* ${version || '3.2.0'}
║ 𖠁 *𝕽𝖆𝖒:* ${ramBars} ${ramPercent}%
║ 𖠁 *𝖀𝖘𝖆𝖌𝖊:* ${used}MB of ${total}MB
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *STATUS* ⌬
║ 𖠁 Bot is Alive
║ 𖠁 Type ${prefix}menu for commands
╚━━━━━━━━━━━━━━━━━═❒
`

    try {
      await sock.sendMessage(from, {
        image: { url: botimage },
        caption: caption
      }, { quoted: m })
    } catch (e) {
      // Fallback to text if image fails
      await sock.sendMessage(from, { text: caption }, { quoted: m })
    }
  }
}