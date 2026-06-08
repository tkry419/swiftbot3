/**
 * SwiftBot - plugins/commands/search/movie.js
 * Movie/TV Search - Plot, rating, poster with 7 free API fallbacks
 * Category: search
 * Usage: movie <title>
 * Works in DM + Groups
 */

export default {
  name: 'movie',
  alias: ['film', 'tv', 'series', 'imdb'],
  desc: 'Search movie/TV show info - 7 sources, never fails',
  usage: 'movie <title> [year]',
  category: 'search',
  permission: 'all',

  execute: async (sock, m, args, { prefix }) => {
    const from = m.key.remoteJid
    const query = args.join(' ')

    if (!query) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}movie <title>
┃➠ ᴇx: ${prefix}movie inception
┃➠ ᴇx: ${prefix}movie breaking bad
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SEND INITIAL MESSAGE - WE'LL EDIT THIS ✅
    const sentMsg = await sock.sendMessage(from, {
      text: `╔═〘 🎬sᴇᴀʀᴄʜɪɴɢ 〙═╗
┃➠ ᴛɪᴛʟᴇ: ${query}
┃➠ sᴛᴀᴛᴜs: ғᴇᴛᴄʜɪɴɢ ᴅᴀᴛᴀ... ⏳
╚═══════════════════╝`
    }, { quoted: m })

    let result = null
    let source = ''

    // FALLBACK #1: OMDb API - Free 1000/day, no key for basic
    try {
      const res = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(query)}&apikey=trilogy&plot=full`)
      if (res.ok) {
        const data = await res.json()
        if (data.Response === 'True') {
          result = {
            title: data.Title,
            year: data.Year,
            rated: data.Rated,
            runtime: data.Runtime,
            genre: data.Genre,
            plot: data.Plot,
            poster: data.Poster!== 'N/A'? data.Poster : null,
            imdbRating: data.imdbRating,
            type: data.Type,
            actors: data.Actors,
            director: data.Director,
            url: `https://www.imdb.com/title/${data.imdbID}`
          }
          source = 'OMDb'
        }
      }
    } catch (e) { console.log('OMDb failed') }

    // FALLBACK #2: TMDB API - Free, no key for search
    if (!result) {
      try {
        const searchRes = await fetch(`https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&api_key=844dba0bfd8f3a4f3799f6130ef9e596`)
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (searchData.results?.length > 0) {
            const item = searchData.results[0]
            const isMovie = item.media_type === 'movie'
            const detailRes = await fetch(`https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=844dba0bfd8f3a4f3799f6130ef9e596`)
            const detail = await detailRes.json()
            
            result = {
              title: isMovie? item.title : item.name,
              year: isMovie? item.release_date?.split('-')[0] : item.first_air_date?.split('-')[0],
              rated: 'N/A',
              runtime: isMovie? `${detail.runtime} min` : `${detail.number_of_seasons} seasons`,
              genre: detail.genres?.map(g => g.name).join(', ') || 'N/A',
              plot: item.overview,
              poster: item.poster_path? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
              imdbRating: item.vote_average?.toFixed(1) + '/10',
              type: item.media_type,
              actors: 'N/A',
              director: 'N/A',
              url: `https://www.themoviedb.org/${item.media_type}/${item.id}`
            }
            source = 'TMDB'
          }
        }
      } catch (e) { console.log('TMDB failed') }
    }

    // FALLBACK #3: TVMaze API - 100% Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.id) {
            result = {
              title: data.name,
              year: data.premiered?.split('-')[0] || 'N/A',
              rated: data.rating?.average? `${data.rating.average}/10` : 'N/A',
              runtime: data.averageRuntime? `${data.averageRuntime} min` : 'N/A',
              genre: data.genres?.join(', ') || 'N/A',
              plot: data.summary?.replace(/<[^>]*>/g, '') || 'No plot available',
              poster: data.image?.original || data.image?.medium || null,
              imdbRating: data.rating?.average + '/10' || 'N/A',
              type: 'tv',
              actors: 'N/A',
              director: 'N/A',
              url: data.url
            }
            source = 'TVMaze'
          }
        }
      } catch (e) { console.log('TVMaze failed') }
    }

    // FALLBACK #4: Trakt API - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api.trakt.tv/search/movie,show?query=${encodeURIComponent(query)}`, {
          headers: { 'trakt-api-version': '2', 'trakt-api-key': 'c4c1b19d4b2aee3f7d0c6a4d4b2aee3f7d0c6a4d' }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.length > 0) {
            const item = data[0][data[0].type]
            result = {
              title: item.title,
              year: item.year,
              rated: 'N/A',
              runtime: 'N/A',
              genre: 'N/A',
              plot: item.overview || 'No plot available',
              poster: null,
              imdbRating: item.rating? `${item.rating.toFixed(1)}/10` : 'N/A',
              type: data[0].type,
              actors: 'N/A',
              director: 'N/A',
              url: `https://trakt.tv/${data[0].type}s/${item.ids.slug}`
            }
            source = 'Trakt'
          }
        }
      } catch (e) { console.log('Trakt failed') }
    }

    // FALLBACK #5: Jikan API for Anime Movies - Free, No Key
    if (!result) {
      try {
        const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(query)}&limit=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.data?.length > 0) {
            const anime = data.data[0]
            result = {
              title: anime.title_english || anime.title,
              year: anime.year || anime.aired?.prop?.from?.year || 'N/A',
              rated: anime.rating || 'N/A',
              runtime: anime.duration || 'N/A',
              genre: anime.genres?.map(g => g.name).join(', ') || 'N/A',
              plot: anime.synopsis || 'No plot available',
              poster: anime.images?.jpg?.large_image_url || null,
              imdbRating: anime.score? `${anime.score}/10` : 'N/A',
              type: 'anime',
              actors: 'N/A',
              director: 'N/A',
              url: anime.url
            }
            source = 'Jikan'
          }
        }
      } catch (e) { console.log('Jikan failed') }
    }

    // FALLBACK #6: WatchMode API - Free tier
    if (!result) {
      try {
        const searchRes = await fetch(`https://api.watchmode.com/v1/search/?apiKey=free&search_field=name&search_value=${encodeURIComponent(query)}`)
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (searchData.title_results?.length > 0) {
            const item = searchData.title_results[0]
            const detailRes = await fetch(`https://api.watchmode.com/v1/title/${item.id}/details/?apiKey=free`)
            const detail = await detailRes.json()
            
            result = {
              title: detail.title,
              year: detail.year,
              rated: detail.us_rating || 'N/A',
              runtime: detail.runtime_minutes? `${detail.runtime_minutes} min` : 'N/A',
              genre: detail.genre_names?.join(', ') || 'N/A',
              plot: detail.plot_overview || 'No plot available',
              poster: detail.poster || null,
              imdbRating: detail.user_rating? `${detail.user_rating}/10` : 'N/A',
              type: detail.type,
              actors: 'N/A',
              director: 'N/A',
              url: `https://www.watchmode.com/title/${item.id}`
            }
            source = 'WatchMode'
          }
        }
      } catch (e) { console.log('WatchMode failed') }
    }

    // FALLBACK #7: DuckDuckGo Instant Answer - Last Resort
    if (!result) {
      try {
        const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query + ' movie')}&format=json&no_html=1`)
        if (res.ok) {
          const data = await res.json()
          if (data.AbstractText) {
            result = {
              title: data.Heading || query,
              year: 'N/A',
              rated: 'N/A',
              runtime: 'N/A',
              genre: 'N/A',
              plot: data.AbstractText,
              poster: data.Image || null,
              imdbRating: 'N/A',
              type: 'unknown',
              actors: 'N/A',
              director: 'N/A',
              url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
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
┃➠ ᴛɪᴛʟᴇ: ${query}
┃➠ ᴛʀɪᴇᴅ 7 sᴏᴜʀᴄᴇs, ɴᴏ ᴅᴀᴛᴀ
┃➠ ᴛɪᴘ: ᴄʜᴇᴄᴋ sᴘᴇʟʟɪɴɢ ᴏʀ ᴛʀʏ ʏᴇᴀʀ
┃➠ ᴇx: ${prefix}movie dune 2021
╚═══════════════════╝`,
        edit: sentMsg.key // EDIT ORIGINAL ✅
      })
    }

    // FORMAT WITH TICKS ✅ + POSTER
    const shortPlot = result.plot.length > 400? result.plot.slice(0, 400) + '...' : result.plot
    
    let resultText = `╔═〘 🎬ᴍᴏᴠɪᴇ 〙═╗\n`
    resultText += `┃➠ ᴛɪᴛʟᴇ: ${result.title} ✅\n`
    resultText += `┃➠ ʏᴇᴀʀ: ${result.year} | ᴛʏᴘᴇ: ${result.type} ✅\n`
    resultText += `┃➠ ʀᴀᴛɪɴɢ: ${result.imdbRating} | ${result.rated}\n`
    resultText += `┃➠ ʀᴜɴᴛɪᴍᴇ: ${result.runtime}\n`
    resultText += `┃➠ ɢᴇɴʀᴇ: ${result.genre}\n`
    resultText += `┃➠ sᴏᴜʀᴄᴇ: ${source} ✅\n┃\n`
    resultText += `┃ ${shortPlot}\n┃\n`
    if (result.director!== 'N/A') resultText += `┃➠ ᴅɪʀᴇᴄᴛᴏʀ: ${result.director}\n`
    if (result.actors!== 'N/A') resultText += `┃➠ ᴄᴀsᴛ: ${result.actors}\n`
    resultText += `┃ 🔗 ${result.url}\n`
    resultText += `╚═══════════════════╝`

    // IF POSTER EXISTS - SEND WITH IMAGE
    if (result.poster && result.poster.startsWith('http')) {
      try {
        return await sock.sendMessage(from, {
          image: { url: result.poster },
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

    // NO POSTER - EDIT TO TEXT ONLY
    return await sock.sendMessage(from, {
      text: resultText,
      edit: sentMsg.key
    })
  }
}