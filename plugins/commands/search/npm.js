/**
 * SwiftBot - plugins/commands/search/npm.js
 * NPM Search - Package info with 7 free API fallbacks
 * Category: search
 * Usage: npm <package>
 * Works in DM + Groups
 */

export default {
  name: 'npm',
  alias: ['node', 'package'],
  desc: 'Search NPM packages - 7 sources, never fails',
  usage: 'npm <package-name>',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}npm <package>
┃➠ ᴇx: ${prefix}npm axios
┃➠ ᴇx: ${prefix}npm @whiskeysockets/baileys
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 📦sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴘᴀᴄᴋᴀɢᴇ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ɴᴘᴍ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let source = ''

    // FALLBACK #1: NPM Registry API - 100% Free, No Key
    try {
      const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(query)}`, {
        headers: { 'User-Agent': 'SwiftBot/1.0' }
      })
      
      if (res.ok) {
        const data = await res.json()
        const latest = data['dist-tags']?.latest
        const version = data.versions?.[latest]
        
        if (version) {
          result = {
            name: data.name,
            version: latest,
            description: data.description || 'No description',
            author: version.author?.name || data.author?.name || 'N/A',
            license: version.license || data.license || 'N/A',
            homepage: data.homepage || version.homepage || 'N/A',
            repository: version.repository?.url || data.repository?.url || 'N/A',
            keywords: version.keywords || [],
            dependencies: Object.keys(version.dependencies || {}).length,
            downloads: 'N/A',
            updated: data.time?.[latest]?.split('T')[0] || 'N/A',
            url: `https://www.npmjs.com/package/${data.name}`
          }
          source = 'NPM Registry'
        }
      }
    } catch (e) { console.log('NPM Registry failed') }

    // FALLBACK #2: jsDelivr API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://data.jsdelivr.com/v1/packages/npm/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.name) {
            const pkgRes = await fetch(`https://data.jsdelivr.com/v1/packages/npm/${encodeURIComponent(query)}/stats`)
            const stats = pkgRes.ok? await pkgRes.json() : {}
            
            result = {
              name: data.name,
              version: data.version || 'N/A',
              description: data.description || 'No description',
              author: data.author?.name || 'N/A',
              license: 'N/A',
              homepage: data.homepage || 'N/A',
              repository: data.repository?.url || 'N/A',
              keywords: data.keywords || [],
              dependencies: data.dependencies?.length || 0,
              downloads: stats.total || 'N/A',
              updated: 'N/A',
              url: `https://www.npmjs.com/package/${data.name}`
            }
            source = 'jsDelivr'
          }
        }
      } catch (e) { console.log('jsDelivr failed') }
    }

    // FALLBACK #3: NPMS.io API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api.npms.io/v2/package/${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.collected?.metadata) {
            const meta = data.collected.metadata
            const npm = data.collected.npm
            
            result = {
              name: meta.name,
              version: meta.version,
              description: meta.description || 'No description',
              author: meta.author?.name || 'N/A',
              license: meta.license || 'N/A',
              homepage: meta.links?.homepage || 'N/A',
              repository: meta.links?.repository || 'N/A',
              keywords: meta.keywords || [],
              dependencies: Object.keys(npm?.dependencies || {}).length,
              downloads: npm?.downloads?.[npm.downloads.length - 1]?.count || 'N/A',
              updated: meta.date?.split('T')[0] || 'N/A',
              url: meta.links?.npm || `https://www.npmjs.com/package/${meta.name}`
            }
            source = 'NPMS.io'
          }
        }
      } catch (e) { console.log('NPMS.io failed') }
    }

    // FALLBACK #4: BundlePhobia API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://bundlephobia.com/api/size?package=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.name) {
            result = {
              name: data.name,
              version: data.version,
              description: data.description || 'No description',
              author: 'N/A',
              license: 'N/A',
              homepage: 'N/A',
              repository: data.repository || 'N/A',
              keywords: [],
              dependencies: data.dependencyCount || 0,
              downloads: 'N/A',
              updated: 'N/A',
              url: `https://www.npmjs.com/package/${data.name}`,
              size: data.gzip? `${(data.gzip / 1024).toFixed(1)}KB gzipped` : 'N/A'
            }
            source = 'BundlePhobia'
          }
        }
      } catch (e) { console.log('BundlePhobia failed') }
    }

    // FALLBACK #5: NPM Search API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.objects?.length > 0) {
            const pkg = data.objects[0].package
            result = {
              name: pkg.name,
              version: pkg.version,
              description: pkg.description || 'No description',
              author: pkg.author?.name || 'N/A',
              license: 'N/A',
              homepage: pkg.links?.homepage || 'N/A',
              repository: pkg.links?.repository || 'N/A',
              keywords: pkg.keywords || [],
              dependencies: 'N/A',
              downloads: 'N/A',
              updated: pkg.date?.split('T')[0] || 'N/A',
              url: pkg.links?.npm || `https://www.npmjs.com/package/${pkg.name}`
            }
            source = 'NPM Search'
          }
        }
      } catch (e) { console.log('NPM Search failed') }
    }

    // FALLBACK #6: UNPKG API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://unpkg.com/${encodeURIComponent(query)}/package.json`)
        if (res.ok) {
          const data = await res.json()
          if (data.name) {
            result = {
              name: data.name,
              version: data.version,
              description: data.description || 'No description',
              author: data.author?.name || data.author || 'N/A',
              license: data.license || 'N/A',
              homepage: data.homepage || 'N/A',
              repository: data.repository?.url || data.repository || 'N/A',
              keywords: data.keywords || [],
              dependencies: Object.keys(data.dependencies || {}).length,
              downloads: 'N/A',
              updated: 'N/A',
              url: `https://www.npmjs.com/package/${data.name}`
            }
            source = 'UNPKG'
          }
        }
      } catch (e) { console.log('UNPKG failed') }
    }

    // FALLBACK #7: DuckDuckGo Instant - Last Resort
    if (!result) {
      try {
        const res = await fetch(`https://api.duckduckgo.com/?q=npm+${encodeURIComponent(query)}&format=json&no_html=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.AbstractText) {
            result = {
              name: query,
              version: 'N/A',
              description: data.AbstractText,
              author: 'N/A',
              license: 'N/A',
              homepage: 'N/A',
              repository: 'N/A',
              keywords: [],
              dependencies: 'N/A',
              downloads: 'N/A',
              updated: 'N/A',
              url: data.AbstractURL || `https://www.npmjs.com/package/${query}`
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
┃➠ ᴘᴀᴄᴋᴀɢᴇ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ sᴘᴇʟʟɪɴɢ
┃➠ ᴇx: ${prefix}npm axios
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT ORIGINAL ✅
      })
    }

    // FORMAT WITH TICKS ✅
    let resultText = `╔═〘 📦ɴᴘᴍ 〙═╗\n`
    resultText += `┃➠ ɴᴀᴍᴇ: ${result.name} ✅\n`
    resultText += `┃➠ ᴠᴇʀsɪᴏɴ: ${result.version}\n`
    resultText += `┃➠ ᴀᴜᴛʜᴏʀ: ${result.author}\n`
    resultText += `┃➠ ʟɪᴄᴇɴsᴇ: ${result.license}\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n┃\n`
    resultText += `┃ ${result.description}\n┃\n`
    
    if (result.dependencies!== 'N/A') resultText += `┃➠ ᴅᴇᴘs: ${result.dependencies}\n`
    if (result.downloads!== 'N/A') resultText += `┃➠ ᴅᴏᴡɴʟᴏᴀᴅs: ${result.downloads}\n`
    if (result.size) resultText += `┃➠ sɪᴢᴇ: ${result.size}\n`
    if (result.updated!== 'N/A') resultText += `┃➠ ᴜᴘᴅᴀᴛᴇᴅ: ${result.updated}\n`
    
    if (result.keywords.length > 0) {
      resultText += `┃➠ ᴛᴀɢs: ${result.keywords.slice(0, 5).join(', ')}\n`
    }
    
    resultText += `┃\n┃ 🔗 ${result.url}\n`
    if (result.homepage!== 'N/A') resultText += `┃ 🌐 ${result.homepage}\n`
    if (result.repository!== 'N/A') resultText += `┃ 📂 ${result.repository.replace('git+', '').replace('.git', '')}\n`
    resultText += `╚═══════════════════╝`

    // EDIT THE "SEARCHING..." MESSAGE TO RESULTS
    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}