export default {
  name: 'setprefix',
  alias: ['prefix'],
  desc: 'Change bot command prefix',
  usage: '<symbol>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const newPrefix = args[0]

    if (!newPrefix) {
      const current = await db.get('prefix') || '#'
      const msg = nobox
       ? `Current prefix: ${current}\n\nUsage: #setprefix!`
        : await box.info('PREFIX', `Current: ${current}\n\nUsage: #setprefix!`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    if (newPrefix.length > 2) {
      const msg = nobox
       ? 'Prefix too long. Use 1-2 characters only.'
        : await box.error('Prefix too long. Use 1-2 characters only.')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await db.set('prefix', newPrefix)
    const msg = nobox
     ? `Prefix changed to: ${newPrefix} ✅\n\nExample: ${newPrefix}menu`
      : await box.success(`Prefix changed to: ${newPrefix}\n\nExample: ${newPrefix}menu`)

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}