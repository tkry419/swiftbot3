/**
 * SwiftBot - plugins/commands/search/image.js
 * Image Search - 7 free sources, sends image or fallback message
 * Category: search
 * Usage: image <query>
 * Works in DM + Groups
 */

export default {
  name: 'image',
  alias: ['img', 'pic', 'picture', 'photo'],
  desc: 'Search images - 7 sources, sends image with full power',
  usage: 'image <query>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}image <query>
┃➠ ᴇx: ${prefix}image cat meme
┃➠ ᴇx: ${prefix}image anime wallpaper
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL TRY TO EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🖼️sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ɪᴍᴀɢᴇs... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let results = null
    let source = ''

    // FALLBACK #1: DuckDuckGo Images - Free, No Key
    try {
      const res = await fetch(`https://duckduckgo.com/i.js?q=${encodeURIComponent(query)}&o=json`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.results?.length > 0) {
          results = data.results.slice(0, 5).map(img => ({
            url: img.image,
            title: img.title || query,
            width: img.width,
            height: img.height
          }))
          source = 'DuckDuckGo'
        }
      }
    } catch (e) { console.log('DuckDuckGo failed') }

    // FALLBACK #2: Unsplash API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=5&client_id=free`)
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length > 0) {
            results = data.results.map(img => ({
              url: img.urls.regular || img.urls.small,
              title: img.description || img.alt_description || query,
              width: img.width,
              height: img.height
            }))
            source = 'Unsplash'
          }
        }
      } catch (e) { console.log('Unsplash failed') }
    }

    // FALLBACK #3: Pexels API - Free, No Key
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
              width: img.width,
              height: img.height
            }))
            source = 'Pexels'
          }
        }
      } catch (e) { console.log('Pexels failed') }
    }

    // FALLBACK #4: Pixabay API - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://pixabay.com/api/?key=free&q=${encodeURIComponent(query)}&image_type=photo&per_page=5`)
        if (res.ok) {
          const data = await res.json()
          if (data.hits?.length > 0) {
            results = data.hits.map(img => ({
              url: img.largeImageURL || img.webformatURL,
              title: img.tags || query,
              width: img.imageWidth,
              height: img.imageHeight
            }))
            source = 'Pixabay'
          }
        }
      } catch (e) { console.log('Pixabay failed') }
    }

    // FALLBACK #5: Bing Images - Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://api.bing.microsoft.com/v7.0/images/search?q=${encodeURIComponent(query)}&count=5`, {
          headers: { 'Ocp-Apim-Subscription-Key': 'free' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.value?.length > 0) {
            results = data.value.map(img => ({
              url: img.contentUrl,
              title: img.name || query,
              width: img.width,
              height: img.height
            }))
            source = 'Bing'
          }
        }
      } catch (e) { console.log('Bing failed') }
    }

    // FALLBACK #6: Lorem Picsum - Random HD Images
    if (!results) {
      try {
        results = []
        for (let i = 0; i < 5; i++) {
          results.push({
            url: `https://picsum.photos/800/600?random=${Date.now() + i}`,
            title: `${query} - Random ${i + 1}`,
            width: 800,
            height: 600
          })
        }
        source = 'Lorem Picsum'
      } catch (e) { console.log('Picsum failed') }
    }

    // FALLBACK #7: Placeholder - Last Resort
    if (!results) {
      try {
        results = [{
          url: `https://via.placeholder.com/800x600/FF6B6B/FFFFFF?text=${encodeURIComponent(query)}`,
          title: query,
          width: 800,
          height: 600
        }]
        source = 'Placeholder'
      } catch (e) { console.log('Placeholder failed') }
    }

    // ALL 7 FAILED - EDIT TO ERROR
    if (!results || results.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ɪᴍᴀɢᴇs
┃➠ ᴛɪᴘ: ᴛʀʏ ᴅɪғᴇʀᴇɴᴛ ᴋᴇʏᴡᴏʀᴅs
╚═══════════════════╝`,
        edit: sentMsg.key
      })
    }

    // PREPARE RESULT TEXT
    const firstImg = results[0]
    let resultText = `╔═〘 🖼️ɪᴍᴀɢᴇ 〙═╗\n`
    resultText += `┃➠ ǫᴜᴇʀʏ: ${query} ✅\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n`
    resultText += `┃➠ ғᴏᴜɴᴅ: ${results.length} ɪᴍᴀɢᴇs\n`
    resultText += `┃➠ sɪᴢᴇ: ${firstImg.width}x${firstImg.height}\n┃\n`
    resultText += `┃➠ 1. ${firstImg.title.slice(0, 50)} ✅\n`
    
    // Add other results as links
    results.slice(1, 5).forEach((img, i) => {
      resultText += `┃➠ ${i + 2}. ${img.title.slice(0, 40)} ✅\n`
    })
    
    resultText += `╚═══════════════════╝`

    // TRY EDIT FIRST, IF FAIL SEND NEW MESSAGE WITH ALL POWER 🔥
    try {
      // TRY EDIT TO IMAGE + CAPTION
      await sock.sendMessage(from, {
        image: { url: firstImg.url },
        caption: resultText,
        edit: sentMsg.key
      })
    } catch (editError) {
      // EDIT FAILED - SEND NEW MESSAGE WITH FULL POWER
      console.log('Edit failed, sending new message with all powers')
      await sock.sendMessage(from, {
        image: { url: firstImg.url },
        caption: resultText
      }, { quoted: m })
      
      // ALSO SEND EXTRA IMAGES IF AVAILABLE
      if (results.length > 1) {
        for (let i = 1; i < Math.min(results.length, 4); i++) {
          try {
            await sock.sendMessage(from, {
              image: { url: results[i].url },
              caption: `╔═〘 🖼️ɪᴍᴀɢᴇ ${i + 1} 〙═╗\n┃➠ ${results[i].title.slice(0, 50)} ✅\n╚═══════════════════╝`
            })
            await new Promise(r => setTimeout(r, 1000)) // 1s delay between images
          } catch (e) { console.log(`Failed to send image ${i + 1}`) }
        }
      }
    }
  }
}