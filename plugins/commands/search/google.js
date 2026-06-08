/**
 * SwiftBot - plugins/commands/search/google.js
 * Google Search - Web search with free APIs only, message editing
 * Category: search
 * Usage: google <query>
 * Works in DM + Groups
 */

export default {
  name: 'google',
  alias: ['search', 'g', 'web'],
  desc: 'Search the web - Google style results, no API keys needed',
  usage: 'google <query>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}google <query>
┃➠ ᴇx: ${prefix}google best whatsapp bot
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ONE ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🔍sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let results = null
    let source = ''

    // FALLBACK #1: DuckDuckGo Instant Answer API - 100% Free, No Key
    try {
      const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      const data = await res.json()
      
      if (data.AbstractText || data.RelatedTopics?.length > 0) {
        results = []
        if (data.AbstractText) {
          results.push({
            title: data.Heading || query,
            snippet: data.AbstractText,
            link: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
          })
        }
        data.RelatedTopics.slice(0, 4).forEach(topic => {
          if (topic.Text && topic.FirstURL) {
            results.push({
              title: topic.Text.split(' - ')[0].slice(0, 50),
              snippet: topic.Text,
              link: topic.FirstURL
            })
          }
        })
        if (results.length > 0) source = 'DuckDuckGo'
      }
    } catch (e) {
      console.log('DuckDuckGo failed:', e.message)
    }

    // FALLBACK #2: Wikipedia OpenSearch API - 100% Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=5&format=json&origin=*`)
        const data = await res.json()
        
        if (data[1]?.length > 0) {
          results = data[1].map((title, i) => ({
            title: title,
            snippet: data[2][i] || 'No description available',
            link: data[3][i]
          }))
          source = 'Wikipedia'
        }
      } catch (e) {
        console.log('Wikipedia failed:', e.message)
      }
    }

    // FALLBACK #3: SearXNG Public Instance - 100% Free, No Key
    if (!results) {
      try {
        const res = await fetch(`https://searx.be/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=en`)
        const data = await res.json()
        
        if (data.results?.length > 0) {
          results = data.results.slice(0, 5).map(r => ({
            title: r.title,
            snippet: r.content || 'No description',
            link: r.url
          }))
          source = 'SearXNG'
        }
      } catch (e) {
        console.log('SearXNG failed:', e.message)
      }
    }

    // ALL FAILED - EDIT MESSAGE TO ERROR
    if (!results || results.length === 0) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴀʟ sᴇᴀʀᴄʜ sᴏᴜʀᴄᴇs ᴅᴏᴡɴ
┃➠ ǫᴜᴇʀʏ: ${query}
┃➠ ᴛʀʏ ᴀɢᴀɪɴ ʟᴀᴛᴇʀ
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT THE ORIGINAL MESSAGE ✅
      })
    }

    // FORMAT RESULTS WITH TICKS ✅ + EXTRA FEATURES
    let resultText = `╔═〘 🔍ɢᴏᴏɢʟᴇ 〙═╗\n┃➠ ǫᴜᴇʀʏ: ${query}\n┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n┃➠ ʀᴇsᴜʟᴛs: ${results.length}\n┃\n`
    
    results.slice(0, 5).forEach((r, i) => {
      const shortSnippet = r.snippet.length > 90? r.snippet.slice(0, 90) + '...' : r.snippet
      resultText += `┃➠ ${i + 1}. ${r.title} ✅\n`
      resultText += `┃ ${shortSnippet}\n`
      resultText += `┃ 🔗 ${r.link}\n┃\n`
    })
    
    resultText += `┃➠ ᴛɪᴘ: ᴜsᴇ ${prefix}wiki ғᴏʀ ᴅᴇᴛᴀɪʟs\n╚═══════════════════╝`

    // EDIT THE "SEARCHING..." MESSAGE TO RESULTS - NO DELETE ✅
    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}