/**
 * SwiftBot - plugins/commands/group/poll.js
 * Create Group Poll - vs Bot
 * Usage: poll question | option1 | option2 | option3
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'poll',
  alias: ['vote', 'createpoll'],
  desc: 'Create a poll in group',
  usage: 'question | option1 | option2',
  category: 'Group',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)
    const prefix = await db.get('prefix')

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Group command only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const fullText = args.join(' ')
    if (!fullText.includes('|')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *CREATE POLL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}poll question | opt1 | opt2\n║ Example: ${prefix}poll Best day? | Monday | Friday\n║ Min: 2 options, Max: 12 options\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const parts = fullText.split('|').map(p => p.trim()).filter(p => p)
    if (parts.length < 3) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Need question + 2 options minimum\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (parts.length > 13) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Max 12 options allowed\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const question = parts[0]
    const options = parts.slice(1)

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *CREATE POLL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ By: ${senderName}\n║\n║ Creating...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 800))

    try {
      await sock.sendMessage(from, {
        poll: {
          name: question,
          values: options,
          selectableCount: 1
        }
      })

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *POLL CREATED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Question: ${question}\n║ Options: ${options.length}\n║ Status: Active ✅\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *POLL FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}