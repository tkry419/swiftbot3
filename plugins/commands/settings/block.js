/**
 * SwiftBot - plugins/commands/settings/blocked.js
 * Blocked Users - View list, block/unblock users
 * Category: settings
 * Uses Baileys: sock.fetchBlocklist, sock.updateBlockStatus
 */

export default {
  name: 'blocked',
  alias: ['block', 'blocklist', 'unblock'],
  desc: 'Manage blocked users - view list, block/unblock',
  usage: 'list | block @user | unblock @user | unblock all',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []
    const quoted = m.message?.extendedTextMessage?.contextInfo?.participant

    // 1. LIST BLOCKED USERS
    if (subCmd === 'list' ||!subCmd) {
      try {
        const blocklist = await sock.fetchBlocklist()

        if (blocklist.length === 0) {
          return await sock.sendMessage(from, {
            text: `╔═〘 🚫ʙʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ɴᴏ ᴜsᴇʀs ʙʟᴏᴄᴋᴇᴅ
┃➠ ʙʟᴏᴄᴋ: ${prefix}block @user
╚═══════════════════╝`
          }, { quoted: m })
        }

        let listText = `╔═〘 🚫ʙʟᴏᴄᴋᴇᴅ 〙═╗\n┃➠ ᴛᴏᴛᴀʟ: ${blocklist.length}\n┃\n`

        for (let i = 0; i < Math.min(blocklist.length, 20); i++) {
          const user = blocklist[i]
          const number = user.split('@')[0]
          listText += `┃➠ ${i + 1}. +${number}\n`
        }

        if (blocklist.length > 20) {
          listText += `┃➠... ᴀɴᴅ ${blocklist.length - 20} ᴍᴏʀᴇ\n`
        }

        listText += `┃\n┃➠ ᴜɴʙʟᴏᴄᴋ: ${prefix}unblock @user\n┃➠ ᴜɴʙʟᴏᴄᴋ ᴀʟ: ${prefix}unblock all\n╚═══════════════════╝`

        return await sock.sendMessage(from, { text: listText }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ ʟɪsᴛ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 2. BLOCK USER
    if (subCmd === 'block') {
      let target = mentioned[0] || quoted

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴛᴀɢ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴜsᴇʀ
┃➠ ᴇx: ${prefix}block @user
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (target === sock.user.id) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ʙʟᴏᴄᴋ ᴍʏsᴇʟғ
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateBlockStatus(target, 'block')
        await db.set(`blocked_${target}`, true)
        const number = target.split('@')[0]

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʙʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ᴜsᴇʀ: +${number}
┃➠ ᴛʜᴇʏ ᴄᴀɴ'ᴛ ᴍsɢ/ᴄᴀʟ ᴜ
┃
┃➠ ᴜɴʙʟᴏᴄᴋ: ${prefix}unblock @user
╚═══════════════════╝`,
          mentions: [target]
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ʙʟᴏᴄᴋ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. UNBLOCK USER
    if (subCmd === 'unblock') {
      const targetArg = args[1]?.toLowerCase()

      // UNBLOCK ALL
      if (targetArg === 'all') {
        try {
          const blocklist = await sock.fetchBlocklist()
          if (blocklist.length === 0) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴏ ᴜsᴇʀs ᴛᴏ ᴜɴʙʟᴏᴄᴋ
╚═══════════════════╝`
            }, { quoted: m })
          }

          for (const user of blocklist) {
            await sock.updateBlockStatus(user, 'unblock')
            await db.set(`blocked_${user}`, null)
          }

          return await sock.sendMessage(from, {
            text: `╔═〘 ✅ᴜɴʙʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ᴜɴʙʟᴏᴄᴋᴇᴅ: ${blocklist.length} users
┃➠ ᴀʟ ʙʟᴏᴄᴋs ʀᴇᴍᴏᴠᴇᴅ
╚═══════════════════╝`
          }, { quoted: m })

        } catch (e) {
          return await sock.sendMessage(from, {
            text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴜɴʙʟᴏᴄᴋ ᴀʟ
┃➠ ${e.message}
╚═══════════════════╝`
          }, { quoted: m })
        }
      }

      // UNBLOCK SPECIFIC USER
      let target = mentioned[0] || quoted

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴛᴀɢ ᴏʀ ʀᴇᴘʟʏ ᴛᴏ ᴜsᴇʀ
┃➠ ᴇx: ${prefix}unblock @user
┃➠ ᴇx: ${prefix}unblock all
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        await sock.updateBlockStatus(target, 'unblock')
        await db.set(`blocked_${target}`, null)
        const number = target.split('@')[0]

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜɴʙʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ᴜsᴇʀ: +${number}
┃➠ ᴛʜᴇʏ ᴄᴀɴ ɴᴏᴡ ᴍsɢ/ᴄᴀʟ ᴜ
╚═══════════════════╝`,
          mentions: [target]
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴜɴʙʟᴏᴄᴋ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 🚫ʙʟᴏᴄᴋᴇᴅ 〙═╗
┃➠ ${prefix}blocked list - ᴠɪᴇᴡ ʙʟᴏᴄᴋᴇᴅ
┃➠ ${prefix}block @user - ʙʟᴏᴄᴋ ᴜsᴇʀ
┃➠ ${prefix}unblock @user - ᴜɴʙʟᴏᴄᴋ ᴜsᴇʀ
┃➠ ${prefix}unblock all - ᴜɴʙʟᴏᴄᴋ ᴀʟ
┃
┃➠ ʀᴇᴘʟʏ ᴛᴏ ᴍsɢ ᴡᴏʀᴋs ᴛᴏᴏ
╚═══════════════════╝`
    }, { quoted: m })
  }
}