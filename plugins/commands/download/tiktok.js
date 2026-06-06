/**
 * SwiftBot - plugins/commands/download/tiktok.js
 * TikTok Downloader - 15 Online APIs
 * No Watermark - English only - vs Bot
 */

import fetch from 'node-fetch'
import axios from 'axios'

const TIKTOK_APIS = [
  { url: 'https://api.tikmate.app/api/lookup', type: 'tikmate' },
  { url: 'https://api.dlpanda.com/tiktok', type: 'dlpanda' },
  { url: 'https://api.tiklydown.eu.org/api/download', type: 'tiklydown' },
  { url: 'https://api.tikdown.org/api', type: 'tikdown' },
  { url: 'https://api.ssstik.io/api/convert', type: 'ssstik' },
  { url: 'https://api.tikwm.com/api', type: 'tikwm' },
  { url: 'https://api.snaptik.app/api', type: 'snaptik' },
  { url: 'https://api.musicaldown.com/api', type: 'musical' },
  { url: 'https://api.tikvid.io/api/ajaxSearch', type: 'tikvid' },
  { url: 'https://api.savefrom.net/api/convert', type: 'savefrom' },
  { url: 'https://api.loveft.com/api/tiktok', type: 'loveft' },
  { url: 'https://api.tikcdn.io/ssstik', type: 'tikcdn' },
  { url: 'https://api.vevioz.com/api/button/mp4', type: 'vevioz' },
  { url: 'https://api.tikdd.cc/api/download', type: 'tikdd' },
  { url: 'https://api.tikfinity.com/api/convert', type: 'tikfinity' }
]

async function downloadTikTok(url, api) {
  try {
    let apiUrl = ''
    let options = { method: 'GET' }

    if (api.type === 'tikmate') {
      apiUrl = `${api.url}?url=${encodeURIComponent(url)}`
    } else if (api.type === 'dlpanda') {
      apiUrl = api.url
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      }
    } else if (api.type === 'tiklydown') {
      apiUrl = `${api.url}?url=${encodeURIComponent(url)}`
    } else {
      apiUrl = `${api.url}?url=${encodeURIComponent(url)}`
    }

    const res = await fetch(apiUrl, options)
    if (!res.ok) return null
    const data = await res.json()

    // Parse different responses
    let videoUrl = null
    let title = 'TikTok Video'
    let author = 'Unknown'

    if (data.token) videoUrl = `https://tikmate.app/download/${data.token}/${data.id}.mp4`
    else if (data.data?.video) videoUrl = data.data.video
    else if (data.data?.play) videoUrl = data.data.play
    else if (data.video?.nowm) videoUrl = data.video.nowm
    else if (data.play) videoUrl = data.play
    else if (data.mp4) videoUrl = data.mp4
    else if (data.downloadUrl) videoUrl = data.downloadUrl
    else if (data.url) videoUrl = data.url
    else if (data.result?.url) videoUrl = data.result.url
    else if (data.link) videoUrl = data.link

    if (data.data?.title) title = data.data.title
    else if (data.title) title = data.title
    else if (data.desc) title = data.desc

    if (data.data?.author?.nickname) author = data.data.author.nickname
    else if (data.author) author = data.author

    if (!videoUrl) return null

    return { videoUrl, title, author }
  } catch {
    return null
  }
}

export default {
  name: 'tiktok',
  alias: ['tt', 'tiktokdl', 'tiktoknowm'],
  desc: 'TikTok downloader - 15 fallbacks',
  usage: 'url or reply link',
  category: 'Download',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let url = args[0] || quotedText

    if (!url) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}tiktok https://vm.tiktok.com/...\n║ Reply link ${prefix}tiktok\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (!url.includes('tiktok.com') &&!url.includes('vm.tiktok')) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid TikTok URL\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let result = null

      // Try all 15 APIs
      for (const api of TIKTOK_APIS) {
        result = await downloadTikTok(url, api)
        if (result && result.videoUrl) break
      }

      if (!result) throw new Error('DOWNLOAD_FAILED')

      await sock.sendMessage(from, {
        video: { url: result.videoUrl },
        caption: `╔═━━━━━━━━━━━━━━━━═❒\n║ *TIKTOK DOWNLOADED*\n╚━━━━━━━━━━━━━━━━━═❒\n\n📝 Title: ${result.title.slice(0, 100)}\n👤 Author: ${result.author}\n✅ No Watermark`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Download failed\n║ Try another link\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}