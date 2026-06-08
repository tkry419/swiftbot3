/**
 * SwiftBot - plugins/commands/search/lyrics.js
 * Lyrics Search - Song lyrics with 8 free API fallbacks
 * Category: search
 * Usage: lyrics <song name>
 * Works in DM + Groups
 */

export default {
  name: 'lyrics',
  alias: ['lyric', 'ly', 'song'],
  desc: 'Search song lyrics - 8 sources, never fails',
  usage: 'lyrics <artist - song> or <song>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}lyrics <song>
┃➠ ᴇx: ${prefix}lyrics burna boy last last
┃➠ ᴇx: ${prefix}lyrics adele - hello
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🎵sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ sᴏɴɢ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ʟʏʀɪᴄs... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let source = ''
    let artist = ''
    let title = query

    // Parse "Artist - Song" format
    if (query.includes(' - ')) {
      const parts = query.split(' - ')
      artist = parts[0].trim()
      title = parts[1].trim()
    }

    // FALLBACK #1: Lyrics.ovh - 100% Free, No Key
    try {
      const searchQuery = artist? `${artist}/${title}` : query
      const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(searchQuery)}`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.lyrics) {
          result = { lyrics: data.lyrics, artist, title }
          source = 'Lyrics.ovh'
        }
      }
    } catch (e) { console.log('Lyrics.ovh failed') }

    // FALLBACK #2: SomeRandomAPI - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://some-random-api.com/lyrics?title=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.lyrics) {
            result = { 
              lyrics: data.lyrics, 
              artist: data.author || artist, 
              title: data.title || title,
              thumbnail: data.thumbnail?.genius
            }
            source = 'SomeRandomAPI'
          }
        }
      } catch (e) { console.log('SomeRandomAPI failed') }
    }

    // FALLBACK #3: Lyrist API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://lyrist.vercel.app/api/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.lyrics) {
            result = { 
              lyrics: data.lyrics, 
              artist: data.artist || artist, 
              title: data.title || title 
            }
            source = 'Lyrist'
          }
        }
      } catch (e) { console.log('Lyrist failed') }
    }

    // FALLBACK #4: LyricsFreak Scrape via API - Free
    if (!result) {
      try {
        const res = await fetch(`https://api.lyricsfreak.com/lyrics?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.lyrics) {
            result = { 
              lyrics: data.lyrics, 
              artist: data.artist || artist, 
              title: data.title || title 
            }
            source = 'LyricsFreak'
          }
        }
      } catch (e) { console.log('LyricsFreak failed') }
    }

    // FALLBACK #5: Happi.dev Lyrics - Free tier
    if (!result) {
      try {
        const res = await fetch(`https://api.happi.dev/v1/music?q=${encodeURIComponent(query)}&limit=1&apikey=free`, {
          headers: { 'x-happi-key': 'free' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.result?.length > 0) {
            const track = data.result[0]
            const lyricRes = await fetch(`https://api.happi.dev/v1/music/artists/${track.id_artist}/albums/${track.id_album}/tracks/${track.id_track}/lyrics?apikey=free`, {
              headers: { 'x-happi-key': 'free' }
            })
            const lyricData = await lyricRes.json()
            if (lyricData.result?.lyrics) {
              result = { 
                lyrics: lyricData.result.lyrics, 
                artist: track.artist, 
                title: track.track 
              }
              source = 'Happi.dev'
            }
          }
        }
      } catch (e) { console.log('Happi failed') }
    }

    // FALLBACK #6: Vagalume API - Free, No Key
    if (!result) {
      try {
        const searchQuery = artist? `${artist} ${title}` : query
        const res = await fetch(`https://api.vagalume.com.br/search.excerpt?q=${encodeURIComponent(searchQuery)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.response?.docs?.length > 0) {
            const doc = data.response.docs[0]
            const lyricRes = await fetch(`https://api.vagalume.com.br/search.php?art=${encodeURIComponent(doc.band)}&mus=${encodeURIComponent(doc.title)}`)
            const lyricData = await lyricRes.json()
            if (lyricData.mus?.[0]?.text) {
              result = { 
                lyrics: lyricData.mus[0].text, 
                artist: doc.band, 
                title: doc.title 
              }
              source = 'Vagalume'
            }
          }
        }
      } catch (e) { console.log('Vagalume failed') }
    }

    // FALLBACK #7: ChartLyrics API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`http://api.chartlyrics.com/apiv1.asmx/SearchLyricDirect?artist=${encodeURIComponent(artist || '')}&song=${encodeURIComponent(title)}`)
        const text = await res.text()
        const lyricMatch = text.match(/<Lyric>([\s\S]*?)<\/Lyric>/)
        if (lyricMatch && lyricMatch[1] &&!lyricMatch[1].includes('not found')) {
          result = { 
            lyrics: lyricMatch[1].trim(), 
            artist: artist || 'Unknown', 
            title: title 
          }
          source = 'ChartLyrics'
        }
      } catch (e) { console.log('ChartLyrics failed') }
    }

    // FALLBACK #8: AZLyrics Scrape via API - Last Resort
    if (!result) {
      try {
        const res = await fetch(`https://lyrics-api.powerpostbox.com/api/lyrics?title=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.lyrics) {
            result = { 
              lyrics: data.lyrics, 
              artist: data.artist || artist, 
              title: data.title || title 
            }
            source = 'AZLyrics'
          }
        }
      } catch (e) { console.log('AZLyrics failed') }
    }

    // ALL 8 FAILED - EDIT TO ERROR
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ sᴏɴɢ: ${query}
┃➠ ᴛʀɪᴇᴅ 8 sᴏᴜʀᴄᴇs, ɴᴏ ʟʏʀɪᴄs
┃➠ ᴛɪᴘ: ᴜsᴇ "artist - song" ғᴏʀᴍᴀᴛ
┃➠ ᴇx: ${prefix}lyrics adele - hello
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT ORIGINAL ✅
      })
    }

    // FORMAT LYRICS WITH TICKS ✅
    const cleanLyrics = result.lyrics.trim().slice(0, 3500) // WhatsApp limit
    const displayArtist = result.artist || 'Unknown Artist'
    const displayTitle = result.title || query
    
    let resultText = `╔═〘 🎵ʟʏʀɪᴄs 〙═╗\n`
    resultText += `┃➠ ᴛɪᴛʟᴇ: ${displayTitle} ✅\n`
    resultText += `┃➠ ᴀʀᴛɪsᴛ: ${displayArtist} ✅\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n┃\n`
    resultText += `${cleanLyrics}\n┃\n`
    resultText += `╚═══════════════════╝`

    // EDIT THE "SEARCHING..." MESSAGE TO LYRICS
    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}