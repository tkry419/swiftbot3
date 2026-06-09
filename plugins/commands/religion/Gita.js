/**
 * SwiftBot - plugins/commands/religion/gita.js
 * Bhagavad Gita - 7 free API fallbacks, chapter/verse lookup
 * Category: religion
 * Usage: gita <chapter>:<verse> | gita random
 */

export default {
  name: 'gita',
  alias: ['bhagavadgita', 'geeta'],
  desc: 'Bhagavad Gita verses - 7 sources',
  usage: 'gita <chapter>:<verse> | gita random',
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
      const chapter = Math.floor(Math.random() * 18) + 1
      const verse = Math.floor(Math.random() * 30) + 1
      query = `${chapter}:${verse}`
    }

    let result = null

    // FALLBACK #1: Bhagavad Gita API
    try {
      const [chapter, verse] = query.split(':')
      const res = await fetch(`https://bhagavadgitaapi.in/slok/${chapter}/${verse}`)
      if (res.ok) {
        const data = await res.json()
        if (data.slok) {
          result = {
            text: data.siva?.et || data.tej?.et || 'Translation not available',
            sanskrit: data.slok,
            ref: `Chapter ${chapter}, Verse ${verse}`
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: Vedabase API
    if (!result) {
      try {
        const res = await fetch(`https://vedabase.io/api/bg/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              sanskrit: data.sanskrit || null,
              ref: `BG ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #3: RapidAPI Gita - Free tier
    if (!result) {
      try {
        const [chapter, verse] = query.split(':')
        const res = await fetch(`https://bhagavad-gita3.p.rapidapi.com/v2/chapters/${chapter}/verses/${verse}/`, {
          headers: { 'X-RapidAPI-Host': 'bhagavad-gita3.p.rapidapi.com' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.translations?.length > 0) {
            result = {
              text: data.translations[0].description,
              sanskrit: data.text || null,
              ref: `Chapter ${chapter}, Verse ${verse}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: GitHub Gita JSON
    if (!result) {
      try {
        const [chapter, verse] = query.split(':')
        const res = await fetch(`https://raw.githubusercontent.com/gita/bhagavad-gita-api/main/data/verse_${chapter}_${verse}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.meaning) {
            result = {
              text: data.meaning,
              sanskrit: data.sanskrit || null,
              ref: `Chapter ${chapter}, Verse ${verse}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: AsItIs.com API
    if (!result) {
      try {
        const res = await fetch(`https://asitis.com/bg/${encodeURIComponent(query)}.html`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<div class="verse_text">(.*?)<\/div>/)
          if (textMatch) {
            result = {
              text: textMatch[1].replace(/<[^>]*>/g, '').trim(),
              sanskrit: null,
              ref: `BG ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: Krishna.com API
    if (!result) {
      try {
        const res = await fetch(`https://www.krishna.com/bg/${encodeURIComponent(query)}`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<meta name="description" content="([^"]+)"/)
          if (textMatch) {
            result = {
              text: textMatch[1].trim(),
              sanskrit: null,
              ref: `BG ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default BG 2:47
    if (!result) {
      try {
        const res = await fetch(`https://bhagavadgitaapi.in/slok/2/47`)
        if (res.ok) {
          const data = await res.json()
          if (data.slok) {
            result = {
              text: data.siva?.et || 'You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.',
              sanskrit: data.slok,
              ref: `Chapter 2, Verse 47`
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

    let boxText = `╔═〘 🕉️ɢɪᴛᴀ 〙═╗\n┃\n`
    if (result.sanskrit) boxText += `┃ ${result.sanskrit}\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}