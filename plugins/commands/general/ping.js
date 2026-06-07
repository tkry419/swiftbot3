/**
 * SwiftBot - plugins/commands/general/ping.js
 * Ping with hardcoded boxes - NO nobox option
 * Real ping measurement - NO animation delay included
 */

export default {
  name: 'ping',
  alias: ['p', 'speed'],
  desc: 'Check bot response speed',
  usage: '',
  category: 'general',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid

    // STEP 1: Pima ping halisi kwanza - bila animation
    const start = Date.now()
    let msg = await sock.sendMessage(from, { text: 'Pinging...' }, { quoted: m })
    const latency = Date.now() - start

    // STEP 2: Tengeneza bars mpya simple + status
    let speed = 'Ultra Fast ⚡'
    let bar = '▣▣▣'

    if (latency < 80) {
      speed = 'Ultra Fast ⚡'
      bar = '▣▣▣'
    } else if (latency < 200) {
      speed = 'Fast 🚀'
      bar = '▣▣□'
    } else if (latency < 500) {
      speed = 'Good ✨'
      bar = '▣▣▣□□'
    } else if (latency < 1000) {
      speed = 'Normal 💫'
      bar = '▣▣□□□'
    } else {
      speed = 'High 📡'
      bar = '▣□□□□'
    }

    // STEP 3: Tengeneza caption hardcoded - SINGLE LINE BOX STYLE
    const [botname, prefix, version] = await Promise.all([
      db.get('botname'),
      db.get('prefix'),
      db.get('version')
    ])

    const caption = `
╭━━━━❮ ${botname.toUpperCase()} v${version || '3.2.0'} ❯━⊷
╰━━━━━━━━━━━━━━━━━⊷
╭━━━━❮ ᴘᴏɴɢ ❯━⊷
┃➠ sᴘᴇᴇᴅ: ${latency} Ms
┃➠ sᴛᴀᴛᴜs: ${speed}
┃➠ ʀᴀᴍ: ${bar}
┃➠ Type ${prefix}menu for commands
╰━━━━━━━━━━━━━━━━━⊷
`

    // STEP 4: Edit message ya kwanza na result - ping halisi
    await sock.sendMessage(from, {
      text: caption,
      edit: msg.key
    })
  }
}