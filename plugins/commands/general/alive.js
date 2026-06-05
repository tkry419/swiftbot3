export default {
  name: 'alive',
  alias: ['bot', 'uptime'],
  desc: 'Check if bot is alive with image',
  usage: '',
  category: 'general',
  permission: 'all',

  execute: async (sock, m, args, { db, box, fonts, nobox }) => {
    const from = m.key.remoteJid

    const [botname, prefix, owner, mode, botimage] = await Promise.all([
      db.get('botname'),
      db.get('prefix'),
      db.get('owner'),
      db.get('mode'),
      db.get('botimage')
    ])

    const uptime = process.uptime()
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = Math.floor(uptime % 60)

    const uptimeStr = `${hours}h ${minutes}m ${seconds}s`

    const caption = nobox
    ? `🤖 ${botname} is Alive!\n\nPrefix: ${prefix}\nMode: ${mode}\nOwner: ${owner}\nUptime: ${uptimeStr}\n\nType ${prefix}menu for commands`
      : await box.reply(
          `🤖 ${fonts.bold(botname)} is Alive!\n\n` +
          `Prefix: ${fonts.mono(prefix)}\n` +
          `Mode: ${fonts.sans(mode)}\n` +
          `Owner: ${fonts.bold(owner)}\n` +
          `Uptime: ${fonts.mono(uptimeStr)}\n\n` +
          `Type ${fonts.bold(prefix + 'menu')} for commands`,
          'SwiftBot v2.0'
        )

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