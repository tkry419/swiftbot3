/**
 * SwiftBot - plugins/commands/religion/salahtime.js
 * Salah Times - 7 free API fallbacks, location-based prayer times
 * Category: religion
 * Usage: salahtime <city> | salahtime <city> <country>
 */

export default {
  name: 'salahtime',
  alias: ['prayertime', 'namaz', 'salah'],
  desc: 'Islamic prayer times - 7 sources, by location',
  usage: 'salahtime <city> | salahtime <city> <country>',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 🕌sᴀʟᴀʜ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}salahtime <city>
┃➠ ᴇx: ${prefix}salahtime London
┃➠ ᴇx: ${prefix}salahtime Mecca Saudi
┃➠ ᴇx: ${prefix}salahtime Dubai
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🕌sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ʟᴏᴄᴀᴛɪᴏɴ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴘʀᴀʏᴇʀ ᴛɪᴍᴇs... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    const today = new Date().toISOString().split('T')[0]

    // FALLBACK #1: Aladhan API
    try {
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(query)}&country=&method=2&date=${today}`)
      if (res.ok) {
        const data = await res.json()
        if (data.data?.timings) {
          const t = data.data.timings
          result = {
            location: `${data.data.meta.timezone}`,
            fajr: t.Fajr,
            dhuhr: t.Dhuhr,
            asr: t.Asr,
            maghrib: t.Maghrib,
            isha: t.Isha,
            date: data.data.date.readable
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: MuslimSalat API
    if (!result) {
      try {
        const res = await fetch(`https://muslimsalat.com/${encodeURIComponent(query)}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.items?.[0]) {
            const t = data.items[0]
            result = {
              location: data.city || query,
              fajr: t.fajr,
              dhuhr: t.dhuhr,
              asr: t.asr,
              maghrib: t.maghrib,
              isha: t.isha,
              date: t.date_for
            }
          }
        }
      } catch (e) {}

    // FALLBACK #3: IslamicFinder API
    if (!result) {
      try {
        const res = await fetch(`https://api.islamicfinder.org/v1/prayer_times?location=${encodeURIComponent(query)}&date=${today}`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.prayer_times) {
            const t = data.data.prayer_times
            result = {
              location: data.data.location,
              fajr: t.fajr,
              dhuhr: t.dhuhr,
              asr: t.asr,
              maghrib: t.maghrib,
              isha: t.isha,
              date: data.data.date
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: PrayTimes API
    if (!result) {
      try {
        const res = await fetch(`https://api.praytimes.org/times/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.timings) {
            const t = data.timings
            result = {
              location: query,
              fajr: t.fajr,
              dhuhr: t.dhuhr,
              asr: t.asr,
              maghrib: t.maghrib,
              isha: t.isha,
              date: today
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: Azan API
    if (!result) {
      try {
        const res = await fetch(`https://api.azan.com/v1/times?city=${encodeURIComponent(query)}&date=${today}`)
        if (res.ok) {
          const data = await res.json()
          if (data.times) {
            const t = data.times
            result = {
              location: data.city || query,
              fajr: t.fajr,
              dhuhr: t.dhuhr,
              asr: t.asr,
              maghrib: t.maghrib,
              isha: t.isha,
              date: data.date
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: Salah.com API
    if (!result) {
      try {
        const res = await fetch(`https://salah.com/api/times/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.prayer_times) {
            const t = data.prayer_times
            result = {
              location: data.city || query,
              fajr: t.fajr,
              dhuhr: t.dhuhr,
              asr: t.asr,
              maghrib: t.maghrib,
              isha: t.isha,
              date: data.date
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default Mecca
    if (!result) {
      const res = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=Mecca&country=Saudi%20Arabia&method=4&date=${today}`)
      if (res.ok) {
        const data = await res.json()
        if (data.data?.timings) {
          const t = data.data.timings
          result = {
            location: 'Mecca, Saudi Arabia',
            fajr: t.Fajr,
            dhuhr: t.Dhuhr,
            asr: t.Asr,
            maghrib: t.Maghrib,
            isha: t.Isha,
            date: data.data.date.readable
          }
        }
      }
    }

    // ALL 7 FAILED
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ʟᴏᴄᴀᴛɪᴏɴ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ ᴄɪᴛʏ sᴘᴇʟɪɴɢ
┃➠ ᴇx: ${prefix}salahtime London
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 🕌sᴀʟᴀʜ 〙═╗\n┃\n`
    boxText += `┃ 📍 ${result.location}\n`
    boxText += `┃ 📅 ${result.date}\n┃\n`
    boxText += `┃ 🌅 Fajr: ${result.fajr}\n`
    boxText += `┃ ☀️ Dhuhr: ${result.dhuhr}\n`
    boxText += `┃ 🌤️ Asr: ${result.asr}\n`
    boxText += `┃ 🌇 Maghrib: ${result.maghrib}\n`
    boxText += `┃ 🌙 Isha: ${result.isha}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}