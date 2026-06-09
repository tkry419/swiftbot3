/**
 * SwiftBot - plugins/commands/nsfw/hentai.js
 * Hentai Search - 7 free API fallbacks, tag/random lookup
 * Category: NSFW
 * Usage: hentai <tag> | hentai random
 * Checks: nsfw_enabled_${groupJid}, nsfw_banned_${groupJid}_${user}
 */

const FALLBACKS = [
  {
    name: 'nekos.life',
    url: (tag) => `https://nekos.life/api/v2/img/${tag || 'hentai'}`,
    parse: (data) => data.url
  },
  {
    name: 'waifu.pics',
    url: () => `https://api.waifu.pics/nsfw/waifu`,
    parse: (data) => data.url
  },
  {
    name: 'nekobot.xyz',
    url: (tag) => `https://nekobot.xyz/api/image?type=${tag || 'hentai'}`,
    parse: (data) => data.message
  },
  {
    name: 'purrbot.site',
    url: () => `https://purrbot.site/api/img/nsfw/hentai/gif`,
    parse: (data) => data.link
  },
  {
    name: 'hmtai.ore',
    url: (tag) => `https://hmtai.orechan.io/v2/nsfw/${tag || 'hentai'}`,
    parse: (data) => data.url
  },
  {
    name: 'shiro.gg',
    url: () => `https://shiro.gg/api/images/nsfw/hentai`,
    parse: (data) => data.url
  },
  {
    name: 'nekos.moe',
    url: () => `https://nekos.moe/api/v1/random/image?nsfw=true`,
    parse: (data) => data.images?.[0]?.id? `https://nekos.moe/image/${data.images[0].id}` : null
  }
]

const TAGS = ['hentai', 'ass', 'boobs', 'paizuri', 'neko', 'waifu', 'kitsune', 'tentacle']

export default {
  name: 'hentai',
  alias: ['h', 'hgif'],
  desc: 'Random hentai - 7 sources, never fails',
  usage: 'hentai <tag> | hentai random',
  category: 'NSFW',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const groupId = isGroup? from : 'global'
    let query = args.join(' ').toLowerCase()

    // 1. CHECK NSFW ENABLED - DB KEY DIRECT
    if (isGroup) {
      const nsfwEnabled = await db.get(`nsfw_enabled_${groupId}`)
      if (!nsfwEnabled) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ɴsғᴡ ᴏғ 〙═╗
┃➠ ɴsғᴡ ɪs ᴅɪsᴀʙʟᴇᴅ
┃
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}nsfw on
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 2. CHECK IF USER BANNED - DB KEY DIRECT
    const isBanned = await db.get(`nsfw_banned_${groupId}_${sender}`)
    if (isBanned) {
      return await sock.sendMessage(from, {
        text: `╔═〘 🚫ʙᴀɴᴇᴅ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ʙᴀɴɴᴇᴅ ғʀᴏᴍ ɴsғᴡ
┃
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴜɴʙᴀɴ ʏᴏᴜ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. CHECK AGEGATE - DB KEY DIRECT
    const ageGate = await db.get(`nsfw_agegate_${groupId}`)
    const ageVerified = await db.get(`nsfw_verified_${groupId}_${sender}`)

    if (ageGate!== false &&!ageVerified) {
      await db.set(`nsfw_verified_${groupId}_${sender}`, true)
      return await sock.sendMessage(from, {
        text: `╔═〘 ⚠️18+ ᴡᴀʀɴɪɴɢ 〙═╗
┃➠ ʏᴏᴜ ᴍᴜsᴛ ʙᴇ 18+
┃
┃➠ ʙʏ ᴜsɪɴɢ ᴛʜɪs ʏᴏᴜ ᴄᴏɴғɪʀᴍ
┃➠ ʏᴏᴜ ᴀʀᴇ 18 ᴏʀ ᴏʟᴅᴇʀ
┃
┃➠ ᴜsᴇ ᴄᴏᴍᴀɴᴅ ᴀɢᴀɪɴ ᴛᴏ ᴄᴏɴᴛɪɴᴜᴇ
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🔞sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴛᴀɢ: ${query || 'random'}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    // 4. HANDLE RANDOM
    if (!query || query === 'random') {
      query = TAGS[Math.floor(Math.random() * TAGS.length)]
    }

    let imageUrl = null

    // 5. TRY ALL 7 FALLBACKS
    for (let i = 0; i < FALLBACKS.length; i++) {
      try {
        const fb = FALLBACKS[i]
        const res = await fetch(fb.url(query), {
          timeout: 8000,
          headers: { 'User-Agent': 'SwiftBot/1.0' }
        })

        if (!res.ok) continue

        const data = await res.json()
        const url = fb.parse(data)

        if (url && url.startsWith('http')) {
          imageUrl = url
          break
        }
      } catch (e) {
        continue
      }
    }

    // 6. FALLBACK #8: DEFAULT IMAGE - NEVER FAILS
    if (!imageUrl) {
      imageUrl = 'https://i.imgur.com/removed.png'
    }

    // 7. SEND RESULT - SUPER CLEAN, NO SOURCE/LINK
    try {
      await sock.sendMessage(from, {
        image: { url: imageUrl },
        caption: `╔═〘 🔞ʜᴇɴᴛᴀɪ 〙═╗
┃
┃➠ ᴛᴀɢ: ${query}
┃
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    } catch (e) {
      // 8. FINAL FALLBACK - EVEN CLEANER IF IMAGE FAILS
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪᴍᴀɢᴇ ғᴀɪʟᴇᴅ ᴛᴏ ʟᴏᴀᴅ
┃
┃➠ ᴛᴀɢ: ${query}
┃➠ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }
  }
}