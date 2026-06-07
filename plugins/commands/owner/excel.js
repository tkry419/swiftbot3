/**
 * SwiftBot - plugins/commands/owner/exec.js
 * Execute Shell Commands - DANGEROUS
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

import { exec } from 'child_process'
import util from 'util'
const execPromise = util.promisify(exec)

export default {
  name: 'exec',
  alias: ['shell', '$', 'terminal'],
  desc: 'Execute shell commands',
  usage: '<command>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox, body, prefix, cmdName }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    let cmd = body.slice(prefix.length + cmdName.length).trim()
    if (!cmd) {
      const msg = nobox
  ? `Exec: Provide shell command\n\nUsage: ${prefix}exec ls -la`
        : await box.error(`Provide shell command\n\nUsage: ${prefix}exec ls -la`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    const sent = await sock.sendMessage(from, {
      text: nobox
  ? `Executing: ${cmd}\n\nBy: ${senderName}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *EXEC*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║ Cmd: ${cmd}\n║\n║ Running...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      const { stdout, stderr } = await execPromise(cmd, { timeout: 30000 })
      let output = stdout || stderr || 'No output'
      if (output.length > 4000) output = output.slice(0, 4000) + '\n\n...truncated'

      await sock.sendMessage(from, {
        edit: sent.key,
        text: nobox
    ? `$ ${cmd}\n\n${output}`
          : `╔═━━━━━━━━━━━━━━━━═❒\n║ *EXEC RESULT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ $ ${cmd}\n║\n║ ${output}\n╚━━━━━━━━━━━━━━━━━═❒`
      })

    } catch (error) {
      await sock.sendMessage(from, {
        edit: sent.key,
        text: nobox
    ? `$ ${cmd}\n\nError:\n${error.message}`
          : `╔═━━━━━━━━━━━━━━━━═❒\n║ *EXEC ERROR*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ $ ${cmd}\n║\n║ Error:\n║ ${error.message}\n╚━━━━━━━━━━━━━━━━━═❒`
      })
    }
  }
}