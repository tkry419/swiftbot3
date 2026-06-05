export default {
  name: 'setnoprefix',
  alias: ['noprefix'],
  desc: 'Enable/disable no-prefix mode',
  usage: '<on/off>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const value = args[0]?.toLowerCase()

    if (!value ||!['on', 'off'].includes(value)) {
      const current = await db.get('noPrefix')
      const prefix = await db.get('prefix') || '#'
      const status = current? 'ON - No prefix needed' : `OFF - Use ${prefix}`
      const msg = nobox
      ? `NoPrefix: ${status}\n\nUsage: #setnoprefix on/off`
        : await box.info('NO PREFIX', `Status: ${status}\n\nUsage: #setnoprefix on/off`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const newVal = value === 'on'
    await db.set('noPrefix', newVal)

    const prefix = await db.get('prefix') || '#'
    const msg = newVal
    ? `NoPrefix enabled ✅\n\nNow you can use "menu" instead of "${prefix}menu"`
      : await box.success(`Prefix mode enabled\n\nUse "${prefix}menu" to run commands.`)

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}