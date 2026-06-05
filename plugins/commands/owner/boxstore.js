export default {
  name: 'boxstore',
  alias: ['boxlist', 'allboxes'],
  desc: 'Show all 30 box styles with mini previews',
  usage: '',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const styles = box.getStyles()
    const current = await db.get('boxStyle') || '1'

    let list = []
    list.push(`Current: ${styles[current].name}`)
    list.push('')
    list.push('Available Styles:')
    list.push('')

    // Show first 15 styles to avoid message too long
    const page = parseInt(args[0]) || 1
    const perPage = 15
    const start = (page - 1) * perPage
    const end = start + perPage

    const styleEntries = Object.entries(styles).filter(([id]) => id!== 'none')
    const totalPages = Math.ceil(styleEntries.length / perPage)

    styleEntries.slice(start, end).forEach(([id, s]) => {
      const marker = id === current? '►' : ' '
      list.push(`${marker} ${id}. ${s.name}`)
      list.push(` ${s.top}Hello${s.bottom}`)
    })

    list.push('')
    list.push(`Page ${page}/${totalPages}`)
    list.push(`Use: #boxstore 2 for page 2`)
    list.push(`Use: #previewbox 20 to preview`)
    list.push(`Use: #changebox 20 to apply`)

    const msg = nobox
     ? list.join('\n')
      : await box.info('BOX STORE', list.join('\n'))

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}