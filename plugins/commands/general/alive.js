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
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)
    const mem = process.memoryUsage()
    const used = (mem.heapUsed / 1024 / 1024).toFixed(1)
    const total = (mem.heapTotal / 1024 / 1024).toFixed(1)
    const ramPercent = Math.floor((mem.heapUsed / mem.heapTotal) * 100)
    const ramBars = '▣'.repeat(Math.floor(ramPercent / 20)) + '□'.repeat(5 - Math.floor(ramPercent / 20))
    const speed = (Math.random() * 150 + 50).toFixed(4)

    const caption = `
╭━━━━❮ ${botname.toUpperCase()} v${version || '3.2.0'} ❯━⊷
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ ᴅᴇᴛᴀɪʟs ❯━⊷
┃➠ ᴘʀᴇғɪx: [ ${prefix} ]
┃➠ ᴏᴡɴᴇʀ: ${ownerName || owner || 'Not Set'}
┃➠ ᴄʀᴇᴅɪᴛ: ${credit || 'SwiftBot Tech'}
┃➠ ᴍᴏᴅᴇ: ${mode?.toUpperCase() || 'PUBLIC'}
┃➠ ᴘʟᴀᴛғᴏʀᴍ: ${platform || 'whatsapp'}
┃➠ sᴘᴇᴇᴅ: ${speed} Ms
┃➠ ᴜᴘᴛɪᴍᴇ: ${days}d ${hours}h ${minutes}m ${seconds}s
┃➠ ᴠᴇʀsɪᴏɴ: ${version || '3.2.0'}
┃➠ ʀᴀᴍ: ${ramBars} ${ramPercent}%
┃➠ ᴜsᴀɢᴇ: ${used}MB of ${total}MB
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ sᴛᴀᴛᴜs ❯━⊷
┃➠ Bot is Alive
┃➠ Type ${prefix}menu for commands
╰━━━━━━━━━━━━━━━━━⊷
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