/**
 * SwiftBot - plugins/commands/channel/post.js
 * Post to channel - supports text, media, reply, captions
 * Uses db keys: channel_${id}_posts, channel_${id}_admins, channel_${id}_owner
 */

export default {
  name: 'post',
  alias: ['send', 'announce'],
  desc: 'Post to a channel - text/media/reply supported',
  usage: '<channel_id> <text> OR reply to media with <channel_id>',
  category: 'channel',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isOwner }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. GET CHANNEL ID
    const channelId = args[0]?.toLowerCase()
    if (!channelId) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴄʜᴀɴɴᴇʟ ɪᴅ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}post <id> <text>
┃➠ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴍᴇᴅɪᴀ: ${prefix}post <id>
┃
┃➠ ${prefix}channel list - ᴠɪᴇᴡ ɪᴅs
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 2. CHECK CHANNEL EXISTS
    const channelList = JSON.parse(await db.get('channel_list') || '[]')
    const channel = channelList.find(ch => ch.id === channelId)

    if (!channel) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ ɴᴏᴛ ғᴏᴜɴᴅ
┃➠ ɪᴅ: ${channelId}
┃➠ ${prefix}channel list
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. CHECK PERMISSION
    const [owner, admins] = await Promise.all([
      db.get(`channel_${channelId}_owner`),
      db.get(`channel_${channelId}_admins`)
    ])
    const adminList = JSON.parse(admins || '[]')

    if (owner!== sender &&!adminList.includes(sender) &&!isOwner) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴏ ᴘᴇʀᴍɪssɪᴏɴ
┃➠ ᴏɴʟʏ ᴄʜᴀɴɴᴇʟ ᴀᴅᴍɪɴs ᴄᴀɴ ᴘᴏsᴛ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. GET CONTENT - TEXT OR REPLY
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const textArgs = args.slice(1).join(' ').trim()

    let postContent = {
      channelId,
      channelName: channel.name,
      by: sender,
      time: Date.now(),
      type: 'text',
      text: '',
      media: null,
      mimetype: null
    }

    // 4a. HANDLE REPLIED MEDIA
    if (quoted) {
      const quotedType = Object.keys(quoted)[0]

      if (quotedType === 'imageMessage') {
        const buffer = await sock.downloadMediaMessage({ message: quoted })
        postContent.type = 'image'
        postContent.media = buffer
        postContent.mimetype = quoted.imageMessage.mimetype
        postContent.text = textArgs || quoted.imageMessage.caption || ''

      } else if (quotedType === 'videoMessage') {
        const buffer = await sock.downloadMediaMessage({ message: quoted })
        postContent.type = 'video'
        postContent.media = buffer
        postContent.mimetype = quoted.videoMessage.mimetype
        postContent.text = textArgs || quoted.videoMessage.caption || ''

      } else if (quotedType === 'audioMessage') {
        const buffer = await sock.downloadMediaMessage({ message: quoted })
        postContent.type = 'audio'
        postContent.media = buffer
        postContent.mimetype = quoted.audioMessage.mimetype
        postContent.text = textArgs || ''

      } else if (quotedType === 'documentMessage') {
        const buffer = await sock.downloadMediaMessage({ message: quoted })
        postContent.type = 'document'
        postContent.media = buffer
        postContent.mimetype = quoted.documentMessage.mimetype
        postContent.fileName = quoted.documentMessage.fileName
        postContent.text = textArgs || quoted.documentMessage.caption || ''

      } else if (quotedType === 'conversation' || quotedType === 'extendedTextMessage') {
        postContent.type = 'text'
        postContent.text = textArgs || quoted.conversation || quoted.extendedTextMessage?.text || ''

      } else {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜɴsᴜᴘᴏʀᴛᴇᴅ ᴍᴇᴅɪᴀ ᴛʏᴘᴇ
┃➠ sᴜᴘᴏʀᴛs: ᴛᴇxᴛ, ɪᴍᴀɢᴇ, ᴠɪᴅᴇᴏ, ᴀᴜᴅɪᴏ, ᴅᴏᴄ
╚═══════════════════╝`
        }, { quoted: m })
      }

    // 4b. HANDLE DIRECT TEXT
    } else {
      if (!textArgs) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴛᴇxᴛ
┃➠ ᴜsᴀɢᴇ: ${prefix}post ${channelId} <text>
┃➠ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴍᴇᴅɪᴀ
╚═══════════════════╝`
        }, { quoted: m })
      }
      postContent.text = textArgs
    }

    // 5. SAVE POST TO DB
    const posts = JSON.parse(await db.get(`channel_${channelId}_posts`) || '[]')

    // Don't save media buffer in DB - too large. Save metadata only
    const dbPost = {
      type: postContent.type,
      text: postContent.text,
      by: postContent.by,
      time: postContent.time,
      mimetype: postContent.mimetype,
      fileName: postContent.fileName || null
    }

    posts.unshift(dbPost) // Add to start
    if (posts.length > 50) posts.pop() // Keep last 50 posts only

    await db.set(`channel_${channelId}_posts`, JSON.stringify(posts))

    // 6. SEND CONFIRMATION
    let confirmText = `╔═〘 ✅ᴘᴏsᴛᴇᴅ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ: ${channel.name}
┃➠ ɪᴅ: ${channelId}
┃➠ ᴛʏᴘᴇ: ${postContent.type.toUpperCase()}
┃
┃➠ ᴘᴏsᴛ ɪᴅ: ${posts.length}
┃➠ ᴛᴏᴛᴀʟ ᴘᴏsᴛs: ${posts.length}
╚═══════════════════╝`

    if (postContent.type === 'text') {
      confirmText += `\n\n📝 ${postContent.text.slice(0, 100)}${postContent.text.length > 100? '...' : ''}`
    }

    await sock.sendMessage(from, { text: confirmText }, { quoted: m })

    // 7. BROADCAST TO CHANNEL MEMBERS - Optional
    const broadcast = args.includes('--broadcast') || args.includes('-b')
    if (broadcast && isGroup) {
      const groupMetadata = await sock.groupMetadata(from)
      const participants = groupMetadata.participants.map(p => p.id)

      let broadcastMsg = `╔═〘 📢${channel.name.toUpperCase()} 〙═╗\n┃\n`

      if (postContent.type === 'text') {
        broadcastMsg += `┃ ${postContent.text}\n`
      } else {
        broadcastMsg += `┃ 📎 ${postContent.type.toUpperCase()} ᴘᴏsᴛᴇᴅ\n`
        if (postContent.text) broadcastMsg += `┃ ᴄᴀᴘᴛɪᴏɴ: ${postContent.text}\n`
      }

      broadcastMsg += `┃\n╚═══════════════════╝`

      // Send media if exists
      if (postContent.media) {
        const msgOptions = { caption: broadcastMsg }
        if (postContent.type === 'image') msgOptions.image = postContent.media
        if (postContent.type === 'video') msgOptions.video = postContent.media
        if (postContent.type === 'audio') msgOptions.audio = postContent.media
        if (postContent.type === 'document') {
          msgOptions.document = postContent.media
          msgOptions.fileName = postContent.fileName
          msgOptions.mimetype = postContent.mimetype
        }
        await sock.sendMessage(from, msgOptions)
      } else {
        await sock.sendMessage(from, { text: broadcastMsg })
      }
    }
  }
}