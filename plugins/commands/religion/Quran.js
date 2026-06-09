/**
 * SwiftBot - plugins/commands/religion/quran.js
 * Quran Search - 7 free API fallbacks, surah/ayah lookup
 * Category: religion
 * Usage: quran <surah>:<ayah> | quran random
 * Works in DM + Groups
 */

export default {
  name: 'quran',
  alias: ['ayah', 'surah', 'koran'],
  desc: 'Quran verses - 7 sources, surah/ayah search',
  usage: 'quran <surah>:<ayah> | quran random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 📿ǫᴜʀᴀɴ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}quran <surah>:<ayah>
┃➠ ᴇx: ${prefix}quran 1:1
┃➠ ᴇx: ${prefix}quran 2:255
┃➠ ᴇx: ${prefix}quran random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📿sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴀʏᴀʜ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ǫᴜʀᴀɴ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let ref = query

    // Handle random ayah
    if (query.toLowerCase() === 'random') {
      const surah = Math.floor(Math.random() * 114) + 1
      const ayah = Math.floor(Math.random() * 10) + 1
      ref = `${surah}:${ayah}`
    }

    // FALLBACK #1: AlQuran.cloud API - Free, No Key
    try {
      const res = await fetch(`https://api.alquran.cloud/v1/ayah/${encodeURIComponent(ref)}/en.asad`)
      if (res.ok) {
        const data = await res.json()
        if (data.data?.text) {
          result = {
            reference: `${data.data.surah.number}:${data.data.numberInSurah} - ${data.data.surah.englishName}`,
            arabic: data.data.arabic,
            text: data.data.text
          }
        }
      }
    } catch (e) { console.log('AlQuran.cloud failed') }

    // FALLBACK #2: Quran.com API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?verse_key=${encodeURIComponent(ref)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.verses?.length > 0) {
            const v = data.verses[0]
            result = {
              reference: v.verse_key,
              arabic: v.text_uthmani,
              text: null
            }
          }
        }
      } catch (e) { console.log('Quran.com failed') }
    }

    // FALLBACK #3: QuranApi.dev - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://quranapi.pages.dev/api/${encodeURIComponent(ref)}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.arabic) {
            result = {
              reference: `${data.surahNo}:${data.ayahNo} - ${data.surahName}`,
              arabic: data.arabic,
              text: data.english
            }
          }
        }
      } catch (e) { console.log('QuranApi.dev failed') }
    }

    // FALLBACK #4: Fawazahmed0 Quran API - Free, No Key
    if (!result) {
      try {
        const [surah, ayah] = ref.split(':')
        const res = await fetch(`https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/eng-yusufali/${surah}/${ayah}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              reference: `${surah}:${ayah}`,
              arabic: null,
              text: data.text
            }
          }
        }
      } catch (e) { console.log('Fawazahmed0 failed') }
    }

    // FALLBACK #5: Islamic Network API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://islamic-network-api.herokuapp.com/api/quran/ayah/${encodeURIComponent(ref)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.text) {
            result = {
              reference: `${data.data.surah}:${data.data.ayah} - ${data.data.surahName}`,
              arabic: data.data.arabic,
              text: data.data.text
            }
          }
        }
      } catch (e) { console.log('Islamic Network failed') }
    }

    // FALLBACK #6: Quran Foundation API - Free
    if (!result) {
      try {
        const res = await fetch(`https://api.quran.foundation/v1/ayahs/${encodeURIComponent(ref)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.text) {
            result = {
              reference: data.data.reference,
              arabic: data.data.arabic,
              text: data.data.text
            }
          }
        }
      } catch (e) { console.log('Quran Foundation failed') }
    }

    // FALLBACK #7: Random Ayah API - Last Resort
    if (!result) {
      try {
        const res = await fetch(`https://api.alquran.cloud/v1/ayah/random/en.asad`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.text) {
            result = {
              reference: `${data.data.surah.number}:${data.data.numberInSurah} - ${data.data.surah.englishName}`,
              arabic: data.data.arabic,
              text: data.data.text
            }
          }
        }
      } catch (e) { console.log('Random Ayah failed') }
    }

    // ALL 7 FAILED
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ᴀʏᴀʜ: ${ref}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴜsᴇ ғᴏʀᴍᴀᴛ 1:1
┃➠ ᴇx: ${prefix}quran 2:255
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    // CLEAN FORMAT - NO SOURCE, NO METADATA, NO TICKS
    let resultText = `╔═〘 📿ǫᴜʀᴀɴ 〙═╗\n`
    resultText += `┃\n`
    if (result.arabic) resultText += `┃ ${result.arabic}\n┃\n`
    if (result.text) resultText += `┃ ${result.text}\n┃\n`
    resultText += `┃ — ${result.reference}\n`
    resultText += `┃\n`
    resultText += `╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}