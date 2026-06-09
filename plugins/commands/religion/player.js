/**
 * SwiftBot - plugins/commands/religion/prayer.js
 * Prayer Search - 7 free API fallbacks, common prayers
 * Category: religion
 * Usage: prayer <name> | prayer random
 */

export default {
  name: 'prayer',
  alias: ['pray', 'lords-prayer'],
  desc: 'Common prayers - 7 sources, by religion/name',
  usage: 'prayer <name> | prayer random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ').toLowerCase()

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 🙏ᴘʀᴀʏᴇʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}prayer <name>
┃➠ ᴇx: ${prefix}prayer lords-prayer
┃➠ ᴇx: ${prefix}prayer hail-mary
┃➠ ᴇx: ${prefix}prayer random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🙏sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴘʀᴀʏᴇʀ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴘʀᴀʏᴇʀ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    if (query === 'random') {
      const prayers = ['lords-prayer', 'hail-mary', 'serenity', 'shema', 'grace', 'psalm23', 'nicene-creed']
      query = prayers[Math.floor(Math.random() * prayers.length)]
    }

    let result = null

    // FALLBACK #1: Prayer API
    try {
      const res = await fetch(`https://prayer-api.herokuapp.com/api/prayers/${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            text: data.text,
            ref: data.name || query
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: GitHub Prayers JSON
    if (!result) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/prayers/common/main/${encodeURIComponent(query)}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              ref: data.name || query
            }
          }
        }
      } catch (e) {}

    // FALLBACK #3: Catholic.org API
    if (!result) {
      try {
        const res = await fetch(`https://www.catholic.org/prayers/prayer.php?p=${encodeURIComponent(query)}`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<div class="prayer_text">(.*?)<\/div>/)
          if (textMatch) {
            result = {
              text: textMatch[1].replace(/<[^>]*>/g, '').trim(),
              ref: query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: Pray.com API
    if (!result) {
      try {
        const res = await fetch(`https://api.pray.com/v1/prayers/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.content) {
            result = {
              text: data.content,
              ref: data.title || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: Beliefnet API
    if (!result) {
      try {
        const res = await fetch(`https://www.beliefnet.com/prayers/api/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.prayer) {
            result = {
              text: data.prayer,
              ref: data.name || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: Christianity.com API
    if (!result) {
      try {
        const res = await fetch(`https://www.christianity.com/api/prayers/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              ref: data.name || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default Lord's Prayer
    if (!result) {
      result = {
        text: 'Our Father who art in heaven, hallowed be thy name. Thy kingdom come, Thy will be done, on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us, and lead us not into temptation, but deliver us from evil. Amen.',
        ref: "Lord's Prayer"
      }
    }

    // ALL 7 FAILED
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ᴘʀᴀʏᴇʀ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴛʀʏ ʟᴏʀᴅs-ᴘʀᴀʏᴇʀ
┃➠ ᴇx: ${prefix}prayer lords-prayer
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 🙏ᴘʀᴀʏᴇʀ 〙═╗\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}