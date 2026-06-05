export default {
  name: 'previewbox',
  alias: ['testbox'],
  desc: 'Preview a box style without changing',
  usage: '<1-30>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const styleId = args[0]
    const styles = box.getStyles()

    if (!styleId ||!styles[styleId]) {
      const msg = nobox
       ? 'Usage: #previewbox 20\n\nPreview styles 1-30'
        : await box.error('Usage: #previewbox 20\n\nPreview styles 1-30')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // Build preview with selected style
    const style = styles[styleId]
    const previewLines = [
      'This is a preview',
      '',
      'Style: ' + style.name,
      '',
      '✅ Success message',
      '❌ Error message',
      'ℹ️ Info message'
    ]

    let preview
    if (styleId === 'none') {
      preview = previewLines.join('\n')
    } else {
      const top = style.top
      const bottom = style.bottom
      const middle = previewLines.map(line => `${style.line}${line}`)
      preview = [top,...middle, bottom].join('\n')
    }

    const msg = nobox
     ? `Preview Style ${styleId} - ${style.name}:\n\n${preview}\n\nUse #changebox ${styleId} to apply`
      : await box.info(`PREVIEW ${style.name}`, `${preview}\n\nUse #changebox ${styleId} to apply`)

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}