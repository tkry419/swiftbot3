/**
 * SwiftBot - plugins/commands/ai/ai.js
 * Groq AI Chat - 15 Model Fallbacks + API Key Fallback
 * English only - vs Bot
 */

import axios from 'axios'

// FALLBACK API KEY - Used if .env missing
const GROQ_FALLBACK_KEY = ''

// 15 MODELS - Moja ikifail, nyingine inajaribu
const AI_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
  'llama3-70b-8192',
  'llama3-8b-8192',
  'gemma-7b-it',
  'llama2-70b-4096',
  'mixtral-8x7b-instruct',
  'llama-3.2-90b-text-preview',
  'llama-3.2-11b-text-preview',
  'llama-3.2-3b-preview',
  'llama-3.2-1b-preview',
  'llama-guard-3-8b'
]

async function callGroqAPI(prompt, systemPrompt, model, apiKey) {
  try {
    const res = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
        top_p: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 20000
      }
    )
    return res.data?.choices?.[0]?.message?.content
  } catch {
    return null
  }
}

export default {
  name: 'ai',
  alias: ['ask', 'chat'],
  desc: 'AI chat - 15 model fallbacks',
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
       ? `Usage:\n${prefix}ai What is Kenya?\n${prefix}ai Explain quantum physics\nReply text ${prefix}ai`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}ai What is Kenya?\n║ ${prefix}ai Explain quantum physics\n║ Reply text ${prefix}ai\n╚━━━━━━━━━━━━━━━━━═❒`
      return await sock.sendMessage(from, { text }, { quoted: msg })
    }

    const apiKey = process.env.GROQ_API_KEY || GROQ_FALLBACK_KEY

    await sock.sendMessage(from, {
      react: { text: '🤖', key: m.key }
    })

    try {
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

      let reply = null

      for (const model of AI_MODELS) {
        reply = await callGroqAPI(prompt, systemPrompt, model, apiKey)
        if (reply && reply.trim().length > 5) break
      }

      if (!reply) throw new Error('ALL_AI_MODELS_FAILED')

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
       ? `AI Error: ${error.message}`
        : await box.error(`AI service down. Try again.`)

      await sock.sendMessage(from, { text: errorText }, { quoted: msg })
    }
  }
}