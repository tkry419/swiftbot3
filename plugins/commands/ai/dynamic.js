/**
 * SwiftBot - plugins/commands/ai/botname.js
 * Dynamic Bot Chat - Command name = DB botName
 * Powered by Groq - vs Bot
 */

import axios from 'axios'

export default {
  name: 'dynamicbot', // Fallback, overridden by init()
  desc: 'Chat with AI using your bot name',
  usage: 'question or reply',
  category: 'AI',
  permission: 'all',

  // Called by loader to set dynamic name
  init: async ({ db }) => {
    const botName = await db.get('botName') || 'SwiftBot'
    const commandName = botName.toLowerCase().replace(/[^a-z0-9]/g, '')
    return { name: commandName }
  },

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m

    const botName = await db.get('botName') || 'SwiftBot'
    const commandName = botName.toLowerCase().replace(/[^a-z0-9]/g, '')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || ''
    const prompt = args.join(' ') || quotedText

    if (!prompt) {
      const text = nobox
   ? `Usage:\n${prefix}${commandName} What is AI?\n${prefix}${commandName} Write code`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}${commandName} What is AI?\n║ ${prefix}${commandName} Write code\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    if (!process.env.GROQ_API_KEY) {
      const text = nobox
   ? 'GROQ_API_KEY not set'
        : await box.error('GROQ_API_KEY not set')
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    await sock.sendMessage(from, { react: { text: '🤖', key: m.key } })

    try {
      const systemPrompt = `You are ${botName}, a smart WhatsApp assistant.

Rules:
1. Answer in the user's language. Match exactly.
2. Keep replies short, 2-3 lines max unless user asks for details.
3. Be direct, helpful, and natural.
4. You are ${botName}. Never mention Groq, Llama, or other models.
5. If asked who you are: "I'm ${botName}"
6. If asked what model: "${botName}"
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

      const reply = res.data?.choices?.[0]?.message?.content || `${botName} failed to respond`
      await sock.sendMessage(from, { text: reply }, { quoted: msg })
      await sock.sendMessage(from, { react: { text: '✅', key: m.key } })

    } catch (error) {
      console.log(`${botName} command error:`, error.message)
      await sock.sendMessage(from, { react: { text: '❌', key: m.key } })
      const errorText = nobox? `${botName} Error: ${error.message}` : await box.error(`${botName} service down. Try again.`)
      await sock.sendMessage(from, { text: errorText }, { quoted: msg })
    }
  }
}