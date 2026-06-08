/**
 * SwiftBot - plugins/commands/search/playstore.js
 * Play Store Search - Android apps with 7 free API fallbacks
 * Category: search
 * Usage: playstore <app name>
 * Works in DM + Groups
 */

export default {
  name: 'playstore',
  alias: ['play', 'store', 'app'],
  desc: 'Search Google Play Store apps - 7 sources, never fails',
  usage: 'playstore <app name>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}playstore <app>
┃➠ ᴇx: ${prefix}playstore whatsapp
┃➠ ᴇx: ${prefix}playstore pubg mobile
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📱sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴀᴘ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴘʟᴀʏ sᴛᴏʀᴇ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let source = ''

    // FALLBACK #1: Google Play Scraper API - Free, No Key
    try {
      const res = await fetch(`https://playstore-api.vercel.app/search?query=${encodeURIComponent(query)}&limit=1`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      if (res.ok) {
        const data = await res.json()
        if (data.data?.length > 0) {
          const app = data.data[0]
          result = {
            name: app.title,
            developer: app.developer,
            rating: app.score? `${app.score.toFixed(1)}/5` : 'N/A',
            installs: app.installs || 'N/A',
            size: app.size || 'N/A',
            version: app.version || 'N/A',
            price: app.price === 0? 'Free' : app.price || 'N/A',
            category: app.genre || 'N/A',
            description: app.description || 'No description',
            icon: app.icon,
            url: app.url || `https://play.google.com/store/apps/details?id=${app.appId}`,
            updated: app.updated || 'N/A'
          }
          source = 'PlayStore API'
        }
      }
    } catch (e) { console.log('PlayStore API failed') }

    // FALLBACK #2: AppBrain API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api.appbrain.com/v1/apps/search?q=${encodeURIComponent(query)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.results?.length > 0) {
            const app = data.results[0]
            result = {
              name: app.title,
              developer: app.developer,
              rating: app.rating? `${app.rating.toFixed(1)}/5` : 'N/A',
              installs: app.installs || 'N/A',
              size: app.size || 'N/A',
              version: app.version || 'N/A',
              price: app.price === 0? 'Free' : `$${app.price}` || 'N/A',
              category: app.category || 'N/A',
              description: app.description || 'No description',
              icon: app.icon,
              url: `https://play.google.com/store/apps/details?id=${app.package}`,
              updated: app.updated || 'N/A'
            }
            source = 'AppBrain'
          }
        }
      } catch (e) { console.log('AppBrain failed') }
    }

    // FALLBACK #3: APKPure Search - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://apkpure-api.vercel.app/search?q=${encodeURIComponent(query)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.length > 0) {
            const app = data.data[0]
            result = {
              name: app.title,
              developer: app.developer || 'N/A',
              rating: app.rating? `${app.rating}/5` : 'N/A',
              installs: app.downloads || 'N/A',
              size: app.size || 'N/A',
              version: app.version || 'N/A',
              price: 'Free',
              category: app.category || 'N/A',
              description: app.description || 'No description',
              icon: app.icon,
              url: app.url || `https://apkpure.com/search?q=${encodeURIComponent(query)}`,
              updated: app.updated || 'N/A'
            }
            source = 'APKPure'
          }
        }
      } catch (e) { console.log('APKPure failed') }
    }

    // FALLBACK #4: APKCombo API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://apkcombo.com/search/${encodeURIComponent(query)}`)
        if (res.ok) {
          const text = await res.text()
          // Basic parse for app name
          const nameMatch = text.match(/<h1[^>]*>([^<]+)<\/h1>/)
          if (nameMatch) {
            result = {
              name: nameMatch[1],
              developer: 'N/A',
              rating: 'N/A',
              installs: 'N/A',
              size: 'N/A',
              version: 'N/A',
              price: 'Free',
              category: 'N/A',
              description: 'Found on APKCombo',
              icon: null,
              url: `https://apkcombo.com/search/${encodeURIComponent(query)}`,
              updated: 'N/A'
            }
            source = 'APKCombo'
          }
        }
      } catch (e) { console.log('APKCombo failed') }
    }

    // FALLBACK #5: APKMirror Search - Free
    if (!result) {
      try {
        const res = await fetch(`https://www.apkmirror.com/?s=${encodeURIComponent(query)}&post_type=app_release`)
        if (res.ok) {
          const text = await res.text()
          const nameMatch = text.match(/class="appRowTitle[^>]*>([^<]+)</)
          if (nameMatch) {
            result = {
              name: nameMatch[1],
              developer: 'N/A',
              rating: 'N/A',
              installs: 'N/A',
              size: 'N/A',
              version: 'N/A',
              price: 'Free',
              category: 'N/A',
              description: 'Found on APKMirror',
              icon: null,
              url: `https://www.apkmirror.com/?s=${encodeURIComponent(query)}`,
              updated: 'N/A'
            }
            source = 'APKMirror'
          }
        }
      } catch (e) { console.log('APKMirror failed') }
    }

    // FALLBACK #6: FDroid API - Free, Open Source Apps
    if (!result) {
      try {
        const res = await fetch(`https://f-droid.org/api/v1/packages/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.packageName) {
            result = {
              name: data.metadata?.name || query,
              developer: data.metadata?.authorName || 'N/A',
              rating: 'N/A',
              installs: 'N/A',
              size: 'N/A',
              version: data.suggestedVersionName || 'N/A',
              price: 'Free',
              category: data.metadata?.categories?.[0] || 'N/A',
              description: data.metadata?.summary || 'F-Droid app',
              icon: data.metadata?.icon? `https://f-droid.org/repo/${data.metadata.icon}` : null,
              url: `https://f-droid.org/packages/${data.packageName}`,
              updated: 'N/A'
            }
            source = 'F-Droid'
          }
        }
      } catch (e) { console.log('F-Droid failed') }
    }

    // FALLBACK #7: DuckDuckGo Instant - Last Resort
    if (!result) {
      try {
        const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' android app')}&format=json&no_html=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.AbstractText) {
            result = {
              name: data.Heading || query,
              developer: 'N/A',
              rating: 'N/A',
              installs: 'N/A',
              size: 'N/A',
              version: 'N/A',
              price: 'N/A',
              category: 'N/A',
              description: data.AbstractText,
              icon: data.Image || null,
              url: data.AbstractURL || `https://play.google.com/store/search?q=${encodeURIComponent(query)}`,
              updated: 'N/A'
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
┃➠ ᴀᴘᴘ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ sᴘᴇʟʟɪɴɢ
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT ORIGINAL ✅
      })
    }

    // FORMAT WITH TICKS ✅ + ICON
    const shortDesc = result.description.length > 300? result.description.slice(0, 300) + '...' : result.description
    
    let resultText = `╔═〘 📱ᴘʟᴀʏ sᴛᴏʀᴇ 〙═╗\n`
    resultText += `┃➠ ɴᴀᴍᴇ: ${result.name} ✅\n`
    resultText += `┃➠ ᴅᴇᴠ: ${result.developer}\n`
    resultText += `┃➠ ʀᴀᴛɪɴɢ: ${result.rating} | ɪɴsᴛᴀʟs: ${result.installs}\n`
    resultText += `┃➠ sɪᴢᴇ: ${result.size} | ᴠᴇʀsɪᴏɴ: ${result.version}\n`
    resultText += `┃➠ ᴘʀɪᴄᴇ: ${result.price} | ᴄᴀᴛ: ${result.category}\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n┃\n`
    resultText += `┃ ${shortDesc}\n┃\n`
    if (result.updated!== 'N/A') resultText += `┃➠ ᴜᴘᴅᴀᴛᴇᴅ: ${result.updated}\n`
    resultText += `┃ 🔗 ${result.url}\n`
    resultText += `╚═══════════════════╝`

    // IF ICON EXISTS - SEND WITH IMAGE
    if (result.icon && result.icon.startsWith('http')) {
      try {
        return await sock.sendMessage(from, {
          image: { url: result.icon },
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

    // NO ICON - EDIT TO TEXT ONLY
    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}