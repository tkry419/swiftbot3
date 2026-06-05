export default {
  name: 'setnobox',
  alias: ['nobox'],
  desc: 'Turn boxes on/off - plain text mode',
  usage: '<on/off>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const value = args[0]?.toLowerCase()

    if (!value ||!['on', 'off'].includes(value)) {
      const current = await db.get('nobox')
      const status = current? 'ON - Plain text mode' : 'OFF - Box mode'
      const msg = nobox
      ? `NoBox: ${status}\n\nUsage: #setnobox on/off`
        : await box.info('NOBOX', `Status: ${status}\n\nUsage: #setnobox on/off`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const newVal = value === 'on'
    await db.set('nobox', newVal)

    const msg = newVal
    ? 'NoBox enabled ✅\n\nCommands will now send plain text without boxes.'
      : await box.success('Box mode enabled\n\nCommands will use fancy boxes.')

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}