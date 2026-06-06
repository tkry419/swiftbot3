/**
 * SwiftBot - plugins/commands/ai/pleysteristly.js
 * Pleysteristly AI - Powered by Groq
 * English only - vs Bot
 */

import axios from 'axios'

export default {
  name: 'pleysteristly',
  alias: ['playai', 'pley'],
  desc: 'Pleysteristly AI chat powered by Groq',
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
      ? `Usage:\n${prefix}pleysteristly What is AI?\nReply text ${prefix}pley`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}pleysteristly What is AI?\n║ Reply text ${prefix}pley\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    if (!process.env.GROQ_API_KEY) {
      const text = nobox
      ? 'GROQ_API_KEY not set in environment'
        : await box.error('GROQ_API_KEY not set in environment')
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    await sock.sendMessage(from, {
      react: { text: '🤖', key: m.key }
    })

    try {
      const systemPrompt = `You are Pleysteristly AI, a smart WhatsApp assistant.

Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies short, 2-3 lines max unless user asks for details.
3. Be direct, helpful, and natural.
4. You are Pleysteristly AI. Never mention Groq, Llama, or other models.
5. If asked who you are: "I'm Pleysteristly AI"
6. If asked what model: "Pleysteristly AI"
7. No disclaimers unless dangerous.`

      const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: 'llama-3.3-70b-versatile',
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

      const reply = res.data?.choices?.[0]?.message?.content || 'Pleysteristly AI failed to respond'

      await sock.sendMessage(from, { text: reply }, { quoted: msg })
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (error) {
      console.log('Pleysteristly command error:', error.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      const errorText = nobox ? `Pleysteristly Error: ${error.message}` : await box.error(`Pleysteristly service down. Try again.`)
      await sock.sendMessage(from, { text: errorText }, { quoted: msg })
    }
  }
}