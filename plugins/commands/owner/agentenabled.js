export default {
  name: 'agentenable',
  alias: ['aion'],
  desc: 'Enable AI agent',
  usage: '',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box }) => {
    const from = m.key.remoteJid
    await db.set('agentEnabled', true)
    const msg = await box.success('AI Agent enabled')
    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}