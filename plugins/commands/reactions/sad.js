/**
 * SwiftBot - plugins/commands/reactions/sad.js
 * Sad Reaction - Edits 1 emoji → 15 emojis
 * Category: reactions
 * Usage: sad
 */

export default {
  name: 'sad',
  alias: ['cry', 'sob'],
  desc: 'Sad emoji reaction - 1 to 15 edits',
  usage: 'sad',
  category: 'reactions',
  permission: 'all',

  execute: async (sock, m) => {
    const from = m.key.remoteJid
    const emojis = ['😢', '😭', '💔', '😔', '🥺', '😿', '💧', '🌧️', '☔', '😞', '😥', '🙁', '😟', '💙', '🌊']
    
    // SEND FIRST EMOJI
    const sentMsg = await sock.sendMessage(from, {
      text: emojis[0]
    }, { quoted: m })

    // EDIT TO ADD EMOJIS UP TO 15
    for (let i = 1; i < emojis.length; i++) {
      await new Promise(r => setTimeout(r, 800)) // 800ms delay
      const currentEmojis = emojis.slice(0, i + 1).join('')
      try {
        await sock.sendMessage(from, {
          text: currentEmojis,
          edit: sentMsg.key
        })
      } catch (e) {
        break // Stop if edit fails
      }
    }
  }
}