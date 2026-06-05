export default {
  name: 'setagentmodel',
  alias: ['setmodel'],
  desc: 'Set Groq AI model',
  usage: '<model_name>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, fonts }) => {
    const from = m.key.remoteJid
    const model = args[0]

    if (!model) {
      const msg = await box.text(`*Available models:*\n\n• llama3-70b-8192\n• llama3-8b-8192\n• mixtral-8x7b-32768\n• gemma-7b-it\n\nUsage: ${fonts.mono('#setagentmodel llama3-70b-8192')}`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    await db.set('agentModel', model)
    const msg = await box.success(`AI model set to: ${model}`)
    await sock.sendMessage(from, { text: msg }, { quoted: m })
  }
}