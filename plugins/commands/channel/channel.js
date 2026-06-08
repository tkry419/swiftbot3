/**
 * SwiftBot - plugins/commands/channel/channel.js
 * Channel Management System - Create announcement channels
 * Category: channel
 * Uses db keys: channel_list, channel_${id}_owner, channel_${id}_admins
 */

export default {
  name: 'channel',
  alias: ['ch', 'announce'],
  desc: 'Create and manage announcement channels',
  usage: 'create <name> | list | info <id> | delete <id> | addadmin <id> @user',
  category: 'channel',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup, isAdmin, isOwner }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()

    // 1. CREATE CHANNEL - OWNER ONLY
    if (subCmd === 'create') {
      if (!isOwner) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏɴʟʏ ᴏᴡɴᴇʀ ᴄᴀɴ ᴄʀᴇᴀᴛᴇ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelName = args.slice(1).join(' ').trim()
      if (!channelName || channelName.length < 3) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ɴᴀᴍᴇ
┃➠ ᴜsᴀɢᴇ: ${prefix}channel create <name>
┃➠ ᴇx: ${prefix}channel create Updates
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelId = channelName.toLowerCase().replace(/[^a-z0-9]/g, '') + '_' + Date.now().toString().slice(-4)
      const channelList = JSON.parse(await db.get('channel_list') || '[]')

      if (channelList.some(ch => ch.name.toLowerCase() === channelName.toLowerCase())) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ ɴᴀᴍᴇ ᴇxɪsᴛs
┃➠ ᴜsᴇ ${prefix}channel list
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelData = {
        id: channelId,
        name: channelName,
        created: Date.now(),
        createdBy: sender
      }

      channelList.push(channelData)

      await Promise.all([
        db.set('channel_list', JSON.stringify(channelList)),
        db.set(`channel_${channelId}_owner`, sender),
        db.set(`channel_${channelId}_admins`, JSON.stringify([sender])),
        db.set(`channel_${channelId}_posts`, JSON.stringify([]))
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴄʀᴇᴀᴛᴇᴅ 〙═╗
┃➠ ɴᴀᴍᴇ: ${channelName}
┃➠ ɪᴅ: ${channelId}
┃➠ ᴏᴡɴᴇʀ: You
┃
┃➠ ᴘᴏsᴛ: ${prefix}post ${channelId} <text>
┃➠ ᴀᴅᴍɪɴ: ${prefix}channel addadmin ${channelId} @user
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 2. LIST CHANNELS - OWNER/ADMIN
    if (subCmd === 'list') {
      const channelList = JSON.parse(await db.get('channel_list') || '[]')

      if (channelList.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 📢ᴄʜᴀɴᴇʟs 〙═╗
┃➠ ɴᴏ ᴄʜᴀɴᴇʟs ғᴏᴜɴᴅ
┃➠ ᴄʀᴇᴀᴛᴇ: ${prefix}channel create <name>
╚═══════════════════╝`
        }, { quoted: m })
      }

      let listText = `╔═〘 📢ᴄʜᴀɴᴇʟs 〙═╗\n┃➠ ᴛᴏᴛᴀʟ: ${channelList.length}\n┃\n`
      let hasAccess = false

      for (const ch of channelList) {
        const owner = await db.get(`channel_${ch.id}_owner`)
        const admins = JSON.parse(await db.get(`channel_${ch.id}_admins`) || '[]')
        const posts = JSON.parse(await db.get(`channel_${ch.id}_posts`) || '[]')

        const isOwnerCh = owner === sender
        const isAdminCh = admins.includes(sender)

        if (isOwnerCh || isAdminCh || isOwner) {
          hasAccess = true
          const role = isOwnerCh? '👑 OWNER' : isAdminCh? '⭐ ADMIN' : 'VIEW'
          listText += `┃➠ ${ch.name}\n`
          listText += `┃ └─ ɪᴅ: ${ch.id} | ${role}\n`
          listText += `┃ └─ ᴘᴏsᴛs: ${posts.length}\n┃\n`
        }
      }

      if (!hasAccess) {
        return await sock.sendMessage(from, {
          text: `╔═〘 📢ᴄʜᴀɴᴇʟs 〙═╗
┃➠ ʏᴏᴜ ʜᴀᴠᴇ ɴᴏ ᴀᴄᴇss
┃➠ ᴀsᴋ ᴏᴡɴᴇʀ ᴛᴏ ᴀᴅᴅ ʏᴏᴜ
╚═══════════════════╝`
        }, { quoted: m })
      }

      listText += `╚═══════════════════╝\n\n╭━━━━❮ ɪɴғᴏ ❯━⊷\n┃➠ ${prefix}channel info <id>\n┃➠ ${prefix}post <id> <text>\n╰━━━━━━━━━━━━━━━━━⊷`

      return await sock.sendMessage(from, { text: listText }, { quoted: m })
    }

    // 3. CHANNEL INFO - ADMIN/OWNER
    if (subCmd === 'info') {
      const channelId = args[1]
      if (!channelId) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ɪᴅ
┃➠ ᴜsᴀɢᴇ: ${prefix}channel info <id>
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelList = JSON.parse(await db.get('channel_list') || '[]')
      const channel = channelList.find(ch => ch.id === channelId)

      if (!channel) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ ɴᴏᴛ ғᴏᴜɴᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const [owner, admins, posts] = await Promise.all([
        db.get(`channel_${channel.id}_owner`),
        db.get(`channel_${channel.id}_admins`),
        db.get(`channel_${channel.id}_posts`)
      ])

      const adminList = JSON.parse(admins || '[]')
      const postList = JSON.parse(posts || '[]')

      if (owner!== sender &&!adminList.includes(sender) &&!isOwner) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴏ ᴀᴄᴇss ᴛᴏ ᴛʜɪs ᴄʜᴀɴɴᴇʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const isOwnerCh = owner === sender
      const isAdminCh = adminList.includes(sender)

      return await sock.sendMessage(from, {
        text: `╔═〘 📢ᴄʜᴀɴɴᴇʟ ɪɴғᴏ 〙═╗
┃➠ ɴᴀᴍᴇ: ${channel.name}
┃➠ ɪᴅ: ${channel.id}
┃➠ ᴄʀᴇᴀᴛᴇᴅ: ${new Date(channel.created).toLocaleDateString()}
┃
┃➠ 👑 ᴏᴡɴᴇʀ: @${owner.split('@')[0]}
┃➠ ⭐ ᴀᴅᴍɪɴs: ${adminList.length}
┃➠ 📝 ᴘᴏsᴛs: ${postList.length}
┃
┃➠ ʏᴏᴜʀ ʀᴏʟᴇ: ${isOwnerCh? 'Owner 👑' : isAdminCh? 'Admin ⭐' : isOwner? 'Bot Owner' : 'None'}
╚═══════════════════╝`,
        mentions: [owner]
      }, { quoted: m })
    }

    // 4. DELETE CHANNEL - OWNER ONLY
    if (subCmd === 'delete' || subCmd === 'del') {
      if (!isOwner) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏɴʟʏ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴅᴇʟᴇᴛᴇ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelId = args[1]
      if (!channelId) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ɪᴅ
┃➠ ᴜsᴀɢᴇ: ${prefix}channel delete <id>
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelList = JSON.parse(await db.get('channel_list') || '[]')
      const channelIndex = channelList.findIndex(ch => ch.id === channelId)

      if (channelIndex === -1) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄʜᴀɴɴᴇʟ ɴᴏᴛ ғᴏᴜɴᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const channelName = channelList[channelIndex].name
      channelList.splice(channelIndex, 1)

      await Promise.all([
        db.set('channel_list', JSON.stringify(channelList)),
        db.set(`channel_${channelId}_owner`, null),
        db.set(`channel_${channelId}_admins`, null),
        db.set(`channel_${channelId}_posts`, null)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 🗑️ᴅᴇʟᴇᴛᴇᴅ 〙═╗
┃➠ ᴄʜᴀɴᴇʟ: ${channelName}
┃➠ ɪᴅ: ${channelId}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. ADD ADMIN - CHANNEL OWNER OR BOT OWNER
    if (subCmd === 'addadmin') {
      const channelId = args[1]
      const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]

      if (!channelId ||!mentioned) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}channel addadmin <id> @user
╚═══════════════════╝`
        }, { quoted: m })
      }

      const owner = await db.get(`channel_${channelId}_owner`)
      if (owner!== sender &&!isOwner) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏɴʟʏ ᴄʜᴀɴɴᴇʟ ᴏᴡɴᴇʀ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const admins = JSON.parse(await db.get(`channel_${channelId}_admins`) || '[]')
      if (admins.includes(mentioned)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ᴀᴅᴍɪɴ
╚═══════════════════╝`
        }, { quoted: m })
      }

      admins.push(mentioned)
      await db.set(`channel_${channelId}_admins`, JSON.stringify(admins))

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴀᴅᴅᴇᴅ 〙═╗
┃➠ @${mentioned.split('@')[0]} ɴᴏᴡ ᴀᴅᴍɪɴ
┃➠ ᴄʜᴀɴɴᴇʟ: ${channelId}
╚═══════════════════╝`,
        mentions: [mentioned]
      }, { quoted: m })
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 📢ᴄʜᴀɴᴇʟ 〙═╗
┃➠ ${prefix}channel create <name>
┃➠ ${prefix}channel list
┃➠ ${prefix}channel info <id>
┃➠ ${prefix}channel delete <id>
┃➠ ${prefix}channel addadmin <id> @user
┃
┃➠ ${prefix}post <id> <text>
╚═══════════════════╝`
    }, { quoted: m })
  }
}