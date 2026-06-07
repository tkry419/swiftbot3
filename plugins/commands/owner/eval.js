/**
 * SwiftBot - plugins/commands/owner/eval.js
 * Evaluate JavaScript Code - vs Bot
 * Owner only, dangerous command
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

import util from 'util'

export default {
  name: 'eval',
  alias: ['ev', 'e', '>'],
  desc: 'Evaluate JavaScript code',
  usage: '<code>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox, prefix, sender, from, isGroup, isOwner, cmdName, body }) => {
    const senderName = getName(m, sender)

    let code = body.slice(prefix.length + cmdName.length).trim()
    if (!code) {
      const msg = nobox
   ? `Eval: Provide JavaScript code\n\nUsage: ${prefix}eval 2+2`
        : await box.error(`Provide JavaScript code\n\nUsage: ${prefix}eval 2+2`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    // Remove code block markers
    if (code.startsWith('```') && code.endsWith('```')) {
      code = code.slice(3, -3).trim()
      if (code.startsWith('js')) code = code.slice(2).trim()
    }

    const sent = await sock.sendMessage(from, {
      text: nobox
   ? `Evaluating...\n\nBy: ${senderName}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *EVAL*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║\n║ Executing...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      let result = await eval(`(async () => { ${code} })()`)

      if (typeof result!== 'string') {
        result = util.inspect(result, { depth: 2, maxArrayLength: 100 })
      }

      const output = result.length > 4000? result.slice(0, 4000) + '\n\n...truncated' : result

      await sock.sendMessage(from, {
        edit: sent.key,
        text: nobox
     ? `Input:\n${code}\n\nOutput:\n${output}`
          : `╔═━━━━━━━━━━━━━━━━═❒\n║ *EVAL RESULT*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Input:\n║ ${code}\n║\n║ Output:\n║ ${output}\n╚━━━━━━━━━━━━━━━━━═❒`
      })

    } catch (error) {
      const errMsg = error.message || error.toString()

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: nobox
       ? `Input:\n${code}\n\nError:\n${errMsg}`
            : `╔═━━━━━━━━━━━━━━━━═❒\n║ *EVAL ERROR*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Input:\n║ ${code}\n║\n║ Error:\n║ ${errMsg}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}