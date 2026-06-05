/**
 * SwiftBot - plugins/commands/ai/gpt.js
 * AI Chat using Groq API — Real-time from DB
 */

export default {
  name: 'gpt',
  alias: ['ai', 'ask'],
  desc: 'Ask AI anything using Groq',
  usage: '<question>',
  category: 'ai',
  permission: 'all',

  execute: async (sock, m, args, { db, box, fonts, logger }) => {
    const from = m.key.remoteJid
    const question = args.join(' ')

    if (!question) {
      const msg = await box.error(`Usage: ${fonts.mono(await db.get('prefix') + 'gpt <question>')}`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // Check if agent enabled
    const [agentEnabled, apiKey, model, systemPrompt] = await Promise.all([
      db.get('agentEnabled'),
      db.get('agentApi'),
      db.get('agentModel'),
      db.get('agentSystem')
    ])

    if (!agentEnabled ||!apiKey) {
      const msg = await box.error('AI is disabled. Owner: use #setagentapi <key> and #agentenable')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // React processing
    await sock.sendMessage(from, { react: { text: '🤖', key: m.key } })

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model || 'llama3-70b-8192',
          messages: [
            { role: 'system', content: systemPrompt || 'You are SwiftBot, a helpful WhatsApp assistant.' },
            { role: 'user', content: question }
          ],
          temperature: 0.7,
          max_tokens: 1024
        })
      })

      if (!response.ok) throw new Error(`Groq API: ${response.status}`)

      const data = await response.json()
      const answer = data.choices[0].message.content

      const msg = await box.reply(answer, `Powered by ${model || 'llama3-70b'}`)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (e) {
      logger.error('GPT', 'API failed', e.message)
      const msg = await box.error(`AI failed: ${e.message}`)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
    }
  }
}