/**
 * SwiftBot - plugins/commands/owner/setbotimage.js
 * Set bot image with silent fallbacks - Clean mode
 * Hardcoded boxes - No box.js dependency
 */

import axios from 'axios'
import { downloadMediaMessage } from '@whiskeysockets/baileys'
import FormData from 'form-data'

const UPLOADERS = [
  async (buffer) => {
    const form = new URLSearchParams()
    form.append('key', '17116d43b6e1f987994d38b456a8849b')
    form.append('image', buffer.toString('base64'))
    const { data } = await axios.post('https://api.imgbb.com/1/upload', form, { timeout: 20000 })
    if (!data.success) throw new Error()
    return data.data.url
  },
  async (buffer) => {
    const form = new FormData()
    form.append('reqtype', 'fileupload')
    form.append('fileToUpload', buffer, 'image.jpg')
    const { data } = await axios.post('https://catbox.moe/user/api.php', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data || data.startsWith('ERROR')) throw new Error()
    return data.trim()
  },
  async (buffer) => {
    const form = new FormData()
    form.append('source', buffer, 'image.jpg')
    form.append('type', 'file')
    form.append('action', 'upload')
    form.append('key', '6d207e02198a847aa98d0a2a901485a5')
    const { data } = await axios.post('https://freeimage.host/api/1/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.image?.url) throw new Error()
    return data.image.url
  },
  async (buffer) => {
    const { data } = await axios.post('https://api.imgur.com/3/image', {
      image: buffer.toString('base64'),
      type: 'base64'
    }, {
      headers: { Authorization: 'Client-ID 546c25a59c58ad7' },
      timeout: 20000
    })
    if (!data.success) throw new Error()
    return data.data.link
  },
  async (buffer) => {
    const form = new FormData()
    form.append('file', buffer, 'image.jpg')
    const { data } = await axios.post('https://telegra.ph/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data[0]?.src) throw new Error()
    return 'https://telegra.ph' + data[0].src
  },
  async (buffer) => {
    const { data } = await axios.post('https://api.upload.io/v2/accounts/12a1f3/buckets/default/files/base64', {
      file: { name: 'image.jpg', data: buffer.toString('base64') }
    }, { timeout: 20000 })
    if (!data.fileUrl) throw new Error()
    return data.fileUrl
  },
  async (buffer) => {
    const form = new FormData()
    form.append('file', buffer, 'image.jpg')
    form.append('userkey', '4d8d3a8c8c3c')
    const { data } = await axios.post('https://vgy.me/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.image) throw new Error()
    return data.image
  },
  async (buffer) => {
    const form = new URLSearchParams()
    form.append('key', '76b3b1e7c1e1f8b1e1c1f8b1e1c1f8b1')
    form.append('image', buffer.toString('base64'))
    const { data } = await axios.post('https://api.imgbb.com/1/upload', form, { timeout: 20000 })
    if (!data.success) throw new Error()
    return data.data.url
  },
  async (buffer) => {
    const form = new FormData()
    form.append('upload', buffer, 'image.jpg')
    form.append('gallery', '0')
    const { data } = await axios.post('https://postimages.org/json', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.url) throw new Error()
    return data.url
  },
  async (buffer) => {
    const form = new FormData()
    form.append('file', buffer, 'image.jpg')
    const { data } = await axios.post('https://pasteboard.co/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.link) throw new Error()
    return data.link
  },
  async (buffer) => {
    const form = new FormData()
    form.append('file', buffer, 'image.jpg')
    const { data } = await axios.post('https://api.imghippo.com/v1/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.data?.url) throw new Error()
    return data.data.url
  },
  async (buffer) => {
    const form = new FormData()
    form.append('image', buffer, 'image.jpg')
    form.append('adult', 'false')
    const { data } = await axios.post('https://api.imagebam.com/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.direct_link) throw new Error()
    return data.direct_link
  },
  async (buffer) => {
    const form = new FormData()
    form.append('file', buffer, 'image.jpg')
    const { data } = await axios.post('https://upload.ee/api/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.url) throw new Error()
    return data.url
  },
  async (buffer) => {
    const form = new FormData()
    form.append('file', buffer, 'image.jpg')
    const { data } = await axios.post('https://api.bayfiles.com/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.data?.file?.url?.full) throw new Error()
    return data.data.file.url.full
  },
  async (buffer) => {
    const form = new FormData()
    form.append('file', buffer, 'image.jpg')
    const { data } = await axios.post('https://api.anonfiles.com/upload', form, { headers: form.getHeaders(), timeout: 20000 })
    if (!data.data?.file?.url?.full) throw new Error()
    return data.data.file.url.full
  }
]

export default {
  name: 'setbotimage',
  alias: ['setimage', 'setpp'],
  desc: 'Set bot image',
  usage: '<reply to image>',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, logger }) => {
    const from = m.key.remoteJid
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
                   m.message?.imageMessage

    if (!quoted?.imageMessage &&!m.message?.imageMessage) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ Reply to an image
╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    let msg = await sock.sendMessage(from, {
      text: `╔═━━━━━━━━━━━━━━━━═❒
║ Uploading...
╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      const messageToDownload = quoted?.imageMessage? { message: quoted } : m
      const buffer = await downloadMediaMessage(
        messageToDownload,
        'buffer',
        {},
        { reuploadRequest: sock.updateMediaMessage }
      )

      if (!buffer || buffer.length === 0) throw new Error('Download failed')

      let imageUrl = null

      // Silent fallback - no user spam
      for (let i = 0; i < UPLOADERS.length; i++) {
        try {
          imageUrl = await UPLOADERS[i](buffer)
          break
        } catch (err) {
          if (i === UPLOADERS.length - 1) throw new Error('Upload failed')
        }
      }

      if (!imageUrl) throw new Error('No URL returned')

      await db.set('botimage', imageUrl)

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ Bot image updated
╚━━━━━━━━━━━━━━━━━═❒`,
        edit: msg.key
      })

    } catch (err) {
      logger.error('SETBOTIMAGE', 'Failed', err.message)
      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒
║ Failed to set image
╚━━━━━━━━━━━━━━━━━═❒`,
        edit: msg.key
      })
    }
  }
}