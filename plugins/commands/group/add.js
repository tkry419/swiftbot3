/**
 * SwiftBot - plugins/commands/group/add.js
 * Add User to Group - vs Bot
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

export default {
  name: 'add',
  alias: ['invite'],
  desc: 'Add user to group',
  usage: 'number',
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

    if (!args[0]) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *ADD USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Usage: ${prefix}add 255712345678\n║ Example: ${prefix}add 255700000000\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const number = args[0].replace(/[^0-9]/g, '')
    if (number.length < 10) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid number\n║ Min: 10 digits\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const targetJid = number + '@s.whatsapp.net'

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *ADD USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Number: +${number}\n║\n║ Adding...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      const result = await sock.groupParticipantsUpdate(from, [targetJid], 'add')
      const status = result[0]?.status

      let resultText = ''
      if (status === '200') {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *ADD USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Number: +${number}\n║ Status: Added ✅\n║ By: ${senderName}\n╚━━━━━━━━━━━━━━━━━═❒`
      } else if (status === '409') {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *ADD USER*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Number: +${number}\n║ Status: Already in group\n╚━━━━━━━━━━━━━━━━━═❒`
      } else if (status === '403') {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *ADD FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: User blocked bot\n║ Or privacy settings\n╚━━━━━━━━━━━━━━━━━═❒`
      } else {
        resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *ADD FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: Unknown error\n║ Code: ${status}\n╚━━━━━━━━━━━━━━━━━═❒`
      }

      try {
        await sock.sendMessage(from, { edit: sent.key, text: resultText })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('408')) errorMsg = 'User left recently'
      else if (error.message.includes('409')) errorMsg = 'User already in group'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *ADD FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}