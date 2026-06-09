/**
 * SwiftBot - plugins/commands/reactions/sleepy.js
 * Sleepy Reaction - Edits 1 emoji → 15 emojis
 * Category: reactions
 * Usage: sleepy
 */

export default {
  name: 'sleepy',
  alias: ['sleep', 'tired', 'zzz'],
  desc: 'Sleepy emoji reaction - 1 to 15 edits',
  usage: 'sleepy',
  category: 'reactions',
  permission: 'all',

  execute: async (sock, m) => {
    const from = m.key.remoteJid
    const emojis = ['😴', '💤', '🌙', '🛏️', '😪', '🥱', '🌛', '⭐', '✨', '🌃', '🛌', '💫', '🌌', '🌠', '😌']
    
    const sentMsg = await sock.sendMessage(from, {
      text: emojis[0]
    }, { quoted: m })

    for (let i = 1; i < emojis.length; i++) {
      await new Promise(r => setTimeout(r, 800))
      const currentEmojis = emojis.slice(0, i + 1).join('')
      try {
        await sock.sendMessage(from, {
          text: currentEmojis,
          edit: sentMsg.key
        })
      } catch (e) { break }
    }
  }
}