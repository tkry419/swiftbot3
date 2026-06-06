/**
 * SwiftBot - plugins/commands/ai/meta.js
 * Meta AI Chat - Powered by Groq
 * English only - vs Bot
 */

import axios from 'axios'

export default {
  name: 'meta',
  alias: ['llama', 'metaai'],
  desc: 'Meta AI chat powered by Groq',
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
      ? `Usage:\n${prefix}meta What is AI?\n${prefix}meta Write code\nReply text ${prefix}meta`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}meta What is AI?\n║ ${prefix}meta Write code\n║ Reply text ${prefix}meta\n╚━━━━━━━━━━━━━━━━━═❒`
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
      const systemPrompt = `You are Meta AI, a smart WhatsApp assistant.

Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies short, 2-3 lines max unless user asks for details.
3. Be direct, helpful, and natural.
4. You are Meta AI. Never mention Groq or other providers.
5. If asked who you are: "I'm Meta AI"
6. If asked what model: "Meta AI"
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

      const reply = res.data?.choices?.[0]?.message?.content || 'Meta AI failed to respond'

      await sock.sendMessage(from, { text: reply }, { quoted: msg })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch (error) {
      console.log('Meta AI command error:', error.message)

      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      const errorMsg = error.response?.data?.error?.message || error.message
      const errorText = nobox
      ? `Meta AI Error: ${errorMsg}`
        : await box.error(`Meta AI service down. Try again.`)

      await sock.sendMessage(from, { text: errorText }, { quoted: msg })
    }
  }
}