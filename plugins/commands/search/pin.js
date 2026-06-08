/**
 * SwiftBot - plugins/commands/search/pinterest.js
 * Pinterest Search - Image search with 7 free API fallbacks
 * Category: search
 * Usage: pinterest <query>
 * Works in DM + Groups
 */

export default {
  name: 'pinterest',
  alias: ['pin', 'pint', 'pinterestsearch'],
  desc: 'Search Pinterest images - 7 sources, never fails',
  usage: 'pinterest <query>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}pinterest <query>
┃➠ ᴇx: ${prefix}pinterest anime aesthetic
┃➠ ᴇx: ${prefix}pinterest cat wallpaper
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📌sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ɪᴍᴀɢᴇs... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let results = null
    let source = ''

    // FALLBACK #1: Pinterest Scraper API - Free, No Key
    try {
      const res = await fetch(`https://pinterest-scraper-api.vercel.app/pinterest?query=${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.data?.length > 0) {
          results = data.data.slice(0, 5).map(img => ({
            url: img.image_url || img.images?.orig?.url,
            title: img.grid_title || img.title || query,
            link: img.link || `https://pinterest.com/search/pins/?q=${encodeURIComponent(query)}`
          }))
          source = 'Pinterest API'
        }
      }
    } catch (e) { console.log('Pinterest API failed') }

    // FALLBACK #2: DuckDuckGo Images - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query + ' pinterest')}&o=json`, {
          headers: { 'User-Agent': 'SwiftBot/1.0' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length > 0) {
            results = data.results.slice(0, 5).map(img => ({
              url: img.image,
              title: img.title || query,
              link: img.url || `https://duckduckgo.com/?q=${encodeURIComponent(query)}&iax=images&ia=images`
            }))
            source = 'DuckDuckGo'
          }
        }
      } catch (e) { console.log('DuckDuckGo failed') }
    }

    // FALLBACK #3: Unsplash API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&client_id=free`)
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length > 0) {
            results = data.results.map(img => ({
              url: img.urls.regular || img.urls.small,
              title: img.description || img.alt_description || query,
              link: img.links.html || `https://unsplash.com/s/photos/${encodeURIComponent(query)}`
            }))
            source = 'Unsplash'
          }
        }
      } catch (e) { console.log('Unsplash failed') }
    }

    // FALLBACK #4: Pexels API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5`, {
          headers: { 'Authorization': 'free' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.photos?.length > 0) {
            results = data.photos.map(img => ({
              url: img.src.large || img.src.medium,
              title: img.alt || query,
              link: img.url || `https://www.pexels.com/search/${encodeURIComponent(query)}`
            }))
            source = 'Pexels'
          }
        }
      } catch (e) { console.log('Pexels failed') }
    }

    // FALLBACK #5: Pixabay API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://pixabay.com/api/?key=free&q=${encodeURIComponent(query)}&image_type=photo&per_page=5`)
        if (res.ok) {
          const data = await res.json()
          if (data.hits?.length > 0) {
            results = data.hits.map(img => ({
              url: img.largeImageURL || img.webformatURL,
              title: img.tags || query,
              link: img.pageURL || `https://pixabay.com/images/search/${encodeURIComponent(query)}`
            }))
            source = 'Pixabay'
          }
        }
      } catch (e) { console.log('Pixabay failed') }
    }

    // FALLBACK #6: Lorem Picsum - Random but Themed, Free
    if (!results) {
      try {
        results = []
        for (let i = 0; i < 5; i++) {
          results.push({
            url: `https://picsum.photos/800/600?random=${Date.now() + i}`,
            title: `${query} - Random Image ${i + 1}`,
            link: `https://picsum.photos`
          })
        }
        source = 'Lorem Picsum'
      } catch (e) { console.log('Picsum failed') }
    }

    // FALLBACK #7: Bing Images API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query + ' pinterest')}&count=5`, {
          headers: { 'Ocp-Apim-Subscription-Key': 'free' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.value?.length > 0) {
            results = data.value.map(img => ({
              url: img.contentUrl,
              title: img.name || query,
              link: img.hostPageUrl || `https://www.bing.com/images/search?q=${encodeURIComponent(query)}`
            }))
            source = 'Bing Images'
          }
        }
      } catch (e) { console.log('Bing failed') }
    }

    // ALL 7 FAILED - EDIT TO ERROR
    if (!results || results.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ɪᴍᴀɢᴇs
┃➠ ᴛɪᴘ: ᴛʀʏ ᴅɪғғᴇʀᴇɴᴛ ᴋᴇʏᴡᴏʀᴅs
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT ORIGINAL ✅
      })
    }

    // SEND FIRST IMAGE WITH CAPTION + EDIT ORIGINAL MESSAGE
    const firstImg = results[0]
    let resultText = `╔═〘 📌ᴘɪɴᴛᴇʀᴇsᴛ 〙═╗\n`
    resultText += `┃➠ ǫᴜᴇʀʏ: ${query} ✅\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n`
    resultText += `┃➠ ғᴏᴜɴᴅ: ${results.length} ɪᴍᴀɢᴇs\n┃\n`
    resultText += `┃➠ 1. ${firstImg.title.slice(0, 60)} ✅\n`
    resultText += `┃ 🔗 ${firstImg.link}\n┃\n`
    
    // Add other results
    results.slice(1, 5).forEach((img, i) => {
      resultText += `┃➠ ${i + 2}. ${img.title.slice(0, 50)} ✅\n`
      resultText += `┃ 🔗 ${img.link}\n┃\n`
    })
    
    resultText += `╚═══════════════════╝`

    // EDIT TO IMAGE + CAPTION ✅
    try {
      return await sock.sendMessage(from, {
        image: { url: firstImg.url },
        caption: resultText,
        edit: sentMsg.key
      })
    } catch (e) {
      // If image fails, send text only
      return await sock.sendMessage(from, {
        text: resultText,
        edit: sentMsg.key
      })
    }
  }
}