/**
 * SwiftBot - plugins/commands/search/wiki.js
 * Wikipedia Search - Summary + thumbnail with free API fallbacks
 * Category: search
 * Usage: wiki <query>
 * Works in DM + Groups
 */

export default {
  name: 'wiki',
  alias: ['wikipedia', 'wk'],
  desc: 'Search Wikipedia - Get article summary with image',
  usage: 'wiki <query>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}wiki <query>
┃➠ ᴇx: ${prefix}wiki nigeria
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📚sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let source = ''

    // FALLBACK #1: Wikipedia REST API - Summary endpoint, 100% Free
    try {
      const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      
      if (res.ok) {
        const data = await res.json()
        if (!data.title.includes('Not found')) {
          result = {
            title: data.title,
            extract: data.extract,
            thumbnail: data.thumbnail?.source || null,
            url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
            lang: data.lang
          }
          source = 'Wikipedia REST'
        }
      }
    } catch (e) {
      console.log('Wiki REST failed:', e.message)
    }

    // FALLBACK #2: MediaWiki API - OpenSearch, 100% Free
    if (!result) {
      try {
        const searchRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*&srlimit=1`)
        const searchData = await searchRes.json()
        
        if (searchData.query?.search?.length > 0) {
          const pageTitle = searchData.query.search[0].title
          const pageRes = await fetch(`https://en.wikipedia.org/w/api.php?action=query&prop=extracts|pageimages|info&exintro=1&explaintext=1&pithumbsize=500&inprop=url&titles=${encodeURIComponent(pageTitle)}&format=json&origin=*`)
          const pageData = await pageRes.json()
          
          const pages = pageData.query?.pages
          const pageId = Object.keys(pages)[0]
          const page = pages[pageId]
          
          if (page &&!page.missing) {
            result = {
              title: page.title,
              extract: page.extract || 'No summary available',
              thumbnail: page.thumbnail?.source || null,
              url: page.fullurl || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`,
              lang: 'en'
            }
            source = 'MediaWiki API'
          }
        }
      } catch (e) {
        console.log('MediaWiki failed:', e.message)
      }
    }

    // FALLBACK #3: DBpedia - Semantic Wikipedia, 100% Free
    if (!result) {
      try {
        const res = await fetch(`https://dbpedia.org/data/${encodeURIComponent(query.replace(/ /g, '_'))}.json`)
        const data = await res.json()
        const key = Object.keys(data)[0]
        
        if (data[key]) {
          const abstracts = data[key]['http://dbpedia.org/ontology/abstract']
          const englishAbstract = abstracts?.find(a => a.lang === 'en')?.value
          
          if (englishAbstract) {
            result = {
              title: query,
              extract: englishAbstract,
              thumbnail: null,
              url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`,
              lang: 'en'
            }
            source = 'DBpedia'
          }
        }
      } catch (e) {
        console.log('DBpedia failed:', e.message)
      }
    }

    // ALL FAILED - EDIT TO ERROR
    if (!result) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ɴᴏᴛ ғᴏᴜɴᴅ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ ɴᴏ ᴡɪᴋɪ ᴀʀᴛɪᴄʟᴇ ғᴏᴜɴᴅ
┃➠ ᴛʀʏ: ${prefix}google ${query}
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT ORIGINAL ✅
      })
    }

    // FORMAT WITH TICKS ✅ + THUMBNAIL
    const shortExtract = result.extract.length > 400? result.extract.slice(0, 400) + '...' : result.extract
    
    let resultText = `╔═〘 📚ᴡɪᴋɪᴘᴇᴅɪᴀ 〙═╗\n`
    resultText += `┃➠ ᴛɪᴛʟᴇ: ${result.title} ✅\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n`
    resultText += `┃➠ ʟᴀɴɢ: ${result.lang.toUpperCase()}\n┃\n`
    resultText += `┃ ${shortExtract}\n┃\n`
    resultText += `┃ 🔗 ${result.url}\n`
    resultText += `╚═══════════════════╝`

    // IF THUMBNAIL EXISTS - SEND WITH IMAGE
    if (result.thumbnail) {
      try {
        return await sock.sendMessage(from, {
          image: { url: result.thumbnail },
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

    // NO THUMBNAIL - EDIT TO TEXT ONLY
    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}