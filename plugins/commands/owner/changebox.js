export default {
  name: 'changebox',
  alias: ['setbox', 'boxstyle'],
  desc: 'Change box style 1-30 or none',
  usage: '<1-30/none>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const style = args[0]
    const styles = box.getStyles()

    if (!style ||!styles[style]) {
      const current = await db.get('boxStyle') || '1'
      const currentName = styles[current]?.name || 'Classic'

      const styleList = Object.entries(styles)
       .filter(([id]) => id!== 'none')
       .map(([id, s]) => `${id}. ${s.name}`)
       .join('\n')

      const msg = nobox
       ? `Current: ${currentName}\n\nStyles:\n${styleList}\n\nnone. No boxes\n\nUsage: #changebox 20`
        : await box.info('BOX STYLES', `Current: ${currentName}\n\n${styleList}\n\nnone. No boxes\n\nUsage: #changebox 20`)

      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await db.set('boxStyle', style)
    const newName = styles[style].name

    const msg = nobox
     ? `Box style changed to: ${newName} ✅`
      : await box.success(`Box style changed to: ${newName}`)

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}