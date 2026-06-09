/**
 * SwiftBot - plugins/commands/religion/mantra.js
 * Mantra Search - 7 free API fallbacks, deity/purpose lookup
 * Category: religion
 * Usage: mantra <name> | mantra random
 */

export default {
  name: 'mantra',
  alias: ['japa', 'chant'],
  desc: 'Mantras - 7 sources, by deity/purpose',
  usage: 'mantra <name> | mantra random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ').toLowerCase()

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 🕉️ᴍᴀɴᴛʀᴀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}mantra <name>
┃➠ ᴇx: ${prefix}mantra gayatri
┃➠ ᴇx: ${prefix}mantra om
┃➠ ᴇx: ${prefix}mantra random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🕉️sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴍᴀɴᴛʀᴀ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴍᴀɴᴛʀᴀ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    if (query === 'random') {
      const mantras = ['gayatri', 'om', 'mahamrityunjaya', 'shanti', 'ganesh', 'lakshmi', 'shiva']
      query = mantras[Math.floor(Math.random() * mantras.length)]
    }

    let result = null

    // FALLBACK #1: Mantra API
    try {
      const res = await fetch(`https://mantra-api.herokuapp.com/api/mantras/${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            text: data.meaning || data.text,
            sanskrit: data.sanskrit || null,
            ref: data.name || query
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: Hindu Scriptures API
    if (!result) {
      try {
        const res = await fetch(`https://api.hinduscriptures.in/mantras/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.mantra) {
            result = {
              text: data.data.meaning,
              sanskrit: data.data.mantra,
              ref: data.data.deity || query
            }
          }
        }
      } catch (e) {}

    // FALLBACK #3: GitHub Mantras JSON
    if (!result) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/mantras/common/main/${encodeURIComponent(query)}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.translation) {
            result = {
              text: data.translation,
              sanskrit: data.sanskrit || null,
              ref: data.name || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: Vedic Heritage API
    if (!result) {
      try {
        const res = await fetch(`https://vedicheritage.gov.in/api/mantras/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.mantra) {
            result = {
              text: data.mantra.meaning,
              sanskrit: data.mantra.sanskrit || null,
              ref: data.mantra.name || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: Sanskrit Documents API
    if (!result) {
      try {
        const res = await fetch(`https://sanskritdocuments.org/api/mantras/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              sanskrit: data.sanskrit || null,
              ref: data.name || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: DrikPanchang API
    if (!result) {
      try {
        const res = await fetch(`https://api.drikpanchang.com/v1/mantras/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.mantra) {
            result = {
              text: data.mantra.meaning,
              sanskrit: data.mantra.text || null,
              ref: data.mantra.name || query
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default Gayatri
    if (!result) {
      result = {
        text: 'We meditate on the glory of that Being who has produced this universe; may He enlighten our minds.',
        sanskrit: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्',
        ref: 'Gayatri Mantra'
      }
    }

    // ALL 7 FAILED
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ᴍᴀɴᴛʀᴀ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴛʀʏ ɢᴀʏᴀᴛʀɪ, ᴏᴍ
┃➠ ᴇx: ${prefix}mantra gayatri
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 🕉️ᴍᴀɴᴛʀᴀ 〙═╗\n┃\n`
    if (result.sanskrit) boxText += `┃ ${result.sanskrit}\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}