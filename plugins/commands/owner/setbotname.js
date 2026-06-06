/**
 * SwiftBot - plugins/commands/owner/setbotname.js
 * Change bot name - Real-time from DB
 * Hardcoded boxes - NO nobox option
 */

export default {
  name: 'setbotname',
  alias: ['setname'],
  desc: 'Change bot name',
  usage: '<new name>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid

    const [prefix, version, currentName] = await Promise.all([
      db.get('prefix'),
      db.get('version'),
      db.get('botname')
    ])

    const newName = args.join(' ').trim()

    // Kama hakuna jina jipya, onyesha status
    if (!newName) {
      const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${currentName.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *BOTNAME STATUS* ⌬
║ 𖠁 *𝕮𝖚𝖗𝖊𝖓𝖙:* ${currentName}
║
║ 𖠁 *𝖀𝖘𝖆𝖌𝖊:* ${prefix}setbotname SwiftBot
║ 𖠁 *𝕹𝖔𝖙𝖊:* Max 25 characters
╚━━━━━━━━━━━━━━━━━═❒
`
      return await sock.sendMessage(from, { text: caption }, { quoted: m })
    }

    // Validate length
    if (newName.length > 25) {
      const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${currentName.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *ERROR* ⌬
║ 𖠁 Name too long
║ 𖠁 Max 25 characters
║ 𖠁 Your input: ${newName.length} chars
╚━━━━━━━━━━━━━━━━━═❒
`
      return await sock.sendMessage(from, { text: caption }, { quoted: m })
    }

    // Kama jina ni lile lile
    if (currentName === newName) {
      const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${currentName.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *BOTNAME* ⌬
║ 𖠁 Name already set to ${newName}
║ 𖠁 No changes made
╚━━━━━━━━━━━━━━━━━═❒
`
      return await sock.sendMessage(from, { text: caption }, { quoted: m })
    }

    // Update DB
    await db.set('botname', newName)

    const caption = `
╔═━━━━━━━━━━━━━━━━═❒
║ ${newName.toUpperCase()} v${version || '3.2.0'}
╚━━━━━━━━━━━━━━━━━═❒
╔═━━━━━━━━━━━━━━━━═❒
║ ⌬ *BOTNAME UPDATED* ⌬
║ 𖠁 *𝕺𝖑𝖉:* ${currentName}
║ 𖠁 *𝕹𝖊𝖜:* ${newName}
║
║ 𖠁 Changed successfully
║ 𖠁 Affects menu, alive, ping
╚━━━━━━━━━━━━━━━━━═❒
`

    await sock.sendMessage(from, { text: caption }, { quoted: m })
  }
}