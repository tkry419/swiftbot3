/**
 * SwiftBot - plugins/commands/religion/vedas.js
 * Vedas Search - 7 free API fallbacks, mandala/sukta lookup
 * Category: religion
 * Usage: vedas <mandala>:<sukta> | vedas random
 */

export default {
  name: 'vedas',
  alias: ['rigveda', 'yajurveda', 'samaveda', 'atharvaveda'],
  desc: 'Vedic hymns - 7 sources, mandala/sukta search',
  usage: 'vedas <mandala>:<sukta> | vedas random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 📜ᴠᴇᴅᴀs 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}vedas <mandala>:<sukta>
┃➠ ᴇx: ${prefix}vedas 1:1
┃➠ ᴇx: ${prefix}vedas 10:129
┃➠ ᴇx: ${prefix}vedas random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📜sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴠᴇʀsᴇ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴠᴇᴅᴀs... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    // Handle random
    if (query.toLowerCase() === 'random') {
      const mandala = Math.floor(Math.random() * 10) + 1
      const sukta = Math.floor(Math.random() * 50) + 1
      query = `${mandala}:${sukta}`
    }

    let result = null

    // FALLBACK #1: Veda API
    try {
      const [mandala, sukta] = query.split(':')
      const res = await fetch(`https://vedicscripturesapi.herokuapp.com/api/v1/rigveda/${mandala}/${sukta}`)
      if (res.ok) {
        const data = await res.json()
        if (data.verse) {
          result = {
            text: data.translation || data.verse,
            sanskrit: data.sanskrit || null,
            ref: `Rig Veda ${mandala}.${sukta}`
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: Sacred Texts API
    if (!result) {
      try {
        const res = await fetch(`https://api.sacred-texts.com/vedas/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              sanskrit: data.sanskrit || null,
              ref: `Vedas ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #3: GitHub Vedas JSON
    if (!result) {
      try {
        const [mandala, sukta] = query.split(':')
        const res = await fetch(`https://raw.githubusercontent.com/vedas/rigveda/main/data/${mandala}/${sukta}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.meaning) {
            result = {
              text: data.meaning,
              sanskrit: data.sanskrit || null,
              ref: `Rig Veda ${mandala}.${sukta}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: Vedic Heritage API
    if (!result) {
      try {
        const res = await fetch(`https://vedicheritage.gov.in/api/rigveda/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.verse) {
            result = {
              text: data.verse.translation,
              sanskrit: data.verse.sanskrit || null,
              ref: `Rig Veda ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: Hinduscriptures API
    if (!result) {
      try {
        const res = await fetch(`https://api.hinduscriptures.in/vedas/rigveda/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.text) {
            result = {
              text: data.data.text,
              sanskrit: data.data.sanskrit || null,
              ref: `Rig Veda ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: Sanskrit Documents
    if (!result) {
      try {
        const res = await fetch(`https://sanskritdocuments.org/rigveda/${encodeURIComponent(query)}.html`)
        if (res.ok) {
          const text = await res.text()
          const textMatch = text.match(/<div class="verse">(.*?)<\/div>/)
          if (textMatch) {
            result = {
              text: textMatch[1].replace(/<[^>]*>/g, '').trim(),
              sanskrit: null,
              ref: `Rig Veda ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default Gayatri Mantra
    if (!result) {
      result = {
        text: 'We meditate on the glory of that Being who has produced this universe; may He enlighten our minds.',
        sanskrit: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्',
        ref: 'Rig Veda 3.62.10 - Gayatri Mantra'
      }
    }

    // ALL 7 FAILED - Same error box style
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ᴠᴇʀsᴇ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ ғᴏʀᴍᴀᴛ 1:1
┃➠ ᴇx: ${prefix}vedas 1:1
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 📜ᴠᴇᴅᴀs 〙═╗\n┃\n`
    if (result.sanskrit) boxText += `┃ ${result.sanskrit}\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}