export default {
  name: 'setgoodbye',
  alias: ['goodbye'],
  desc: 'Toggle goodbye messages on/off',
  usage: '<on/off>',
  category: 'group',
  permission: 'admin',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    if (!from.endsWith('@g.us')) return

    const value = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(value)) {
      const current = await db.getGroupKey(from, 'goodbyeMsg')
      const msg = nobox
    ? `Goodbye: ${current? 'ON' : 'OFF'}\nUsage: #setgoodbye on/off`
        : await box.info('GOODBYE', `Status: ${current? 'ON' : 'OFF'}\nUsage: #setgoodbye on/off`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await db.setGroup(from, 'goodbyeMsg', value === 'on')
    const msg = nobox
  ? `Goodbye messages ${value === 'on'? 'enabled' : 'disabled'} ✅`
      : await box.success(`Goodbye messages ${value === 'on'? 'enabled' : 'disabled'}`)
    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}