/**
 * SwiftBot - plugins/commands/owner/setbotimage.js
 * Set bot image via ImgBB
 * API Key: 17116d43b6e1f987994d38b456a8849b
 */

import axios from 'axios'
import { downloadMediaMessage } from '@whiskeysockets/baileys'

export default {
  name: 'setbotimage',
  alias: ['setimage'],
  desc: 'Set bot image - reply to image',
  usage: '<reply to image>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage

    if (!quoted?.imageMessage) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Reply to an image\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    let msg = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Uploading...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      const buffer = await downloadMediaMessage(
        { message: quoted },
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      )

      const formData = new URLSearchParams()
      formData.append('key', '17116d43b6e1f987994d38b456a8849b')
      formData.append('image', buffer.toString('base64'))

      const res = await axios.post('https://api.imgbb.com/1/upload', formData)
      
      if (!res.data.success) throw new Error()

      await db.set('botimage', res.data.data.url)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Success\n╚━━━━━━━━━━━━━━━━━═❒`,
        edit: msg.key
      })

    } catch {
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Failed\n╚━━━━━━━━━━━━━━━━━═❒`,
        edit: msg.key
      })
    }
  }
}