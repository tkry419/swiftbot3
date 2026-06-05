export default {
  name: 'setwelcome',
  alias: ['welcome'],
  desc: 'Toggle welcome messages on/off',
  usage: '<on/off>',
  category: 'group',
  permission: 'admin',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    if (!from.endsWith('@g.us')) return

    const value = args[0]?.toLowerCase()
    if (!['on', 'off'].includes(value)) {
      const current = await db.getGroupKey(from, 'welcomeMsg')
      const msg = nobox
    ? `Welcome: ${current? 'ON' : 'OFF'}\nUsage: #setwelcome on/off`
        : await box.info('WELCOME', `Status: ${current? 'ON' : 'OFF'}\nUsage: #setwelcome on/off`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await db.setGroup(from, 'welcomeMsg', value === 'on')
    const msg = nobox
  ? `Welcome messages ${value === 'on'? 'enabled' : 'disabled'} ✅`
      : await box.success(`Welcome messages ${value === 'on'? 'enabled' : 'disabled'}`)
    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}