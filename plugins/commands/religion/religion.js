/**
 * SwiftBot - plugins/commands/religion/bible.js
 * Bible Search - 7 free API fallbacks, exact verse lookup
 * Category: religion
 * Usage: bible <book> <chapter>:<verse> | bible random
 * Works in DM + Groups
 */

export default {
  name: 'bible',
  alias: ['verse', 'scripture', 'kjv'],
  desc: 'Bible verses - 7 sources, book/chapter/verse search',
  usage: 'bible <book> <chapter>:<verse> | bible random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 📖ʙɪʙʟᴇ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}bible <book> <chapter>:<verse>
┃➠ ᴇx: ${prefix}bible john 3:16
┃➠ ᴇx: ${prefix}bible psalm 23:1
┃➠ ᴇx: ${prefix}bible random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📖sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴠᴇʀsᴇ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ sᴄʀɪᴘᴛᴜʀᴇ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let ref = query

    // Handle random verse
    if (query.toLowerCase() === 'random') {
      const books = ['John', 'Psalm', 'Proverbs', 'Matthew', 'Genesis', 'Romans']
      const book = books[Math.floor(Math.random() * books.length)]
      const chapter = Math.floor(Math.random() * 20) + 1
      const verse = Math.floor(Math.random() * 30) + 1
      ref = `${book} ${chapter}:${verse}`
    }

    // FALLBACK #1: Bible-API.com - Free, No Key
    try {
      const res = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            reference: data.reference,
            text: data.text.trim()
          }
        }
      }
    } catch (e) { console.log('Bible-API failed') }

    // FALLBACK #2: OurManna API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://beta.ourmanna.com/api/v1/get?format=json&order=random`)
        if (res.ok) {
          const data = await res.json()
          if (data.verse?.details?.text) {
            result = {
              reference: data.verse.details.reference,
              text: data.verse.details.text.trim()
            }
          }
        }
      } catch (e) { console.log('OurManna failed') }
    }

    // FALLBACK #3: Labs.Bible.org API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://labs.bible.org/api/?passage=${encodeURIComponent(ref)}&type=json`)
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0 && data[0].text) {
            const v = data[0]
            result = {
              reference: `${v.bookname} ${v.chapter}:${v.verse}`,
              text: v.text.trim()
            }
          }
        }
      } catch (e) { console.log('Bible.org failed') }
    }

    // FALLBACK #4: BibleGateway Scraper - Free
    if (!result) {
      try {
        const res = await fetch(`https://www.biblegateway.com/passage/?search=${encodeURIComponent(ref)}&version=KJV`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<meta name="description" content="([^"]+)"/)
          if (textMatch) {
            result = {
              reference: ref,
              text: textMatch[1].replace(/&quot;/g, '"').split('(')[0].trim()
            }
          }
        }
      } catch (e) { console.log('BibleGateway failed') }
    }

    // FALLBACK #5: Scripture API - Free
    if (!result) {
      try {
        const res = await fetch(`https://api.scripture.api.bible/v1/bibles/de4e12af7f28f599-02/search?query=${encodeURIComponent(ref)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.verses?.length > 0) {
            const v = data.data.verses[0]
            result = {
              reference: v.reference,
              text: v.text.replace(/<[^>]*>/g, '').trim()
            }
          }
        }
      } catch (e) { console.log('Scripture API failed') }
    }

    // FALLBACK #6: DailyVerses.net - Free
    if (!result) {
      try {
        const res = await fetch(`https://dailyverses.net/getverse/kjv/${encodeURIComponent(ref)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              reference: data.reference || ref,
              text: data.text.trim()
            }
          }
        }
      } catch (e) { console.log('DailyVerses failed') }
    }

    // FALLBACK #7: Bible.com API - Free
    if (!result) {
      try {
        const res = await fetch(`https://www.bible.com/en-GB/bible/1/${encodeURIComponent(ref)}.KJV`)
        if (res.ok) {
          result = {
            reference: ref,
            text: 'Verse found on Bible.com - Check link for full text'
          }
        }
      } catch (e) { console.log('Bible.com failed') }
    }

    // ALL 7 FAILED
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ᴠᴇʀsᴇ: ${ref}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ sᴘᴇʟʟɪɴɢ
┃➠ ᴇx: ${prefix}bible john 3:16
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    // CLEAN FORMAT - NO SOURCE, NO METADATA, NO TICKS
    let resultText = `╔═〘 📖ʙɪʙʟᴇ 〙═╗\n`
    resultText += `┃\n`
    resultText += `┃ ${result.text}\n`
    resultText += `┃\n`
    resultText += `┃ — ${result.reference}\n`
    resultText += `┃\n`
    resultText += `╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}