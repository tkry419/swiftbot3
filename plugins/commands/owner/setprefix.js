/**
 * SwiftBot - plugins/commands/owner/setprefix.js
 * Change bot prefix real-time — No restart needed
 */

export default {
  name: 'setprefix',
  alias: ['prefix'],
  desc: 'Change command prefix',
  usage: '<new_prefix>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, fonts }) => {
    const from = m.key.remoteJid
    const newPrefix = args[0]

    if (!newPrefix) {
      const current = await db.get('prefix')
      const msg = await box.info('CURRENT PREFIX', `Prefix: ${fonts.mono(current)}\n\nUsage: ${fonts.mono('#setprefix.')}`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // Validate prefix
    if (newPrefix.length > 3) {
      const msg = await box.error('Prefix too long. Max 3 characters.')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    if (newPrefix === 'noprefix') {
      await db.set('noPrefix', true)
      const msg = await box.success('NoPrefix mode enabled!\nCommands work without prefix now.')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // Disable noPrefix if setting normal prefix
    await db.set('noPrefix', false)
    await db.set('prefix', newPrefix)

    const msg = await box.success(
      `Prefix changed to: ${fonts.bold(newPrefix)}\n\n` +
      `Example: ${fonts.mono(newPrefix + 'menu')}\n\n` +
      `${fonts.smallCaps('Changes applied instantly')}`
    )
    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}