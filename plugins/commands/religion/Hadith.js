/**
 * SwiftBot - plugins/commands/religion/hadith.js
 * Hadith Search - 7 free API fallbacks, collection/number lookup
 * Category: religion
 * Usage: hadith <collection> <number> | hadith random
 */

export default {
  name: 'hadith',
  alias: ['sunnah', 'sahih'],
  desc: 'Sahih hadith - 7 sources, collection search',
  usage: 'hadith <collection> <number> | hadith random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ')

    const sentMsg = await sock.sendMessage(from, {
      text: `⏳`
    }, { quoted: m })

    // Default to random Bukhari if no query
    if (!query) {
      const num = Math.floor(Math.random() * 7000) + 1
      query = `bukhari ${num}`
    }

    let result = null

    // FALLBACK #1: Sunnah.com API
    try {
      const [collection, number] = query.split(' ')
      const res = await fetch(`https://api.sunnah.com/v1/hadiths/${collection}/${number}`)
      if (res.ok) {
        const data = await res.json()
        if (data.hadith?.length > 0) {
          result = {
            text: data.hadith[0].body,
            arabic: data.hadith[0].arabic || null,
            ref: `${collection.charAt(0).toUpperCase() + collection.slice(1)} ${number}`
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: Hadith API
    if (!result) {
      try {
        const [collection, number] = query.split(' ')
        const res = await fetch(`https://hadithapi.com/api/hadiths?apiKey=free&book=${collection}&hadithNumber=${number}`)
        if (res.ok) {
          const data = await res.json()
          if (data.hadiths?.data?.length > 0) {
            const h = data.hadiths.data[0]
            result = {
              text: h.hadithEnglish,
              arabic: h.hadithArabic || null,
              ref: `${h.book.bookName} ${h.hadithNumber}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #3: IslamAPI Hadith
    if (!result) {
      try {
        const res = await fetch(`https://islam-api.vercel.app/api/hadith/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              arabic: data.arabic || null,
              ref: data.reference || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: Fawazahmed0 Hadith API
    if (!result) {
      try {
        const [collection, number] = query.split(' ')
        const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/eng-${collection}/${number}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.hadith) {
            result = {
              text: data.hadith,
              arabic: data.arabic || null,
              ref: `${collection} ${number}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: QuranHadith API
    if (!result) {
      try {
        const res = await fetch(`https://api.quranhadith.com/v1/hadith/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.text) {
            result = {
              text: data.data.text,
              arabic: data.data.arabic || null,
              ref: data.data.reference || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: Muwatta Scraper
    if (!result) {
      try {
        const res = await fetch(`https://sunnah.com/muwatta/${query.split(' ')[1]}`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<div class="english_hadith_full">(.*?)<\/div>/)
          if (textMatch) {
            result = {
              text: textMatch[1].replace(/<[^>]*>/g, '').trim(),
              arabic: null,
              ref: query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Random Bukhari 1
    if (!result) {
      try {
        const res = await fetch(`https://api.sunnah.com/v1/hadiths/bukhari/1`)
        if (res.ok) {
          const data = await res.json()
          if (data.hadith?.length > 0) {
            result = {
              text: data.hadith[0].body,
              arabic: data.hadith[0].arabic || null,
              ref: `Bukhari 1`
            }
          }
        }
      } catch (e) {}
    }

    if (!result) {
      return await sock.sendMessage(from, {
        text: `Hadith not found`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 ☪️ʜᴀᴅɪᴛʜ 〙═╗\n┃\n`
    if (result.arabic) boxText += `┃ ${result.arabic}\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}