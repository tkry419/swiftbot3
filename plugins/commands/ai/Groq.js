/**
 * SwiftBot - plugins/commands/ai/groq.js
 * Groq AI Chat - Official
 * English only - vs Bot
 */

import axios from 'axios'

export default {
  name: 'groq',
  alias: ['groqai', 'groqchat'],
  desc: 'Groq AI chat',
  usage: 'question or reply',
  category: 'AI',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || ''

    let prompt = args.join(' ') || quotedText

    if (!prompt) {
      const text = nobox
      ? `Usage:\n${prefix}groq What is AI?\nReply text ${prefix}groq`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}groq What is AI?\n║ Reply text ${prefix}groq\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    if (!process.env.GROQ_API_KEY) {
      const text = nobox
      ? 'GROQ_API_KEY not set in environment'
        : await box.error('GROQ_API_KEY not set in environment')
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '⚡', key: m.key }
    })

    try {
      const systemPrompt = `You are Groq AI, a fast WhatsApp assistant.

Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies short, 2-3 lines max unless user asks for details.
3. Be direct, helpful, and natural.
4. You are Groq AI.
5. If asked who you are: "I'm Groq AI"
6. If asked what model: "Groq AI"
7. No disclaimers unless dangerous.`

      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.1-8b-instant',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          timeout: 30000
        }
      )

      const reply = res.data?.choices?.[0]?.message?.content || 'Groq AI failed to respond'

      await sock.sendMessage(from, { text: reply }, { quoted: msg })
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (error) {
      console.log('Groq command error:', error.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      const errorText = nobox ? `Groq Error: ${error.message}` : await box.error(`Groq service down. Try again.`)
      await sock.sendMessage(from, { text: errorText }, { quoted: msg })
    }
  }
}