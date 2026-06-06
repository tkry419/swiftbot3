/**
 * SwiftBot - plugins/commands/owner/setnoprefix.js
 * Toggle noPrefix mode ON/OFF - Real-time from DB
 * Hardcoded boxes - NO nobox option
 */

export default {
  name: 'setnoprefix',
  alias: ['noprefix'],
  desc: 'Toggle noPrefix mode on/off',
  usage: 'on|off',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid

    const [botname, prefix, version, current] = await Promise.all([
      db.get('botname'),
      db.get('prefix'),
      db.get('version'),
      db.get('noPrefix')
    ])

    const mode = args[0]?.toLowerCase()

    // Kama hakuna argument, onyesha status
    if (!mode ||!['on', 'off'].includes(mode)) {
      const status = current? 'ON' : 'OFF'
      const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${botname.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *NOPREFIX STATUS* ⌬
║ 𖠁 *𝕾𝖙𝖆𝖙𝖚𝖘:* ${status}
║ 𖠁 *𝕻𝖗𝖊𝖋𝖎𝖝:* [ ${prefix} ]
║
║ 𖠁 *𝖀𝖘𝖆𝖌𝖊:* ${prefix}setnoprefix on
║ 𖠁 *𝖀𝖘𝖆𝖌𝖊:* ${prefix}setnoprefix off
╚━━━━━━━━━━━━━━━━━═❒
`
      return await sock.sendMessage(from, { text: caption }, { quoted: m })
    }

    // Weka noprefix
    const newValue = mode === 'on'? true : false

    if (current === newValue) {
      const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${botname.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *NOPREFIX* ⌬
║ 𖠁 Already set to ${mode.toUpperCase()}
║ 𖠁 No changes made
╚━━━━━━━━━━━━━━━━━═❒
`
      return await sock.sendMessage(from, { text: caption }, { quoted: m })
    }

    await db.set('noPrefix', newValue)

    const statusText = newValue
     ? 'Commands work without prefix now\nExample: menu, ping, alive'
      : `Commands need prefix now\nExample: ${prefix}menu, ${prefix}ping`

    const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${botname.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *NOPREFIX UPDATED* ⌬
║ 𖠁 *𝕾𝖙𝖆𝖙𝖚𝖘:* ${mode.toUpperCase()}
║ 𖠁 *𝕻𝖗𝖊𝖋𝖎𝖝:* [ ${prefix} ]
║
║ 𖠁 ${statusText}
╚━━━━━━━━━━━━━━━━━═❒
`

    await sock.sendMessage(from, { text: caption }, { quoted: m })
  }
}