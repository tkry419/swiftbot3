/**
 * SwiftBot - plugins/commands/religion/dhammapada.js
 * Dhammapada - 7 free API fallbacks, verse lookup
 * Category: religion
 * Usage: dhammapada <number> | dhammapada random
 */

export default {
  name: 'dhammapada',
  alias: ['dhamma', 'buddha'],
  desc: 'Dhammapada verses - 7 sources',
  usage: 'dhammapada <number> | dhammapada random',
  category: 'religion',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    let query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ☸️ᴅʜᴀᴍᴍᴀᴘᴀᴅᴀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}dhammapada <number>
┃➠ ᴇx: ${prefix}dhammapada 1
┃➠ ᴇx: ${prefix}dhammapada 153
┃➠ ᴇx: ${prefix}dhammapada random
╚═══════════════════╝`
      }, { quoted: m })
    }

    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 ☸️sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴠᴇʀsᴇ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴅʜᴀᴍᴍᴀ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    // Handle random
    if (query.toLowerCase() === 'random') {
      query = Math.floor(Math.random() * 423) + 1
    }

    let result = null

    // FALLBACK #1: Dhammapada API
    try {
      const res = await fetch(`https://dhammapada.herokuapp.com/api/verse/${query}`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            text: data.text,
            pali: data.pali || null,
            ref: `Dhammapada ${query}`
          }
        }
      }
    } catch (e) {}

    // FALLBACK #2: SuttaCentral API
    if (!result) {
      try {
        const res = await fetch(`https://suttacentral.net/api/suttas/dhp${query}?lang=en`)
        if (res.ok) {
          const data = await res.json()
          if (data.translation?.text) {
            result = {
              text: data.translation.text,
              pali: data.root_text?.text || null,
              ref: `Dhammapada ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #3: Access to Insight API
    if (!result) {
      try {
        const res = await fetch(`https://www.accesstoinsight.org/tipitaka/kn/dhp/dhp.${query}.budd.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              pali: data.pali || null,
              ref: `Dhammapada ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #4: GitHub Dhammapada JSON
    if (!result) {
      try {
        const res = await fetch(`https://raw.githubusercontent.com/dhammapada/verses/main/${query}.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.translation) {
            result = {
              text: data.translation,
              pali: data.pali || null,
              ref: `Dhammapada ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #5: BuddhaNet API
    if (!result) {
      try {
        const res = await fetch(`https://www.buddhanet.net/api/dhammapada/${query}`)
        if (res.ok) {
          const data = await res.json()
          if (data.verse) {
            result = {
              text: data.verse,
              pali: data.pali || null,
              ref: `Dhammapada ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #6: Wisdom Publications API
    if (!result) {
      try {
        const res = await fetch(`https://wisdompubs.org/api/dhammapada/${query}`)
        if (res.ok) {
          const data = await res.json()
          if (data.text) {
            result = {
              text: data.text,
              pali: data.pali || null,
              ref: `Dhammapada ${query}`
            }
          }
        }
      } catch (e) {}
    }

    // FALLBACK #7: Default Dhammapada 1
    if (!result) {
      const res = await fetch(`https://dhammapada.herokuapp.com/api/verse/1`)
      if (res.ok) {
        const data = await res.json()
        if (data.text) {
          result = {
            text: data.text,
            pali: data.pali || null,
            ref: `Dhammapada 1`
          }
        }
      }
    }

    // ALL 7 FAILED - Same error box style
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ᴠᴇʀsᴇ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴜsᴇ 1-423
┃➠ ᴇx: ${prefix}dhammapada 1
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    let boxText = `╔═〘 ☸️ᴅʜᴀᴍᴍᴀᴘᴀᴅᴀ 〙═╗\n┃\n`
    if (result.pali) boxText += `┃ ${result.pali}\n┃\n`
    boxText += `┃ ${result.text}\n┃\n`
    boxText += `┃ — ${result.ref}\n┃\n╚═══════════════════╝`

    return await sock.sendMessage(from, {
      text: boxText,
      edit: sentMsg.key
    })
  }
}