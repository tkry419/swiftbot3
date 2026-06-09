/**
 * SwiftBot - plugins/commands/religion/psalm.js
 * Psalm Search - 7 free API fallbacks, psalm number lookup
 * Category: religion
 * Usage: psalm <number> | psalm random
 */

export default {
  name: 'psalm',
  alias: ['psalms', 'tehillim'],
  desc: 'Book of Psalms - 7 sources, by number',
  usage: 'psalm <number> | psalm random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 📜ᴘsᴀʟᴍ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}psalm <number>
┃➠ ᴇx: ${prefix}psalm 23
┃➠ ᴇx: ${prefix}psalm 91
┃➠ ᴇx: ${prefix}psalm random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📜sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴘsᴀʟᴍ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴘsᴀʟᴍ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    if (query.toLowerCase() === 'random') {
      query = Math.floor(Math.random() * 150) + 1
    }

    let result = null

    // FALLBACK #1: Bible-API.com
    try {
      const res = await fetch(`https://bible-api.com/psalm%20${encodeURIComponent(query)}?translation=kjv`)
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

    // FALLBACK #2: Sefaria API
    if (!result) {
      try {
        const res = await fetch(`https://www.sefaria.org/api/texts/Psalms.${encodeURIComponent(query)}?lang=en&context=0`)
        if (res.ok) {
          const data = await res.json()
          if (data.text && data.text.length > 0) {
            result = {
              text: data.text.join(' ').trim(),
              ref: data.ref || `Psalm ${query}`
            }
          }
        }
      } catch (e) {}

    // FALLBACK #3: BibleGateway
    if (!result) {
      try {
        const res = await fetch(`https://www.biblegateway.com/passage/?search=Psalm+${encodeURIComponent(query)}&version=NIV`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<meta name="description" content="([^"]+)"/)
          if (textMatch) {
            result = {
              text: textMatch[1].replace(/&quot;/g, '"').split('(')[0].trim(),
              ref: `Psalm ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: Labs.Bible.org
    if (!result) {
      try {
        const res = await fetch(`https://labs.bible.org/api/?passage=Psalm%20${encodeURIComponent(query)}&type=json`)
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0 && data[0].text) {
            const fullText = data.map(v => v.text).join(' ').trim()
            result = {
              text: fullText,
              ref: `Psalm ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: OurManna API
    if (!result) {
      try {
        const res = await fetch(`https://beta.ourmanna.com/api/v1/get?format=json&reference=Psalm%20${encodeURIComponent(query)}`)
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

    // FALLBACK #6: DailyVerses
    if (!result) {
      try {
        const res = await fetch(`https://dailyverses.net/getverse/kjv/psalm/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text.trim(),
              ref: data.reference || `Psalm ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default Psalm 23
    if (!result) {
      const res = await fetch(`https://bible-api.com/psalm%2023?translation=kjv`)
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
┃➠ ᴘsᴀʟᴍ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴜsᴇ 1-150
┃➠ ᴇx: ${prefix}psalm 23
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 📜ᴘsᴀʟᴍ 〙═╗\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}