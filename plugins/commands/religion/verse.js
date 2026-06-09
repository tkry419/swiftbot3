/**
 * SwiftBot - plugins/commands/religion/verse.js
 * Random Verse - 7 free API fallbacks, mixed religions
 * Category: religion
 * Usage: verse | verse <religion>
 */

export default {
  name: 'verse',
  alias: ['dailyverse', 'scripture'],
  desc: 'Random verse from any religious text',
  usage: 'verse | verse bible | verse quran',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const filter = args[0]?.toLowerCase()

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 ✨sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ʀᴀɴᴅᴏᴍ ᴠᴇʀsᴇ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    const sources = ['bible', 'quran', 'gita', 'dhammapada', 'torah']
    const source = filter && sources.includes(filter)? filter : sources[Math.floor(Math.random() * sources.length)]

    // FALLBACK #1: Bible
    if (source === 'bible') {
      try {
        const books = ['John', 'Psalm', 'Proverbs', 'Matthew']
        const book = books[Math.floor(Math.random() * books.length)]
        const chapter = Math.floor(Math.random() * 20) + 1
        const verse = Math.floor(Math.random() * 30) + 1
        const res = await fetch(`https://bible-api.com/${book} ${chapter}:${verse}?translation=kjv`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text.trim(),
              ref: data.reference,
              icon: '📖',
              title: 'ʙɪʙʟᴇ'
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #2: Quran
    if (!result && source === 'quran') {
      try {
        const surah = Math.floor(Math.random() * 114) + 1
        const ayah = Math.floor(Math.random() * 10) + 1
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.asad`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.text) {
            result = {
              text: data.data.text,
              arabic: data.data.arabic,
              ref: `Surah ${data.data.surah.number}:${data.data.numberInSurah}`,
              icon: '📿',
              title: 'ǫᴜʀᴀɴ'
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #3: Gita
    if (!result && source === 'gita') {
      try {
        const chapter = Math.floor(Math.random() * 18) + 1
        const verse = Math.floor(Math.random() * 30) + 1
        const res = await fetch(`https://bhagavadgitaapi.in/slok/${chapter}/${verse}`)
        if (res.ok) {
          const data = await res.json()
          if (data.slok) {
            result = {
              text: data.siva?.et || data.tej?.et || 'Translation not available',
              sanskrit: data.slok,
              ref: `Chapter ${chapter}, Verse ${verse}`,
              icon: '🕉️',
              title: 'ɢɪᴛᴀ'
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: Dhammapada
    if (!result && source === 'dhammapada') {
      try {
        const verse = Math.floor(Math.random() * 423) + 1
        const res = await fetch(`https://dhammapada.herokuapp.com/api/verse/${verse}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              pali: data.pali || null,
              ref: `Dhammapada ${verse}`,
              icon: '☸️',
              title: 'ᴅʜᴀᴍᴍᴀᴘᴀᴅᴀ'
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: Torah
    if (!result && source === 'torah') {
      try {
        const books = ['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy']
        const book = books[Math.floor(Math.random() * books.length)]
        const chapter = Math.floor(Math.random() * 20) + 1
        const verse = Math.floor(Math.random() * 30) + 1
        const res = await fetch(`https://www.sefaria.org/api/texts/${book} ${chapter}:${verse}?lang=en&context=0`)
        if (res.ok) {
          const data = await res.json()
          if (data.text && data.text.length > 0) {
            result = {
              text: data.text.join(' ').trim(),
              hebrew: data.he? data.he.join(' ').trim() : null,
              ref: data.ref || `${book} ${chapter}:${verse}`,
              icon: '📜',
              title: 'ᴛᴏʀᴀʜ'
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: OurManna - Any random
    if (!result) {
      try {
        const res = await fetch(`https://beta.ourmanna.com/api/v1/get?format=json&order=random`)
        if (res.ok) {
          const data = await res.json()
          if (data.verse?.details?.text) {
            result = {
              text: data.verse.details.text.trim(),
              ref: data.verse.details.reference,
              icon: '📖',
              title: 'ᴠᴇʀsᴇ'
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default John 3:16
    if (!result) {
      const res = await fetch(`https://bible-api.com/john 3:16?translation=kjv`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            text: data.text.trim(),
            ref: data.reference,
            icon: '📖',
            title: 'ᴠᴇʀsᴇ'
          }
        }
      }
    }

    // ALL 7 FAILED - Same error box style
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ
┃➠ ᴇx: ${prefix}verse bible
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 ${result.icon}${result.title} 〙═╗\n┃\n`
    if (result.arabic) boxText += `┃ ${result.arabic}\n┃\n`
    if (result.sanskrit) boxText += `┃ ${result.sanskrit}\n┃\n`
    if (result.hebrew) boxText += `┃ ${result.hebrew}\n┃\n`
    if (result.pali) boxText += `┃ ${result.pali}\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}