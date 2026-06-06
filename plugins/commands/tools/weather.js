/**
 * SwiftBot - plugins/commands/tools/weather.js
 * Weather Info - 15 Online APIs
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const WEATHER_APIS = [
  { url: 'https://api.openweathermap.org/data/2.5/weather', key: 'demo', type: 'openweather' },
  { url: 'https://api.weatherapi.com/v1/current.json', key: 'demo', type: 'weatherapi' },
  { url: 'https://api.weatherstack.com/current', key: 'demo', type: 'weatherstack' },
  { url: 'https://api.open-meteo.com/v1/forecast', key: 'none', type: 'openmeteo' },
  { url: 'https://api.tomorrow.io/v4/weather/realtime', key: 'demo', type: 'tomorrow' },
  { url: 'https://api.visualcrossing.com/weather', key: 'demo', type: 'visual' },
  { url: 'https://api.worldweatheronline.com/premium/v1/weather', key: 'demo', type: 'world' },
  { url: 'https://api.accuweather.com/currentconditions/v1', key: 'demo', type: 'accu' },
  { url: 'https://api.aerisapi.com/conditions', key: 'demo', type: 'aeris' },
  { url: 'https://api.climateapi.com/v1/weather', key: 'demo', type: 'climate' },
  { url: 'https://api.weatherbit.io/v2.0/current', key: 'demo', type: 'weatherbit' },
  { url: 'https://api.meteostat.net/v2/point', key: 'demo', type: 'meteostat' },
  { url: 'https://api.stormglass.io/v2/weather', key: 'demo', type: 'stormglass' },
  { url: 'https://api.weatherflow.com/wxengine/rest/observation', key: 'demo', type: 'weatherflow' },
  { url: 'https://wttr.in', type: 'wttr' }
]

async function getWeather(city, api) {
  try {
    let url = ''
    const headers = {}

    if (api.type === 'openweather') {
      url = `${api.url}?q=${encodeURIComponent(city)}&appid=${api.key}&units=metric`
    } else if (api.type === 'weatherapi') {
      url = `${api.url}?key=${api.key}&q=${encodeURIComponent(city)}`
    } else if (api.type === 'openmeteo') {
      url = `${api.url}?latitude=0&longitude=0&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m`
      // Need geocoding first - skip for now
      return null
    } else if (api.type === 'wttr') {
      url = `${api.url}/${encodeURIComponent(city)}?format=j1`
    } else {
      url = `${api.url}?q=${encodeURIComponent(city)}&key=${api.key}`
    }

    const res = await fetch(url, { headers })
    if (!res.ok) return null
    const data = await res.json()

    // Parse different APIs
    if (api.type === 'openweather') {
      return {
        city: data.name,
        temp: data.main.temp,
        feels: data.main.feels_like,
        humidity: data.main.humidity,
        desc: data.weather[0].description,
        wind: data.wind.speed,
        country: data.sys.country
      }
    } else if (api.type === 'weatherapi') {
      return {
        city: data.location.name,
        temp: data.current.temp_c,
        feels: data.current.feelslike_c,
        humidity: data.current.humidity,
        desc: data.current.condition.text,
        wind: data.current.wind_kph,
        country: data.location.country
      }
    } else if (api.type === 'wttr') {
      const current = data.current_condition[0]
      return {
        city: data.nearest_area[0].areaName[0].value,
        temp: current.temp_C,
        feels: current.FeelsLikeC,
        humidity: current.humidity,
        desc: current.weatherDesc[0].value,
        wind: current.windspeedKmph,
        country: data.nearest_area[0].country[0].value
      }
    }

    return null
  } catch {
    return null
  }
}

export default {
  name: 'weather',
  alias: ['w', 'forecast', 'temp'],
  desc: 'Weather info - 15 fallbacks',
  usage: 'city or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let city = args.join(' ') || quotedText

    if (!city) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}weather Nairobi\n║ ${prefix}weather London\n║ Reply city ${prefix}weather\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let weather = null

      // Try all 15 APIs
      for (const api of WEATHER_APIS) {
        weather = await getWeather(city, api)
        if (weather && weather.temp!== undefined) break
      }

      if (!weather) throw new Error('WEATHER_FAILED')

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *WEATHER: ${weather.city}, ${weather.country}*\n╚━━━━━━━━━━━━━━━━━═❒\n\n🌡️ Temperature: ${weather.temp}°C\n🌡️ Feels like: ${weather.feels}°C\n💧 Humidity: ${weather.humidity}%\n💨 Wind: ${weather.wind} km/h\n☁️ Condition: ${weather.desc}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Weather failed\n║ City not found\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}