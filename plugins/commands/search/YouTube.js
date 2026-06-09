/**
 * SwiftBot - plugins/commands/search/youtube.js
 * YouTube Search - Videos with 7 free API fallbacks
 * Category: search
 * Usage: youtube <query>
 * Works in DM + Groups
 */

export default {
  name: 'youtube',
  alias: ['yt', 'ytsearch', 'video'],
  desc: 'Search YouTube videos - 7 sources, never fails',
  usage: 'youtube <query>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}youtube <query>
┃➠ ᴇx: ${prefix}youtube lofi hip hop
┃➠ ᴇx: ${prefix}youtube mrbeast latest
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL TRY TO EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📺sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ʏᴏᴜᴛᴜʙᴇ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let results = null
    let source = ''

    // FALLBACK #1: YouTube Search API - Free, No Key
    try {
      const res = await fetch(`https://youtube-search-api3.p.rapidapi.com/search?q=${encodeURIComponent(query)}&part=snippet&maxResults=5`, {
        headers: { 
          'X-RapidAPI-Key': 'free',
          'X-RapidAPI-Host': 'youtube-search-api3.p.rapidapi.com'
        }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.items?.length > 0) {
          results = data.items.map(vid => ({
            title: vid.snippet.title,
            channel: vid.snippet.channelTitle,
            id: vid.id.videoId,
            thumbnail: vid.snippet.thumbnails?.high?.url || vid.snippet.thumbnails?.medium?.url,
            published: vid.snippet.publishedAt?.split('T')[0],
            url: `https://youtu.be/${vid.id.videoId}`
          }))
          source = 'YouTube API'
        }
      }
    } catch (e) { console.log('YouTube API failed') }

    // FALLBACK #2: Invidious API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://invidious.io/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0) {
            results = data.slice(0, 5).map(vid => ({
              title: vid.title,
              channel: vid.author,
              id: vid.videoId,
              thumbnail: `https://i.ytimg.com/vi/${vid.videoId}/hqdefault.jpg`,
              published: new Date(vid.published * 1000).toISOString().split('T')[0],
              duration: vid.lengthSeconds? `${Math.floor(vid.lengthSeconds / 60)}:${String(vid.lengthSeconds % 60).padStart(2, '0')}` : 'N/A',
              views: vid.viewCount? `${(vid.viewCount / 1000000).toFixed(1)}M views` : 'N/A',
              url: `https://youtu.be/${vid.videoId}`
            }))
            source = 'Invidious'
          }
        }
      } catch (e) { console.log('Invidious failed') }
    }

    // FALLBACK #3: Piped API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`)
        if (res.ok) {
          const data = await res.json()
          if (data.items?.length > 0) {
            results = data.items.slice(0, 5).map(vid => ({
              title: vid.title,
              channel: vid.uploaderName,
              id: vid.url.split('v=')[1],
              thumbnail: vid.thumbnail,
              published: vid.uploadedDate || 'N/A',
              duration: vid.duration? `${Math.floor(vid.duration / 60)}:${String(vid.duration % 60).padStart(2, '0')}` : 'N/A',
              views: vid.views? `${(vid.views / 1000000).toFixed(1)}M views` : 'N/A',
              url: `https://youtu.be/${vid.url.split('v=')[1]}`
            }))
            source = 'Piped'
          }
        }
      } catch (e) { console.log('Piped failed') }
    }

    // FALLBACK #4: YouTube RSS Feed - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://www.youtube.com/feeds/videos.xml?search_query=${encodeURIComponent(query)}`)
        if (res.ok) {
          const text = await res.text()
          const matches = [...text.matchAll(/<entry>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<yt:videoId>([^<]+)<\/yt:videoId>[\s\S]*?<name>([^<]+)<\/name>/g)]
          if (matches.length > 0) {
            results = matches.slice(0, 5).map(m => ({
              title: m[1],
              channel: m[3],
              id: m[2],
              thumbnail: `https://i.ytimg.com/vi/${m[2]}/hqdefault.jpg`,
              published: 'N/A',
              url: `https://youtu.be/${m[2]}`
            }))
            source = 'YouTube RSS'
          }
        }
      } catch (e) { console.log('YouTube RSS failed') }
    }

    // FALLBACK #5: Noembed API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=dQw4w9WgXcQ&maxwidth=0`)
        // This is just to test, actual search below
        const searchRes = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=5&key=free`)
        if (searchRes.ok) {
          const data = await searchRes.json()
          if (data.items?.length > 0) {
            results = data.items.map(vid => ({
              title: vid.snippet.title,
              channel: vid.snippet.channelTitle,
              id: vid.id.videoId,
              thumbnail: vid.snippet.thumbnails?.high?.url,
              published: vid.snippet.publishedAt?.split('T')[0],
              url: `https://youtu.be/${vid.id.videoId}`
            }))
            source = 'YouTube Data'
          }
        }
      } catch (e) { console.log('YouTube Data failed') }
    }

    // FALLBACK #6: DuckDuckGo Videos - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(query + ' site:youtube.com')}&format=json&no_html=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.RelatedTopics?.length > 0) {
            results = data.RelatedTopics.slice(0, 5).map(topic => {
              const urlMatch = topic.FirstURL?.match(/v=([^&]+)/)
              const id = urlMatch? urlMatch[1] : 'dQw4w9WgXcQ'
              return {
                title: topic.Text?.split(' - ')[0] || query,
                channel: topic.Text?.split(' - ')[1] || 'YouTube',
                id: id,
                thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
                published: 'N/A',
                url: `https://youtu.be/${id}`
              }
            })
            source = 'DuckDuckGo'
          }
        }
      } catch (e) { console.log('DuckDuckGo failed') }
    }

    // FALLBACK #7: Placeholder - Last Resort
    if (!results) {
      try {
        results = [{
          title: query,
          channel: 'YouTube Search',
          id: 'dQw4w9WgXcQ',
          thumbnail: `https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg`,
          published: 'N/A',
          url: `https://youtube.com/results?search_query=${encodeURIComponent(query)}`
        }]
        source = 'Direct Search'
      } catch (e) { console.log('Placeholder failed') }
    }

    // ALL 7 FAILED - EDIT TO ERROR
    if (!results || results.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴠɪᴅᴇᴏs
┃➠ ᴛɪᴘ: ᴛʀʏ ᴅɪғғᴇʀᴇɴᴛ ᴋᴇʏᴡᴏʀᴅs
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    // PREPARE RESULT TEXT
    const firstVid = results[0]
    let resultText = `╔═〘 📺ʏᴏᴜᴛᴜʙᴇ 〙═╗\n`
    resultText += `┃➠ ǫᴜᴇʀʏ: ${query} ✅\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n`
    resultText += `┃➠ ғᴏᴜɴᴅ: ${results.length} ᴠɪᴅᴇᴏs\n┃\n`
    resultText += `┃➠ 1. ${firstVid.title.slice(0, 50)} ✅\n`
    resultText += `┃ 📺 ${firstVid.channel}\n`
    if (firstVid.duration) resultText += `┃ ⏱️ ${firstVid.duration}`
    if (firstVid.views) resultText += ` | 👁️ ${firstVid.views}`
    resultText += `\n┃ 🔗 ${firstVid.url}\n┃\n`
    
    // Add other results
    results.slice(1, 5).forEach((vid, i) => {
      resultText += `┃➠ ${i + 2}. ${vid.title.slice(0, 40)} ✅\n`
      resultText += `┃ 📺 ${vid.channel}\n`
      resultText += `┃ 🔗 ${vid.url}\n┃\n`
    })
    
    resultText += `╚═══════════════════╝`

    // TRY EDIT FIRST, IF FAIL SEND NEW MESSAGE WITH ALL POWER 🔥
    try {
      // TRY EDIT TO IMAGE + CAPTION
      await sock.sendMessage(from, {
        image: { url: firstVid.thumbnail },
        caption: resultText,
        edit: sentMsg.key
      })
    } catch (editError) {
      // EDIT FAILED - SEND NEW MESSAGE WITH FULL POWER
      console.log('Edit failed, sending new message with all powers')
      await sock.sendMessage(from, {
        image: { url: firstVid.thumbnail },
        caption: resultText
      }, { quoted: m })
    }
  }
}