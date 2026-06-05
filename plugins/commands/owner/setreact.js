export default {
  name: 'setreact',
  alias: ['react'],
  desc: 'Control command reactions - off/custom/random',
  usage: '<off/emoji/random>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const value = args[0]?.toLowerCase()

    if (!value) {
      const [enabled, custom] = await Promise.all([
        db.get('reactEnabled'),
        db.get('reactKey')
      ])
      const status = enabled === false? 'OFF' : custom? `Custom: ${custom}` : 'Random 50 keys'
      const msg = nobox
      ? `React: ${status}\n\nUsage: #setreact off/❤️/random`
        : await box.info('SET REACT', `Status: ${status}\n\nUsage: #setreact off/❤️/random`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    if (value === 'off') {
      await db.set('reactEnabled', false)
      const msg = nobox
      ? 'Reactions disabled ✅'
        : await box.success('Reactions disabled\n\nBot will not react to commands.')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    if (value === 'random') {
      await db.set('reactEnabled', true)
      await db.delete('reactKey')
      const msg = nobox
      ? 'Random reactions enabled ✅\n\nBot will use 50 different emojis.'
        : await box.success('Random reactions enabled\n\nBot will use 50 different emojis.')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // Custom emoji
    await db.set('reactEnabled', true)
    await db.set('reactKey', args[0])
    const msg = nobox
    ? `Custom react set: ${args[0]} ✅`
      : await box.success(`Custom react set: ${args[0]}\n\nBot will always use this emoji.`)

    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}