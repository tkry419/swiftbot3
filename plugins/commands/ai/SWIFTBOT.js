/**
 * SwiftBot - plugins/commands/ai/botname.js
 * Dynamic Bot Chat - Powered by Groq
 * Name comes from DB - vs Bot
 */

import axios from 'axios'

// Get botName for command registration
const getBotCommand = async (db) => {
  const botName = await db.get('botName') || 'SwiftBot'
  return botName.toLowerCase().replace(/\s+/g, '')
}

export default {
  name: 'swiftbot', // This will be overridden in loader
  desc: 'Dynamic bot chat - uses your bot name',
  usage: 'question or reply',
  category: 'AI',
  permission: 'all',

  // Override name dynamically
  init: async ({ db }) => {
    const botName = await db.get('botName') || 'SwiftBot'
    const commandName = botName.toLowerCase().replace(/\s+/g, '')
    return { name: commandName, alias: [commandName] }
  },

  execute: async (sock, m, args, { db, prefix, nobox, box }) => {
    const from = m.key.remoteJid
    const msg = m

    const botName = await db.get('botName') || 'SwiftBot'
    const commandName = botName.toLowerCase().replace(/\s+/g, '')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || quoted?.imageMessage?.caption || ''

    let prompt = args.join(' ') || quotedText

    if (!prompt) {
      const text = nobox
     ? `Usage:\n${prefix}${commandName} What is AI?\n${prefix}${commandName} Write code\nReply text ${prefix}${commandName}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}${commandName} What is AI?\n║ ${prefix}${commandName} Write code\n║ Reply text ${prefix}${commandName}\n╚━━━━━━━━━━━━━━━━━═❒`
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