/**
 * SwiftBot - plugins/commands/channel/post.js
 * Post to channel - supports text/media/reply + channelJid
 * Uses db keys: channel_${id}_posts, channel_${id}_admins, channel_${id}_jid
 */

export default {
  name: 'post',
  alias: ['send', 'announce'],
  desc: 'Post to a channel - text/media/reply + WhatsApp Channel JID supported',
  usage: '<channel_id|channelJid> <text> OR reply to media',
  category: 'channel',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isOwner }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. GET CHANNEL ID OR JID
    const target = args[0]?.toLowerCase()
    if (!target) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴄʜᴀɴɴᴇʟ ɪᴅ/ᴊɪᴅ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}post <id> <text>
┃➠ ᴜsᴀɢᴇ: ${prefix}post <channelJid> <text>
┃➠ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴍᴇᴅɪᴀ
┃
┃➠ ${prefix}channel list - ᴠɪᴇᴡ ɪᴅs
╚═══════════════════╝`
      }, { quoted: m })
    }

    let channelId = null
    let channelJid = null
    let channel = null
    let isWhatsAppChannel = false

    // Check if it's a WhatsApp Channel JID or Group JID
    if (target.includes('@newsletter') || target.includes('@g.us')) {
      channelJid = target
      isWhatsAppChannel = true
      channel = { id: channelJid, name: 'WhatsApp Channel' }
    } else {
      // Check local channel DB
      channelId = target
      const channelList = JSON.parse(await db.get('channel_list') || '[]')
      channel = channelList.find(ch => ch.id === channelId)

      if (!channel) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄʜᴀɴᴇʟ ɴᴏᴛ ғᴏᴜɴᴅ
┃➠ ɪᴅ: ${channelId}
┃➠ ${prefix}channel list
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Get linked WhatsApp Channel JID if exists
      channelJid = await db.get(`channel_${channelId}_jid`)
    }

    // 2. CHECK PERMISSION FOR LOCAL CHANNELS
    if (!isWhatsAppChannel) {
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
    } else {
      // For WhatsApp Channels, only bot owner can post
      if (!isOwner) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏɴʟʏ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴘᴏsᴛ ᴛᴏ ᴡʜᴀᴛsᴀᴘᴘ ᴄʜᴀɴᴇʟs
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. GET CONTENT - TEXT OR REPLY
    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const textArgs = args.slice(1).join(' ').trim()

    let postContent = {
      channelId: channel.id,
      channelName: channel.name,
      by: sender,
      time: Date.now(),
      type: 'text',
      text: '',
      media: null,
      mimetype: null,
      fileName: null
    }

    // 3a. HANDLE REPLIED MEDIA
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

    // 3b. HANDLE DIRECT TEXT
    } else {
      if (!textArgs) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴛᴇxᴛ
┃➠ ᴜsᴀɢᴇ: ${prefix}post ${target} <text>
┃➠ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴍᴇᴅɪᴀ
╚═══════════════════╝`
        }, { quoted: m })
      }
      postContent.text = textArgs
    }

    // 4. SAVE POST TO DB FOR LOCAL CHANNELS
    if (!isWhatsAppChannel) {
      const posts = JSON.parse(await db.get(`channel_${channelId}_posts`) || '[]')
      const dbPost = {
        type: postContent.type,
        text: postContent.text,
        by: postContent.by,
        time: postContent.time,
        mimetype: postContent.mimetype,
        fileName: postContent.fileName || null
      }
      posts.unshift(dbPost)
      if (posts.length > 50) posts.pop()
      await db.set(`channel_${channelId}_posts`, JSON.stringify(posts))
    }

    // 5. SEND TO WHATSAPP CHANNEL/GROUP IF JID EXISTS
    const targetJid = channelJid || from
    let caption = postContent.text

    if (postContent.type === 'text') {
      await sock.sendMessage(targetJid, { text: postContent.text })
    } else {
      const msgOptions = { caption: caption || undefined }
      if (postContent.type === 'image') msgOptions.image = postContent.media
      if (postContent.type === 'video') msgOptions.video = postContent.media
      if (postContent.type === 'audio') msgOptions.audio = postContent.media
      if (postContent.type === 'document') {
        msgOptions.document = postContent.media
        msgOptions.fileName = postContent.fileName
        msgOptions.mimetype = postContent.mimetype
      }
      await sock.sendMessage(targetJid, msgOptions)
    }

    // 6. SEND CONFIRMATION
    const posts = isWhatsAppChannel? [] : JSON.parse(await db.get(`channel_${channelId}_posts`) || '[]')
    return await sock.sendMessage(from, {
      text: `╔═〘 ✅ᴘᴏsᴛᴇᴅ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ: ${channel.name}
┃➠ ᴛᴏ: ${isWhatsAppChannel? 'WhatsApp Channel' : 'Local DB'}
┃➠ ᴛʏᴘᴇ: ${postContent.type.toUpperCase()}
┃
┃➠ ${isWhatsAppChannel? 'sᴇɴᴛ' : `ᴘᴏsᴛ ɪᴅ: ${posts.length}`}
╚═══════════════════╝`
    }, { quoted: m })
  }
}