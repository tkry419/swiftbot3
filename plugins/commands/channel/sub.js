/**
 * SwiftBot - plugins/commands/channel/subscribe.js
 * Channel Subscription System - Users can join/leave channels
 * Category: channel
 * Uses db keys: channel_${id}_subscribers, user_${user}_subscriptions
 */

export default {
  name: 'subscribe',
  alias: ['sub', 'join', 'follow'],
  desc: 'Subscribe to channels and view posts',
  usage: 'join <id> | leave <id> | list | posts <id> | all',
  category: 'channel',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()

    // 1. JOIN/SUBSCRIBE TO CHANNEL
    if (subCmd === 'join') {
      const channelId = args[1]
      if (!channelId) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴄʜᴀɴɴᴇʟ ɪᴅ
┃➠ ᴜsᴀɢᴇ: ${prefix}subscribe join <id>
┃➠ ᴇx: ${prefix}subscribe join updates_1234
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelList = JSON.parse(await db.get('channel_list') || '[]')
      const channel = channelList.find(ch => ch.id === channelId)

      if (!channel) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ ɴᴏᴛ ғᴏᴜɴᴅ
┃➠ ɪᴅ: ${channelId}
╚═══════════════════╝`
        }, { quoted: m })
      }

      const subscribers = JSON.parse(await db.get(`channel_${channelId}_subscribers`) || '[]')
      const userSubs = JSON.parse(await db.get(`user_${sender}_subscriptions`) || '[]')

      if (subscribers.includes(sender)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ sᴜʙsᴄʀɪʙᴇᴅ
┃➠ ᴄʜᴀɴɴᴇʟ: ${channel.name}
╚═══════════════════╝`
        }, { quoted: m })
      }

      subscribers.push(sender)
      userSubs.push(channelId)

      await Promise.all([
        db.set(`channel_${channelId}_subscribers`, JSON.stringify(subscribers)),
        db.set(`user_${sender}_subscriptions`, JSON.stringify(userSubs))
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴊᴏɪɴᴇᴅ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ: ${channel.name}
┃➠ ɪᴅ: ${channelId}
┃➠ sᴜʙs: ${subscribers.length}
┃
┃➠ ᴠɪᴇᴡ ᴘᴏsᴛs: ${prefix}subscribe posts ${channelId}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 2. LEAVE/UNSUBSCRIBE FROM CHANNEL
    if (subCmd === 'leave') {
      const channelId = args[1]
      if (!channelId) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴄʜᴀɴɴᴇʟ ɪᴅ
┃➠ ᴜsᴀɢᴇ: ${prefix}subscribe leave <id>
╚═══════════════════╝`
        }, { quoted: m })
      }

      const subscribers = JSON.parse(await db.get(`channel_${channelId}_subscribers`) || '[]')
      const userSubs = JSON.parse(await db.get(`user_${sender}_subscriptions`) || '[]')

      if (!subscribers.includes(sender)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ sᴜʙsᴄʀɪʙᴇᴅ ᴛᴏ ᴛʜɪs ᴄʜᴀɴɴᴇʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const newSubs = subscribers.filter(s => s!== sender)
      const newUserSubs = userSubs.filter(id => id!== channelId)

      await Promise.all([
        db.set(`channel_${channelId}_subscribers`, JSON.stringify(newSubs)),
        db.set(`user_${sender}_subscriptions`, JSON.stringify(newUserSubs))
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 👋ʟᴇғᴛ 〙═╗
┃➠ ᴜɴsᴜʙsᴄʀɪʙᴇᴅ ғʀᴏᴍ ᴄʜᴀɴɴᴇʟ
┃➠ ɪᴅ: ${channelId}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. LIST USER SUBSCRIPTIONS
    if (subCmd === 'list') {
      const userSubs = JSON.parse(await db.get(`user_${sender}_subscriptions`) || '[]')
      const channelList = JSON.parse(await db.get('channel_list') || '[]')

      if (userSubs.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 📢sᴜʙsᴄʀɪᴘᴛɪᴏɴs 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ sᴜʙsᴄʀɪʙᴇᴅ
┃➠ ᴊᴏɪɴ: ${prefix}subscribe join <id>
┃➠ ᴀʟ: ${prefix}subscribe all
╚═══════════════════╝`
        }, { quoted: m })
      }

      let listText = `╔═〘 📢ᴍʏ sᴜʙs 〙═╗\n┃➠ ᴛᴏᴛᴀʟ: ${userSubs.length}\n┃\n`

      for (const channelId of userSubs) {
        const channel = channelList.find(ch => ch.id === channelId)
        if (channel) {
          const posts = JSON.parse(await db.get(`channel_${channelId}_posts`) || '[]')
          listText += `┃➠ ${channel.name}\n`
          listText += `┃ └─ ɪᴅ: ${channelId} | ᴘᴏsᴛs: ${posts.length}\n`
        }
      }

      listText += `╚═══════════════════╝\n\n╭━━━━❮ ᴄᴏᴍᴀɴᴅs ❯━⊷\n┃➠ ${prefix}subscribe posts <id>\n┃➠ ${prefix}subscribe leave <id>\n╰━━━━━━━━━━━━━━━━━⊷`

      return await sock.sendMessage(from, { text: listText }, { quoted: m })
    }

    // 4. VIEW CHANNEL POSTS
    if (subCmd === 'posts') {
      const channelId = args[1]
      if (!channelId) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴄʜᴀɴɴᴇʟ ɪᴅ
┃➠ ᴜsᴀɢᴇ: ${prefix}subscribe posts <id>
╚═══════════════════╝`
        }, { quoted: m })
      }

      const subscribers = JSON.parse(await db.get(`channel_${channelId}_subscribers`) || '[]')
      if (!subscribers.includes(sender)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ʏᴏᴜ ᴍᴜsᴛ sᴜʙsᴄʀɪʙᴇ ғɪʀsᴛ
┃➠ ᴜsᴇ: ${prefix}subscribe join ${channelId}
╚═══════════════════╝`
        }, { quoted: m })
      }

      const posts = JSON.parse(await db.get(`channel_${channelId}_posts`) || '[]')
      const channelList = JSON.parse(await db.get('channel_list') || '[]')
      const channel = channelList.find(ch => ch.id === channelId)

      if (posts.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 📢${channel.name.toUpperCase()} 〙═╗
┃➠ ɴᴏ ᴘᴏsᴛs ʏᴇᴛ
╚═══════════════════╝`
        }, { quoted: m })
      }

      let postsText = `╔═〘 📢${channel.name.toUpperCase()} 〙═╗\n┃➠ ʟᴀᴛᴇsᴛ ᴘᴏsᴛs: ${posts.length}\n┃\n`

      const recentPosts = posts.slice(0, 5) // Show last 5
      for (let i = 0; i < recentPosts.length; i++) {
        const post = recentPosts[i]
        const time = new Date(post.time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        postsText += `┃ [${i + 1}] ${time}\n`
        postsText += `┃ ${post.text.slice(0, 50)}${post.text.length > 50? '...' : ''}\n`
        postsText += `┃ ᴛʏᴘᴇ: ${post.type.toUpperCase()}\n┃\n`
      }

      postsText += `╚═══════════════════╝`

      return await sock.sendMessage(from, { text: postsText }, { quoted: m })
    }

    // 5. LIST ALL AVAILABLE CHANNELS
    if (subCmd === 'all') {
      const channelList = JSON.parse(await db.get('channel_list') || '[]')

      if (channelList.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 📢ᴀʟ ᴄʜᴀɴɴᴇʟs 〙═╗
┃➠ ɴᴏ ᴄʜᴀɴɴᴇʟs ᴇxɪsᴛ
╚═══════════════════╝`
        }, { quoted: m })
      }

      let listText = `╔═〘 📢ᴀʟʟ ᴄʜᴀɴɴᴇʟs 〙═╗\n┃➠ ᴛᴏᴛᴀʟ: ${channelList.length}\n┃\n`

      for (const ch of channelList) {
        const subscribers = JSON.parse(await db.get(`channel_${ch.id}_subscribers`) || '[]')
        const posts = JSON.parse(await db.get(`channel_${ch.id}_posts`) || '[]')
        const isSubbed = subscribers.includes(sender)? '✅' : ''

        listText += `┃➠ ${isSubbed} ${ch.name}\n`
        listText += `┃ └─ ɪᴅ: ${ch.id}\n`
        listText += `┃ └─ sᴜʙs: ${subscribers.length} | ᴘᴏsᴛs: ${posts.length}\n┃\n`
      }

      listText += `╚═══════════════════╝\n\n╭━━━━❮ ᴊᴏɪɴ ❯━⊷\n┃➠ ${prefix}subscribe join <id>\n╰━━━━━━━━━━━━━━━━━⊷`

      return await sock.sendMessage(from, { text: listText }, { quoted: m })
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 📢sᴜʙsᴄʀɪʙᴇ 〙═╗
┃➠ ${prefix}subscribe all - ᴀʟʟ ᴄʜᴀɴɴᴇʟs
┃➠ ${prefix}subscribe join <id>
┃➠ ${prefix}subscribe leave <id>
┃➠ ${prefix}subscribe list - ʏᴏᴜʀ sᴜʙs
┃➠ ${prefix}subscribe posts <id>
╚═══════════════════╝`
    }, { quoted: m })
  }
}