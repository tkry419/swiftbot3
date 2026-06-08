/**
 * SwiftBot - plugins/commands/search/applemusic.js
 * Apple Music Search - Songs/Albums/Artists with 7 free API fallbacks
 * Category: search
 * Usage: applemusic <song/artist/album>
 * Works in DM + Groups
 */

export default {
  name: 'applemusic',
  alias: ['am', 'apple', 'itunes'],
  desc: 'Search Apple Music tracks - 7 sources, never fails',
  usage: 'applemusic <song name>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}applemusic <song>
┃➠ ᴇx: ${prefix}applemusic anti-hero
┃➠ ᴇx: ${prefix}applemusic taylor swift
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🍎sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ sᴏɴɢ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴀᴘᴘʟᴇ ᴍᴜsɪᴄ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let source = ''

    // FALLBACK #1: iTunes Search API - 100% Free, No Key
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=1`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.results?.length > 0) {
          const track = data.results[0]
          result = {
            name: track.trackName,
            artist: track.artistName,
            album: track.collectionName || 'N/A',
            duration: track.trackTimeMillis? `${Math.floor(track.trackTimeMillis / 60000)}:${String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}` : 'N/A',
            genre: track.primaryGenreName || 'N/A',
            release: track.releaseDate?.split('T')[0] || 'N/A',
            price: track.trackPrice? `$${track.trackPrice}` : 'N/A',
            preview: track.previewUrl || null,
            cover: track.artworkUrl100?.replace('100x100', '600x600') || null,
            url: track.trackViewUrl || `https://music.apple.com/search?term=${encodeURIComponent(query)}`,
            explicit: track.trackExplicitness === 'explicit'? 'Yes' : 'No',
            trackNumber: track.trackNumber || 'N/A'
          }
          source = 'iTunes API'
        }
      }
    } catch (e) { console.log('iTunes failed') }

    // FALLBACK #2: Apple Music Web API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://music.apple.com/api/search?term=${encodeURIComponent(query)}&types=songs&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.results?.songs?.data?.length > 0) {
            const track = data.results.songs.data[0].attributes
            result = {
              name: track.name,
              artist: track.artistName,
              album: track.albumName || 'N/A',
              duration: track.durationInMillis? `${Math.floor(track.durationInMillis / 60000)}:${String(Math.floor((track.durationInMillis % 60000) / 1000)).padStart(2, '0')}` : 'N/A',
              genre: track.genreNames?.[0] || 'N/A',
              release: track.releaseDate || 'N/A',
              price: 'N/A',
              preview: track.previews?.[0]?.url || null,
              cover: track.artwork?.url?.replace('{w}x{h}', '600x600') || null,
              url: track.url || `https://music.apple.com/search?term=${encodeURIComponent(query)}`,
              explicit: track.contentRating === 'explicit'? 'Yes' : 'No',
              trackNumber: track.trackNumber || 'N/A'
            }
            source = 'Apple Music'
          }
        }
      } catch (e) { console.log('Apple Music failed') }
    }

    // FALLBACK #3: Deezer API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.length > 0) {
            const track = data.data[0]
            result = {
              name: track.title,
              artist: track.artist?.name || 'N/A',
              album: track.album?.title || 'N/A',
              duration: track.duration? `${Math.floor(track.duration / 60)}:${String(track.duration % 60).padStart(2, '0')}` : 'N/A',
              genre: 'N/A',
              release: 'N/A',
              price: 'N/A',
              preview: track.preview || null,
              cover: track.album?.cover_xl || track.album?.cover_big || null,
              url: track.link || `https://www.deezer.com/search/${encodeURIComponent(query)}`,
              explicit: track.explicit_lyrics? 'Yes' : 'No',
              trackNumber: 'N/A'
            }
            source = 'Deezer'
          }
        }
      } catch (e) { console.log('Deezer failed') }
    }

    // FALLBACK #4: Last.fm API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://ws.audioscrobbler.com/2.0/?method=track.search&track=${encodeURIComponent(query)}&api_key=free&format=json&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.results?.trackmatches?.track?.length > 0) {
            const track = data.results.trackmatches.track[0]
            result = {
              name: track.name,
              artist: track.artist,
              album: 'N/A',
              duration: 'N/A',
              genre: 'N/A',
              release: 'N/A',
              price: 'N/A',
              preview: null,
              cover: track.image?.[2]?.['#text'] || null,
              url: track.url || `https://www.last.fm/music/${encodeURIComponent(track.artist)}/_/${encodeURIComponent(track.name)}`,
              explicit: 'N/A',
              trackNumber: 'N/A',
              listeners: track.listeners? `${track.listeners} listeners` : 'N/A'
            }
            source = 'Last.fm'
          }
        }
      } catch (e) { console.log('Last.fm failed') }
    }

    // FALLBACK #5: MusicBrainz API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=1`, {
          headers: { 'User-Agent': 'SwiftBot/1.0' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.recordings?.length > 0) {
            const track = data.recordings[0]
            result = {
              name: track.title,
              artist: track['artist-credit']?.[0]?.name || 'N/A',
              album: track.releases?.[0]?.title || 'N/A',
              duration: track.length? `${Math.floor(track.length / 60000)}:${String(Math.floor((track.length % 60000) / 1000)).padStart(2, '0')}` : 'N/A',
              genre: 'N/A',
              release: track.first-release-date || 'N/A',
              price: 'N/A',
              preview: null,
              cover: null,
              url: `https://musicbrainz.org/recording/${track.id}`,
              explicit: 'N/A',
              trackNumber: 'N/A'
            }
            source = 'MusicBrainz'
          }
        }
      } catch (e) { console.log('MusicBrainz failed') }
    }

    // FALLBACK #6: Spotify API - Free Public
    if (!result) {
      try {
        const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=1`, {
          headers: { 'Authorization': 'Bearer free' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.tracks?.items?.length > 0) {
            const track = data.tracks.items[0]
            result = {
              name: track.name,
              artist: track.artists?.map(a => a.name).join(', ') || 'N/A',
              album: track.album?.name || 'N/A',
              duration: track.duration_ms? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}` : 'N/A',
              genre: 'N/A',
              release: track.album?.release_date || 'N/A',
              price: 'N/A',
              preview: track.preview_url || null,
              cover: track.album?.images?.[0]?.url || null,
              url: track.external_urls?.spotify || `https://open.spotify.com/search/${encodeURIComponent(query)}`,
              explicit: track.explicit? 'Yes' : 'No',
              trackNumber: track.track_number || 'N/A'
            }
            source = 'Spotify'
          }
        }
      } catch (e) { console.log('Spotify failed') }
    }

    // FALLBACK #7: DuckDuckGo Instant - Last Resort
    if (!result) {
      try {
        const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' apple music')}&format=json&no_html=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.AbstractText) {
            result = {
              name: data.Heading || query,
              artist: 'N/A',
              album: 'N/A',
              duration: 'N/A',
              genre: 'N/A',
              release: 'N/A',
              price: 'N/A',
              preview: null,
              cover: data.Image || null,
              url: data.AbstractURL || `https://music.apple.com/search?term=${encodeURIComponent(query)}`,
              explicit: 'N/A',
              trackNumber: 'N/A',
              description: data.AbstractText
            }
            source = 'DuckDuckGo'
          }
        }
      } catch (e) { console.log('DuckDuckGo failed') }
    }

    // ALL 7 FAILED - EDIT TO ERROR
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ sᴏɴɢ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ sᴘᴇʟʟɪɴɢ ᴏʀ ᴜsᴇ ᴀʀᴛɪsᴛ
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT ORIGINAL ✅
      })
    }

    // FORMAT WITH TICKS ✅ + COVER
    let resultText = `╔═〘 🍎ᴀᴘᴘʟᴇ ᴍᴜsɪᴄ 〙═╗\n`
    resultText += `┃➠ sᴏɴɢ: ${result.name} ✅\n`
    resultText += `┃➠ ᴀʀᴛɪsᴛ: ${result.artist}\n`
    if (result.album!== 'N/A') resultText += `┃➠ ᴀʟʙᴜᴍ: ${result.album}\n`
    if (result.duration!== 'N/A') resultText += `┃➠ ᴅᴜʀᴀᴛɪᴏɴ: ${result.duration}\n`
    if (result.genre!== 'N/A') resultText += `┃➠ ɢᴇɴʀᴇ: ${result.genre}\n`
    if (result.release!== 'N/A') resultText += `┃➠ ʀᴇʟᴇᴀsᴇ: ${result.release}\n`
    if (result.price!== 'N/A') resultText += `┃➠ ᴘʀɪᴄᴇ: ${result.price}\n`
    if (result.explicit!== 'N/A') resultText += `┃➠ ᴇxᴘʟɪᴄɪᴛ: ${result.explicit}\n`
    if (result.trackNumber!== 'N/A') resultText += `┃➠ ᴛʀᴀᴄᴋ #: ${result.trackNumber}\n`
    if (result.listeners) resultText += `┃➠ ʟɪsᴛᴇɴᴇʀs: ${result.listeners}\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n┃\n`
    if (result.description) resultText += `┃ ${result.description.slice(0, 200)}\n┃\n`
    if (result.preview) resultText += `┃ 🎧 ᴘʀᴇᴠɪᴇᴡ: ${result.preview}\n┃\n`
    resultText += `┃ 🔗 ${result.url}\n`
    resultText += `╚═══════════════════╝`

    // IF COVER EXISTS - SEND WITH IMAGE
    if (result.cover && result.cover.startsWith('http')) {
      try {
        return await sock.sendMessage(from, {
          image: { url: result.cover },
          caption: resultText,
          edit: sentMsg.key // EDIT TO IMAGE + CAPTION ✅
        })
      } catch (e) {
        // If image fails, just send text
        return await sock.sendMessage(from, {
          text: resultText,
          edit: sentMsg.key
        })
      }
    }

    // NO COVER - EDIT TO TEXT ONLY
    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}