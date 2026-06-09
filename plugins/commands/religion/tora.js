/**
 * SwiftBot - plugins/commands/religion/torah.js
 * Torah Search - 7 free API fallbacks, exact verse lookup
 * Category: religion
 * Usage: torah <book> <chapter>:<verse> | torah random
 * Works in DM + Groups
 */

export default {
  name: 'torah',
  alias: ['chumash', 'pentateuch'],
  desc: 'Torah verses - 7 sources, book/chapter/verse search',
  usage: 'torah <book> <chapter>:<verse> | torah random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ')

    const sentMsg = await sock.sendMessage(from, {
      text: `⏳`
    }, { quoted: m })

    // Default to random if no query
    if (!query) {
      const books = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']
      const book = books[Math.floor(Math.random() * books.length)]
      const chapter = Math.floor(Math.random() * 20) + 1
      const verse = Math.floor(Math.random() * 30) + 1
      query = `${book} ${chapter}:${verse}`
    }

    let result = null

    // FALLBACK #1: Sefaria API - Free, No Key
    try {
      const res = await fetch(`https://www.sefaria.org/api/texts/${encodeURIComponent(query)}?lang=en&context=0`)
      if (res.ok) {
        const data = await res.json()
        if (data.text && data.text.length > 0) {
          result = {
            text: data.text.join(' ').trim(),
            hebrew: data.he? data.he.join(' ').trim() : null,
            ref: data.ref || query
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: Bible-API.com - Has Torah
    if (!result) {
      try {
        const res = await fetch(`https://bible-api.com/${encodeURIComponent(query)}?translation=web`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text.trim(),
              hebrew: null,
              ref: data.reference
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #3: Tanach.us API
    if (!result) {
      try {
        const res = await fetch(`https://www.tanach.us/Server/tanach/Book=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              hebrew: data.hebrew || null,
              ref: query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: Chabad.org API
    if (!result) {
      try {
        const res = await fetch(`https://www.chabad.org/api/torah/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              hebrew: data.hebrew || null,
              ref: data.reference || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: Mechon Mamre
    if (!result) {
      try {
        const res = await fetch(`https://www.mechon-mamre.org/p/pt0${encodeURIComponent(query)}.htm`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<p>(.*?)<\/p>/)
          if (textMatch) {
            result = {
              text: textMatch[1].replace(/<[^>]*>/g, '').trim(),
              hebrew: null,
              ref: query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: BibleGateway - Torah books
    if (!result) {
      try {
        const res = await fetch(`https://www.biblegateway.com/passage/?search=${encodeURIComponent(query)}&version=NIV`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<meta name="description" content="([^"]+)"/)
          if (textMatch) {
            const cleanText = textMatch[1].replace(/&quot;/g, '"').split('(')[0].trim()
            result = {
              text: cleanText,
              hebrew: null,
              ref: query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Random Genesis
    if (!result) {
      try {
        const res = await fetch(`https://bible-api.com/genesis 1:1?translation=web`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text.trim(),
              hebrew: null,
              ref: data.reference
            }
          }
        }
      } catch (e) {}
    }

    if (!result) {
      return await sock.sendMessage(from, {
        text: `Verse not found`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 📜ᴛᴏʀᴀʜ 〙═╗\n┃\n`
    if (result.hebrew) boxText += `┃ ${result.hebrew}\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}