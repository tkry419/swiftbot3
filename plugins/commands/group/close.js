/**
 * SwiftBot - plugins/commands/group/close.js
 * Close Group - vs Bot
 * Supports: close, close 5m, close 2h, close 1d, close status
 * No permission check, specific errors
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

function parseTime(str) {
  if (!str) return null
  const match = str.match(/^(\d+)(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days)$/i)
  if (!match) return null

  const num = parseInt(match[1])
  const unit = match[2].toLowerCase()

  if (unit.startsWith('s')) return num * 1000
  if (unit.startsWith('m')) return num * 60 * 1000
  if (unit.startsWith('h')) return num * 60 * 60 * 1000
  if (unit.startsWith('d')) return num * 24 * 60 * 60 * 1000
  return null
}

function formatTime(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)

  if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`
  if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}

export default {
  name: 'close',
  alias: ['groupclose', 'lock'],
  desc: 'Close group - only admins can chat',
  usage: '[time|status]',
  category: 'Group',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    if (!from.endsWith('@g.us')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Group command only\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    const subCmd = args[0]?.toLowerCase()

    // CHECK STATUS
    if (subCmd === 'status' || subCmd === 'info') {
      const sent = await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *GROUP STATUS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Checking...\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })

      await new Promise(r => setTimeout(r, 800))

      try {
        const groupMeta = await sock.groupMetadata(from)
        const isOpen = groupMeta.announce === false
        const statusText = isOpen? 'Open ✅' : 'Closed 🔒'
        const canChat = isOpen? 'Everyone' : 'Admins only'

        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *GROUP STATUS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Name: ${groupMeta.subject}\n║ Status: ${statusText}\n║ Can chat: ${canChat}\n║ Members: ${groupMeta.participants.length}\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      } catch {
        try {
          await sock.sendMessage(from, {
            edit: sent.key,
            text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed to fetch status\n╚━━━━━━━━━━━━━━━━━═❒`
          })
        } catch {}
      }
      return
    }

    // CLOSE GROUP
    const duration = parseTime(args[0])

    const sent = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *CLOSE GROUP*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ By: ${senderName}\n║\n║ Closing...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    await new Promise(r => setTimeout(r, 1000))

    try {
      await sock.groupSettingUpdate(from, 'announcement')

      let resultText = `╔═━━━━━━━━━━━━━━━━═❒\n║ *CLOSE GROUP*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Status: Closed 🔒\n║ Admins only\n║ By: ${senderName}\n`

      if (duration) {
        resultText += `║\n║ Auto-open: ${formatTime(duration)}\n╚━━━━━━━━━━━━━━━━━═❒`

        // Schedule auto-open
        setTimeout(async () => {
          try {
            await sock.groupSettingUpdate(from, 'not_announcement')
            await sock.sendMessage(from, {
              text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *AUTO OPEN*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Group opened automatically\n║ Time expired\n╚━━━━━━━━━━━━━━━━━═❒`
            })
          } catch {}
        }, duration)
      } else {
        resultText += `╚━━━━━━━━━━━━━━━━━═❒`
      }

      try {
        await sock.sendMessage(from, { edit: sent.key, text: resultText })
      } catch {}

    } catch (error) {
      let errorMsg = 'Unknown error'
      if (error.message.includes('403')) errorMsg = 'Bot is not admin'
      else if (error.message.includes('401')) errorMsg = 'No permission'
      else if (error.message.includes('406')) errorMsg = 'Group creator only'
      else if (error.message.includes('not-authorized')) errorMsg = 'Bot is not admin'

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *CLOSE FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Reason: ${errorMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}