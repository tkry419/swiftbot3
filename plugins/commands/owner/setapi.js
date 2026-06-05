export default {
  name: 'setagentapi',
  alias: ['setapi'],
  desc: 'Set Groq API key for AI',
  usage: '<api_key>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, fonts }) => {
    const from = m.key.remoteJid
    const key = args.join(' ')

    if (!key) {
      const msg = await box.error(`Usage: ${fonts.mono('#setagentapi gsk_xxx')}\nGet key: https://console.groq.com/keys`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await db.set('agentApi', key)
    const msg = await box.success('Groq API key saved successfully')
    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}