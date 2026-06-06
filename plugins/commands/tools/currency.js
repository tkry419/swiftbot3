/**
 * SwiftBot - plugins/commands/tools/currency.js
 * Currency Converter - 15 Online APIs
 * English only - vs Bot
 */

import fetch from 'node-fetch'

const CURRENCY_APIS = [
  'https://api.exchangerate-api.com/v4/latest',
  'https://api.exchangerate.host/latest',
  'https://open.er-api.com/v6/latest',
  'https://api.frankfurter.app/latest',
  'https://api.currencyapi.com/v3/latest',
  'https://api.fxratesapi.com/latest',
  'https://api.coinbase.com/v2/exchange-rates',
  'https://api.freecurrencyapi.com/v1/latest',
  'https://api.currencyfreaks.com/latest',
  'https://api.fastforex.io/fetch-all',
  'https://api.currencylayer.com/live',
  'https://api.exchangeratesapi.io/v1/latest',
  'https://api.currencybeacon.com/v1/latest',
  'https://api.currenciesapi.com/v1/latest',
  'https://api.cambio.today/v1/quotes'
]

async function convertCurrency(amount, from, to, apiUrl) {
  try {
    let url = `${apiUrl}/${from.toUpperCase()}`
    if (apiUrl.includes('frankfurter')) {
      url = `${apiUrl}?from=${from.toUpperCase()}&to=${to.toUpperCase()}`
    } else if (apiUrl.includes('coinbase')) {
      url = `${apiUrl}?currency=${from.toUpperCase()}`
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'SwiftBot/1.0' }
    })

    if (!res.ok) return null
    const data = await res.json()

    let rate = null
    if (data.rates) {
      rate = data.rates[to.toUpperCase()]
    } else if (data.data?.rates) {
      rate = data.data.rates[to.toUpperCase()]
    } else if (data.data?.[to.toUpperCase()]) {
      rate = data.data[to.toUpperCase()]
    }

    if (!rate) return null

    return {
      amount: amount,
      from: from.toUpperCase(),
      to: to.toUpperCase(),
      rate: rate,
      converted: (amount * rate).toFixed(2)
    }
  } catch {
    return null
  }
}

export default {
  name: 'currency',
  alias: ['convert', 'exchange', 'rate'],
  desc: 'Currency converter - 15 fallbacks',
  usage: 'amount from to or reply',
  category: 'Tools',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {
    const from = m.key.remoteJid
    const prefix = await db.get('prefix')

    const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage
    const quotedText = quoted?.conversation || quoted?.extendedTextMessage?.text || ''

    let amount, fromCur, toCur

    if (args.length === 3) {
      amount = parseFloat(args[0])
      fromCur = args[1]
      toCur = args[2]
    } else if (args.length === 2 && quotedText) {
      amount = parseFloat(quotedText) || parseFloat(args[0])
      fromCur = args[0]
      toCur = args[1]
    } else {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Usage:\n║ ${prefix}currency 100 USD KES\n║ ${prefix}currency 50 EUR USD\n║ Reply number ${prefix}currency USD KES\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    if (isNaN(amount)) {
      return await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Invalid amount\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }

    await sock.sendMessage(from, {
      react: { text: '⏳', key: m.key }
    })

    try {
      let result = null

      // Try all 15 APIs
      for (const api of CURRENCY_APIS) {
        result = await convertCurrency(amount, fromCur, toCur, api)
        if (result) break
      }

      if (!result) throw new Error('CONVERT_FAILED')

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ *CURRENCY CONVERTER*\n╚━━━━━━━━━━━━━━━━━═❒\n\n${result.amount} ${result.from} = ${result.converted} ${result.to}\n\nRate: 1 ${result.from} = ${result.rate} ${result.to}`
      }, { quoted: m })

      await sock.sendMessage(from, {
        react: { text: '✅', key: m.key }
      })

    } catch {
      await sock.sendMessage(from, {
        react: { text: '❌', key: m.key }
      })

      await sock.sendMessage(from, {
        text: `╔═━━━━━━━━━━━━━━━━═❒\n║ Conversion failed\n║ Check currency codes\n╚━━━━━━━━━━━━━━━━━═❒`
      }, { quoted: m })
    }
  }
}