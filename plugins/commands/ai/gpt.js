/**
 * SwiftBot - plugins/commands/ai/ai.js
 * Groq AI Chat - Works with router.js
 * English only - vs Bot
 */

import axios from 'axios'

export default {
  name: 'ai',
  alias: ['gpt', 'ask', 'chat'],
  desc: 'AI chat powered by Groq',
  usage: 'question or reply',
  category: 'AI',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, nobox, box, isOwner }) => {
    const from = m.key.remoteJid
    const msg = m

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let prompt = args.join(' ') || quotedText

    if (!prompt) {
      const text = `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}ai What is Kenya?\n║ ${prefix}ai Explain quantum physics\n║ Reply text ${prefix}ai\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    // Check if Groq API key exists
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
      // Get bot info from DB
      const [botName, ownerName, ownerNumber] = await Promise.all([
        db.get('botName'),
        db.get('ownerName'),
        db.get('owner')
      ])

      const systemPrompt = `You are ${botName || 'SwiftBot'}, a smart WhatsApp assistant created by ${ownerName || 'Owner'}.

Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies short, 2-3 lines max unless user asks for details.
3. Be direct, helpful, and natural.
4. Never say "As an AI". You are ${botName || 'SwiftBot'}.
5. If asked who made you: "${ownerName || 'Owner'}"
6. If asked your number: "${ownerNumber || 'I don\'t have a public number'}"
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
          max_tokens: 800
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
          },
          timeout: 20000
        }
      )

      const reply = res.data?.choices?.[0]?.message?.content || 'AI failed to respond'

      await sock.sendMessage(from, { text: reply }, { quoted: msg })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (error) {
      console.log('AI command error:', error.message)

      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      const errorText = nobox
       ? `AI Error: ${error.response?.data?.error?.message || error.message}`
        : await box.error(`AI Error: ${error.response?.data?.error?.message || 'Service down'}`)

      await sock.sendMessage(from, { text: errorText }, { quoted: msg })
    }
  }
}