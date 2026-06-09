/**
 * SwiftBot - plugins/commands/religion/proverb.js
 * Proverb Search - 7 free API fallbacks, chapter/verse lookup
 * Category: religion
 * Usage: proverb <chapter>:<verse> | proverb random
 */

export default {
  name: 'proverb',
  alias: ['proverbs', 'wisdom'],
  desc: 'Biblical Proverbs - 7 sources, by chapter/verse',
  usage: 'proverb <chapter>:<verse> | proverb random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 📖ᴘʀᴏᴠᴇʀʙ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}proverb <chapter>:<verse>
┃➠ ᴇx: ${prefix}proverb 3:5
┃➠ ᴇx: ${prefix}proverb 16:9
┃➠ ᴇx: ${prefix}proverb random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📖sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴘʀᴏᴠᴇʀʙ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴡɪsᴅᴏᴍ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    if (query.toLowerCase() === 'random') {
      const chapter = Math.floor(Math.random() * 31) + 1
      const verse = Math.floor(Math.random() * 30) + 1
      query = `${chapter}:${verse}`
    }

    let result = null

    // FALLBACK #1: Bible-API.com
    try {
      const res = await fetch(`https://bible-api.com/proverbs%20${encodeURIComponent(query)}?translation=kjv`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            text: data.text.trim(),
            ref: data.reference
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: Labs.Bible.org
    if (!result) {
      try {
        const res = await fetch(`https://labs.bible.org/api/?passage=Proverbs%20${encodeURIComponent(query)}&type=json`)
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0 && data[0].text) {
            result = {
              text: data[0].text.trim(),
              ref: `${data[0].bookname} ${data[0].chapter}:${data[0].verse}`
            }
          }
        }
      } catch (e) {}

    // FALLBACK #3: BibleGateway
    if (!result) {
      try {
        const res = await fetch(`https://www.biblegateway.com/passage/?search=Proverbs+${encodeURIComponent(query)}&version=NIV`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<meta name="description" content="([^"]+)"/)
          if (textMatch) {
            result = {
              text: textMatch[1].replace(/&quot;/g, '"').split('(')[0].trim(),
              ref: `Proverbs ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: OurManna API
    if (!result) {
      try {
        const res = await fetch(`https://beta.ourmanna.com/api/v1/get?format=json&reference=Proverbs%20${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.verse?.details?.text) {
            result = {
              text: data.verse.details.text.trim(),
              ref: data.verse.details.reference
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: DailyVerses
    if (!result) {
      try {
        const res = await fetch(`https://dailyverses.net/getverse/kjv/proverbs/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text.trim(),
              ref: data.reference || `Proverbs ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: Sefaria API
    if (!result) {
      try {
        const res = await fetch(`https://www.sefaria.org/api/texts/Proverbs.${encodeURIComponent(query)}?lang=en&context=0`)
        if (res.ok) {
          const data = await res.json()
          if (data.text && data.text.length > 0) {
            result = {
              text: data.text.join(' ').trim(),
              ref: data.ref || `Proverbs ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default Proverbs 3:5
    if (!result) {
      const res = await fetch(`https://bible-api.com/proverbs%203:5?translation=kjv`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            text: data.text.trim(),
            ref: data.reference
          }
        }
      }
    }

    // ALL 7 FAILED
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ᴘʀᴏᴠᴇʀʙ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ ғᴏʀᴍᴀᴛ 3:5
┃➠ ᴇx: ${prefix}proverb 3:5
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 📖ᴘʀᴏᴠᴇʀʙ 〙═╗\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}