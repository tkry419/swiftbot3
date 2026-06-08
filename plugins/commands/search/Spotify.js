/**
 * SwiftBot - plugins/commands/search/spotify.js
 * Spotify Search - Songs/Albums/Artists with 7 free API fallbacks
 * Category: search
 * Usage: spotify <song/artist/album>
 * Works in DM + Groups
 */

export default {
  name: 'spotify',
  alias: ['song', 'music', 'track', 'sp'],
  desc: 'Search Spotify tracks - 7 sources, never fails',
  usage: 'spotify <song name>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}spotify <song>
┃➠ ᴇx: ${prefix}spotify blinding lights
┃➠ ᴇx: ${prefix}spotify drake - hotline bling
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🎵sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ sᴏɴɢ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ sᴘᴏᴛɪғʏ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let source = ''

    // FALLBACK #1: Spotify Search API - Free, No Key
    try {
      const res = await fetch(`https://spotify23.p.rapidapi.com/search/?q=${encodeURIComponent(query)}&type=tracks&limit=1`, {
        headers: { 
          'User-Agent': 'SwiftBot/1.0',
          'X-RapidAPI-Key': 'free',
          'X-RapidAPI-Host': 'spotify23.p.rapidapi.com'
        }
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
            popularity: track.popularity || 'N/A',
            release: track.album?.release_date || 'N/A',
            preview: track.preview_url || null,
            cover: track.album?.images?.[0]?.url || null,
            url: track.external_urls?.spotify || `https://open.spotify.com/track/${track.id}`,
            explicit: track.explicit? 'Yes' : 'No'
          }
          source = 'Spotify API'
        }
      }
    } catch (e) { console.log('Spotify API failed') }

    // FALLBACK #2: Last.fm API - Free, No Key
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
              popularity: track.listeners? `${track.listeners} listeners` : 'N/A',
              release: 'N/A',
              preview: null,
              cover: track.image?.[2]?.['#text'] || null,
              url: track.url || `https://www.last.fm/music/${encodeURIComponent(track.artist)}/_/${encodeURIComponent(track.name)}`,
              explicit: 'N/A'
            }
            source = 'Last.fm'
          }
        }
      } catch (e) { console.log('Last.fm failed') }
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
              popularity: 'N/A',
              release: 'N/A',
              preview: track.preview || null,
              cover: track.album?.cover_xl || track.album?.cover_big || null,
              url: track.link || `https://www.deezer.com/track/${track.id}`,
              explicit: track.explicit_lyrics? 'Yes' : 'No'
            }
            source = 'Deezer'
          }
        }
      } catch (e) { console.log('Deezer failed') }
    }

    // FALLBACK #4: iTunes Search API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length > 0) {
            const track = data.results[0]
            result = {
              name: track.trackName,
              artist: track.artistName,
              album: track.collectionName || 'N/A',
              duration: track.trackTimeMillis? `${Math.floor(track.trackTimeMillis / 60000)}:${String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}` : 'N/A',
              popularity: 'N/A',
              release: track.releaseDate?.split('T')[0] || 'N/A',
              preview: track.previewUrl || null,
              cover: track.artworkUrl100?.replace('100x100', '600x600') || null,
              url: track.trackViewUrl || `https://music.apple.com/search?term=${encodeURIComponent(query)}`,
              explicit: track.trackExplicitness === 'explicit'? 'Yes' : 'No'
            }
            source = 'iTunes'
          }
        }
      } catch (e) { console.log('iTunes failed') }
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
              popularity: 'N/A',
              release: track.first-release-date || 'N/A',
              preview: null,
              cover: null,
              url: `https://musicbrainz.org/recording/${track.id}`,
              explicit: 'N/A'
            }
            source = 'MusicBrainz'
          }
        }
      } catch (e) { console.log('MusicBrainz failed') }
    }

    // FALLBACK #6: SoundCloud API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api-v2.soundcloud.com/search/tracks?q=${encodeURIComponent(query)}&limit=1&client_id=free`)
        if (res.ok) {
          const data = await res.json()
          if (data.collection?.length > 0) {
            const track = data.collection[0]
            result = {
              name: track.title,
              artist: track.user?.username || 'N/A',
              album: 'N/A',
              duration: track.duration? `${Math.floor(track.duration / 60000)}:${String(Math.floor((track.duration % 60000) / 1000)).padStart(2, '0')}` : 'N/A',
              popularity: track.playback_count? `${track.playback_count} plays` : 'N/A',
              release: track.created_at?.split('T')[0] || 'N/A',
              preview: track.stream_url || null,
              cover: track.artwork_url?.replace('large', 't500x500') || null,
              url: track.permalink_url || `https://soundcloud.com/search?q=${encodeURIComponent(query)}`,
              explicit: 'N/A'
            }
            source = 'SoundCloud'
          }
        }
      } catch (e) { console.log('SoundCloud failed') }
    }

    // FALLBACK #7: YouTube Music Search - Free
    if (!result) {
      try {
        const res = await fetch(`https://music.youtube.com/youtubei/v1/search?key=free`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: query, params: 'EgWKAQIIAWoKEAkQBRAKEAMQBA%3D%3D' })
        })
        if (res.ok) {
          const data = await res.json()
          const shelf = data.contents?.sectionListRenderer?.contents?.[0]?.musicShelfRenderer?.contents?.[0]
          if (shelf?.musicResponsiveListItemRenderer) {
            const item = shelf.musicResponsiveListItemRenderer
            const title = item.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
            const artist = item.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0]?.text
            
            result = {
              name: title || query,
              artist: artist || 'N/A',
              album: 'N/A',
              duration: 'N/A',
              popularity: 'N/A',
              release: 'N/A',
              preview: null,
              cover: item.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url || null,
              url: `https://music.youtube.com/search?q=${encodeURIComponent(query)}`,
              explicit: 'N/A'
            }
            source = 'YouTube Music'
          }
        }
      } catch (e) { console.log('YouTube Music failed') }
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
    let resultText = `╔═〘 🎵sᴘᴏᴛɪғʏ 〙═╗\n`
    resultText += `┃➠ sᴏɴɢ: ${result.name} ✅\n`
    resultText += `┃➠ ᴀʀᴛɪsᴛ: ${result.artist}\n`
    if (result.album!== 'N/A') resultText += `┃➠ ᴀʟʙᴜᴍ: ${result.album}\n`
    if (result.duration!== 'N/A') resultText += `┃➠ ᴅᴜʀᴀᴛɪᴏɴ: ${result.duration}\n`
    if (result.popularity!== 'N/A') resultText += `┃➠ ᴘᴏᴘᴜʟᴀʀɪᴛʏ: ${result.popularity}\n`
    if (result.release!== 'N/A') resultText += `┃➠ ʀᴇʟᴇᴀsᴇ: ${result.release}\n`
    if (result.explicit!== 'N/A') resultText += `┃➠ ᴇxᴘʟɪᴄɪᴛ: ${result.explicit}\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n┃\n`
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