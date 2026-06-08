/**
 * SwiftBot - plugins/commands/economy/tournament.js
 * Tournament System - Entry fee bracket PvP, winner takes pot
 * Gang members get +15% power bonus in fights
 * Uses db keys: eco_${groupJid}_tournament_*, eco_${groupJid}_balance_${user}
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ASSETS_PATH = path.join(__dirname, 'assets.js')

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const TOURNAMENT_STATES = {
  OPEN: 'open',
  ACTIVE: 'active',
  ENDED: 'ended'
}

const MIN_ENTRY = 5000
const MAX_PLAYERS = 8
const JOIN_TIME = 2 * 60 * 1000 // 2min to join

// Load theme glow from assets.js
const loadThemeGlow = async (groupId, db) => {
  try {
    if (fs.existsSync(ASSETS_PATH)) {
      const { default: ASSETS } = await import(`./assets.js?update=${Date.now()}`)
      const activeBg = await db.get(`eco_${groupId}_bg_${groupId}`) || 'default'
      return ASSETS[activeBg]?.glow || '#00ff00'
    }
  } catch {}
  return '#00ff00'
}

export default {
  name: 'tournament',
  alias: ['tourney', 'pvp'],
  desc: 'Join/start bracket PvP tournaments - winner takes pot',
  usage: 'start <entry_fee> | join | status | cancel',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED
    if (isGroup) {
      const ecoEnabled = await db.getGroupKey(from, 'eco_enabled')
      if (!ecoEnabled) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴅɪsᴀʙʟᴇᴅ
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    const groupId = isGroup? from : 'global'
    const subCmd = args[0]?.toLowerCase()
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`
    const tournamentKey = `eco_${groupId}_tournament_active`

    const [balance, jailTime, currency, tournament] = await Promise.all([
      db.get(balanceKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency'),
      db.get(tournamentKey)
    ])

    const currencySymbol = currency || '$'
    const now = Date.now()
    const glow = await loadThemeGlow(groupId, db)

    // 2. CHECK JAIL
    if (jailTime && now < jailTime) {
      const remaining = Math.ceil((jailTime - now) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ᴛᴏᴜʀɴᴀᴍᴇɴᴛs ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. START TOURNAMENT
    if (subCmd === 'start') {
      if (tournament && tournament.state!== TOURNAMENT_STATES.ENDED) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ ᴀʟʀᴇᴀᴅʏ ʀᴜɴɴɪɴɢ
┃➠ ᴜsᴇ ${prefix}tournament status
╚═══════════════════╝`
        }, { quoted: m })
      }

      const entryFee = parseInt(args[1])
      if (!entryFee || isNaN(entryFee) || entryFee < MIN_ENTRY) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪɴ ᴇɴᴛʀʏ: ${currencySymbol}${formatCash(MIN_ENTRY)}
┃➠ ᴜsᴀɢᴇ: ${prefix}tournament start <fee>
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (!balance || balance < entryFee) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴄᴀsʜ
┃➠ ᴇɴᴛʀʏ ғᴇᴇ: ${currencySymbol}${formatCash(entryFee)}
┃➠ ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance || 0)}
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Create tournament
      const newTourney = {
        state: TOURNAMENT_STATES.OPEN,
        entryFee: entryFee,
        pot: entryFee,
        players: [sender],
        host: sender,
        startTime: now + JOIN_TIME,
        created: now,
        msgId: null
      }

      await Promise.all([
        db.set(balanceKey, balance - entryFee),
        db.set(tournamentKey, newTourney)
      ])

      const sent = await sock.sendMessage(from, {
        text: `╔═〘 ⚔️ᴛᴏᴜʀɴᴀᴍᴇɴᴛ sᴛᴀʀᴛᴇᴅ 〙═╗
┃➠ ʜᴏsᴛ: @${sender.split('@')[0]}
┃➠ ᴇɴᴛʀʏ ғᴇᴇ: ${currencySymbol}${formatCash(entryFee)}
┃➠ 💰 ᴘᴏᴛ: ${currencySymbol}${formatCash(entryFee)}
┃
┃➠ 👥 ᴘʟᴀʏᴇʀs: 1/${MAX_PLAYERS}
┃➠ ⏰ sᴛᴀʀᴛs ɪɴ: 2ᴍ
┃
┃➠ ᴛʏᴘᴇ ${prefix}tournament join
┃➠ ᴡɪɴɴᴇʀ ᴛᴀᴋᴇs ᴘᴏᴛ
┃➠ 🏴 ɢᴀɴɢ ᴍᴇᴍʙᴇʀs: +15% ᴘᴏᴡᴇʀ
╚═══════════════════╝`,
        mentions: [sender]
      }, { quoted: m })

      newTourney.msgId = sent.key.id
      await db.set(tournamentKey, newTourney)
      return
    }

    // 4. JOIN TOURNAMENT
    if (subCmd === 'join') {
      if (!tournament || tournament.state!== TOURNAMENT_STATES.OPEN) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏ ᴏᴘᴇɴ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ
┃➠ ᴜsᴇ ${prefix}tournament start <fee>
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (now > tournament.startTime) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ⏰ᴄʟᴏsᴇᴅ 〙═╗
┃➠ ᴊᴏɪɴ ᴛɪᴍᴇ ᴇɴᴅᴇᴅ
┃➠ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ sᴛᴀʀᴛɪɴɢ
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (tournament.players.includes(sender)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ᴊᴏɪɴᴇᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (tournament.players.length >= MAX_PLAYERS) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ ғᴜʟ: ${MAX_PLAYERS}/${MAX_PLAYERS}
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (!balance || balance < tournament.entryFee) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴄᴀsʜ
┃➠ ᴇɴᴛʀʏ ғᴇᴇ: ${currencySymbol}${formatCash(tournament.entryFee)}
┃➠ ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance || 0)}
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Join
      tournament.players.push(sender)
      tournament.pot += tournament.entryFee

      await Promise.all([
        db.set(balanceKey, balance - tournament.entryFee),
        db.set(tournamentKey, tournament)
      ])

      const timeLeft = Math.ceil((tournament.startTime - now) / 1000)
      const playerMentions = tournament.players.map(p => `@${p.split('@')[0]}`).join(' ')

      // Edit original message if exists
      if (tournament.msgId) {
        try {
          await sock.sendMessage(from, {
            text: `╔═〘 ⚔️ᴛᴏᴜʀɴᴀᴍᴇɴᴛ ᴏᴘᴇɴ 〙═╗
┃➠ ʜᴏsᴛ: @${tournament.host.split('@')[0]}
┃➠ ᴇɴᴛʀʏ: ${currencySymbol}${formatCash(tournament.entryFee)}
┃➠ 💰 ᴘᴏᴛ: ${currencySymbol}${formatCash(tournament.pot)}
┃
┃➠ 👥 ᴘʟᴀʏᴇʀs: ${tournament.players.length}/${MAX_PLAYERS}
┃➠ ${playerMentions}
┃➠ ⏰ sᴛᴀʀᴛs ɪɴ: ${timeLeft}s
┃
┃➠ ᴛʏᴘᴇ ${prefix}tournament join
╚═══════════════════╝`,
            edit: { remoteJid: from, id: tournament.msgId },
            mentions: tournament.players
          })
        } catch {}
      }

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴊᴏɪɴᴇᴅ 〙═╗
┃➠ ᴘʟᴀʏᴇʀ: @${sender.split('@')[0]}
┃➠ ᴇɴᴛʀʏ ᴘᴀɪᴅ: ${currencySymbol}${formatCash(tournament.entryFee)}
┃➠ 💰 ᴘᴏᴛ: ${currencySymbol}${formatCash(tournament.pot)}
╚═══════════════════╝`,
        mentions: [sender]
      }, { quoted: m })
    }

    // 5. STATUS / AUTO-START
    if (subCmd === 'status' ||!subCmd) {
      if (!tournament) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɴᴏ ᴀᴄᴛɪᴠᴇ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ
┃➠ ᴜsᴇ ${prefix}tournament start <fee>
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Auto-start if time up
      if (tournament.state === TOURNAMENT_STATES.OPEN && now >= tournament.startTime) {
        if (tournament.players.length < 2) {
          // Cancel + refund
          for (const player of tournament.players) {
            const pBalKey = `eco_${groupId}_balance_${player}`
            const pBal = await db.get(pBalKey) || 0
            await db.set(pBalKey, pBal + tournament.entryFee)
          }
          await db.set(tournamentKey, null)
          return await sock.sendMessage(from, {
            text: `╔═〘 🚫ᴄᴀɴᴄᴇʟᴇᴅ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴘʟᴀʏᴇʀs
┃➠ ᴍɪɴ: 2 ᴘʟᴀʏᴇʀs
┃➠ ᴀʟʟ ᴇɴᴛʀɪᴇs ʀᴇғᴜɴᴅᴇᴅ
╚═══════════════════╝`
          }, { quoted: m })
        }

        // Run bracket with live edits
        let players = [...tournament.players]
        let round = 1
        const bracketMsg = await sock.sendMessage(from, {
          text: `╔═〘 ⚔️ᴛᴏᴜʀɴᴀᴍᴇɴᴛ sᴛᴀʀᴛᴇᴅ 〙═╗
┃➠ ᴘʟᴀʏᴇʀs: ${players.length}
┃➠ 💰 ᴘᴏᴛ: ${currencySymbol}${formatCash(tournament.pot)}
╚═══════════════════╝`
        }, { quoted: m })

        while (players.length > 1) {
          let roundText = `╔═〘 ⚔️ʀᴏᴜɴᴅ ${round} 〙═╗\n`
          const winners = []

          for (let i = 0; i < players.length; i += 2) {
            if (i + 1 >= players.length) {
              winners.push(players[i]) // Bye
              roundText += `┃➠ @${players[i].split('@')[0]} - BYE\n`
              continue
            }

            const p1 = players[i]
            const p2 = players[i + 1]

            // Get stats: level + bank + gang bonus = power
            const [p1Level, p1Bank, p1Gang, p2Level, p2Bank, p2Gang] = await Promise.all([
              db.get(`eco_${groupId}_level_${p1}`),
              db.get(`eco_${groupId}_bank_${p1}`),
              db.get(`eco_${groupId}_user_gang_${p1}`),
              db.get(`eco_${groupId}_level_${p2}`),
              db.get(`eco_${groupId}_bank_${p2}`),
              db.get(`eco_${groupId}_user_gang_${p2}`)
            ])

            let p1Power = (p1Level || 1) * 100 + Math.floor((p1Bank || 0) / 10000) + Math.floor(Math.random() * 50)
            let p2Power = (p2Level || 1) * 100 + Math.floor((p2Bank || 0) / 10000) + Math.floor(Math.random() * 50)

            // Gang bonus +15%
            if (p1Gang) p1Power = Math.floor(p1Power * 1.15)
            if (p2Gang) p2Power = Math.floor(p2Power * 1.15)

            const winner = p1Power >= p2Power? p1 : p2
            const loser = winner === p1? p2 : p1
            winners.push(winner)

            // Send fight message
            const fightMsg = await sock.sendMessage(from, {
              text: `⚔️ @${p1.split('@')[0]}${p1Gang? ' 🏴' : ''} vs @${p2.split('@')[0]}${p2Gang? ' 🏴' : ''}`,
              mentions: [p1, p2]
            })

            // Wait 2s then edit with winner
            await new Promise(r => setTimeout(r, 2000))
            await sock.sendMessage(from, {
              text: `⚔️ @${p1.split('@')[0]}${p1Gang? ' 🏴' : ''} vs @${p2.split('@')[0]}${p2Gang? ' 🏴' : ''}\n🏆 ᴡɪɴᴇʀ: @${winner.split('@')[0]}`,
              edit: { remoteJid: from, id: fightMsg.key.id },
              mentions: [p1, p2, winner]
            })

            roundText += `┃➠ @${p1.split('@')[0]} vs @${p2.split('@')[0]} → @${winner.split('@')[0]}${winner === p1 && p1Gang? ' 🏴' : winner === p2 && p2Gang? ' 🏴' : ''}\n`
            await new Promise(r => setTimeout(r, 1000))
          }

          roundText += `╚═══════════════════╝`
          await sock.sendMessage(from, { text: roundText, mentions: players }, { quoted: m })

          players = winners
          round++
          await new Promise(r => setTimeout(r, 1500))
        }

        const winner = players[0]
        const winnerBalKey = `eco_${groupId}_balance_${winner}`
        const winnerBal = await db.get(winnerBalKey) || 0
        const winnerGang = await db.get(`eco_${groupId}_user_gang_${winner}`)

        await Promise.all([
          db.set(winnerBalKey, winnerBal + tournament.pot),
          db.set(tournamentKey, {...tournament, state: TOURNAMENT_STATES.ENDED, winner })
        ])

        return await sock.sendMessage(from, {
          text: `╔═〘 🏆ᴛᴏᴜʀɴᴀᴍᴇɴᴛ ᴇɴᴅᴇᴅ 〙═╗
┃➠ ᴄʜᴀᴍᴘɪᴏɴ: @${winner.split('@')[0]}${winnerGang? ' 🏴' : ''}
┃
┃➠ 👥 ᴘʟᴀʏᴇʀs: ${tournament.players.length}
┃➠ 💰 ᴘᴏᴛ ᴡᴏɴ: ${currencySymbol}${formatCash(tournament.pot)}
┃➠ 🎯 ᴇɴᴛʀʏ: ${currencySymbol}${formatCash(tournament.entryFee)}
┃
┃➠ ɢɢ ᴇᴢ
╚═══════════════════╝`,
          mentions: [winner]
        }, { quoted: m })
      }

      // Still open
      if (tournament.state === TOURNAMENT_STATES.OPEN) {
        const timeLeft = Math.ceil((tournament.startTime - now) / 1000)
        const playerMentions = tournament.players.map(p => `@${p.split('@')[0]}`).join(' ')
        return await sock.sendMessage(from, {
          text: `╔═〘 ⚔️ᴛᴏᴜʀɴᴀᴍᴇɴᴛ ᴏᴘᴇɴ 〙═╗
┃➠ ʜᴏsᴛ: @${tournament.host.split('@')[0]}
┃➠ ᴇɴᴛʀʏ: ${currencySymbol}${formatCash(tournament.entryFee)}
┃➠ 💰 ᴘᴏᴛ: ${currencySymbol}${formatCash(tournament.pot)}
┃
┃➠ 👥 ᴘʟᴀʏᴇʀs: ${tournament.players.length}/${MAX_PLAYERS}
┃➠ ${playerMentions}
┃➠ ⏰ sᴛᴀʀᴛs ɪɴ: ${timeLeft}s
┃➠ ᴛʏᴘᴇ ${prefix}tournament join
╚═══════════════════╝`,
          mentions: tournament.players
        }, { quoted: m })
      }

      // Ended
      if (tournament.state === TOURNAMENT_STATES.ENDED) {
        const winnerGang = await db.get(`eco_${groupId}_user_gang_${tournament.winner}`)
        return await sock.sendMessage(from, {
          text: `╔═〘 🏆ʟᴀsᴛ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ 〙═╗
┃➠ ᴄʜᴀᴍᴘɪᴏɴ: @${tournament.winner.split('@')[0]}${winnerGang? ' 🏴' : ''}
┃➠ ᴘᴏᴛ: ${currencySymbol}${formatCash(tournament.pot)}
┃➠ ᴘʟᴀʏᴇʀs: ${tournament.players.length}
┃
┃➠ sᴛᴀʀᴛ ɴᴇᴡ: ${prefix}tournament start <fee>
╚═══════════════════╝`,
          mentions: [tournament.winner]
        }, { quoted: m })
      }
    }

    // 6. CANCEL - HOST ONLY
    if (subCmd === 'cancel') {
      if (!tournament || tournament.state!== TOURNAMENT_STATES.OPEN) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴏ ᴏᴘᴇɴ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ ᴛᴏ ᴄᴀɴᴄᴇʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (tournament.host!== sender) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏɴʟʏ ʜᴏsᴛ ᴄᴀɴ ᴄᴀɴᴄᴇʟ
╚═══════════════════╝`
        }, { quoted: m })
      }

      // Refund all
      for (const player of tournament.players) {
        const pBalKey = `eco_${groupId}_balance_${player}`
        const pBal = await db.get(pBalKey) || 0
        await db.set(pBalKey, pBal + tournament.entryFee)
      }
      await db.set(tournamentKey, null)

      return await sock.sendMessage(from, {
        text: `╔═〘 🚫ᴄᴀɴᴄᴇʟᴇᴅ 〙═╗
┃➠ ʜᴏsᴛ ᴄᴀɴᴄᴇʟᴇᴅ ᴛᴏᴜʀɴᴀᴍᴇɴᴛ
┃➠ ᴀʟʟ ᴇɴᴛʀɪᴇs ʀᴇғᴜɴᴅᴇᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

  }
}