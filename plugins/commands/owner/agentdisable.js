export default {
  name: 'agentdisable',
  alias: ['aioff'],
  desc: 'Disable AI agent',
  usage: '',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box }) => {
    const from = m.key.remoteJid
    await db.set('agentEnabled', false)
    const msg = await box.success('AI Agent disabled')
    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}