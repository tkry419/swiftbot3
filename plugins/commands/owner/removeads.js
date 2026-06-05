export default {
  name: 'removeads',
  alias: ['noads'],
  desc: 'Remove channel ads/forwarded data from messages',
  usage: '<on/off>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const value = args[0]?.toLowerCase()

    if (!value ||!['on', 'off'].includes(value)) {
      const current = await db.get('removeads')
      const status = current? 'ON - No ads' : 'OFF - Showing channel'
      const msg = nobox
      ? `RemoveAds: ${status}\n\nUsage: #removeads on/off`
        : await box.info('REMOVE ADS', `Status: ${status}\n\nUsage: #removeads on/off`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const newVal = value === 'on'
    await db.set('removeads', newVal)

    const msg = newVal
    ? 'RemoveAds enabled ✅\n\nChannel data removed from all messages.'
      : await box.success('Channel ads enabled\n\nMessages will show channel info.')

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}