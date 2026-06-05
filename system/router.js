/**
 * SwiftBot - system/router.js
 * Message routing engine — Prefix logic, channel context, permissions
 * All settings real-time from DB — no restart needed
 * OWNER = PAIRING CODE NUMBER ONLY - NO SENDER CHECK
 */

import { db } from './db.js'
import { logger } from './logger.js'
import { box } from './box.js'
import { fonts } from './fonts.js'

// FIX: Use Maps set by loader.js instead of importing
let commands = new Map()
let observers = new Map()

export function setCommands(cmds) {
  commands = cmds
  logger.success('ROUTER', `Registered ${cmds.size} commands`)
}

export function setObservers(obs) {
  observers = obs
  logger.success('ROUTER', `Registered ${obs.size} observers`)
}

export function getCommand(name) {
  // Check direct name
  if (commands.has(name)) return commands.get(name)

  // Check aliases
  for (const [_, cmd] of commands) {
    if (cmd.alias && cmd.alias.includes(name)) {
      return cmd
    }
  }
  return null
}

// ─────────────────────────────────────────────
// 50 REACT KEYS — Random reactions
// ─────────────────────────────────────────────
const REACT_KEYS = [
  '✅','❤️','🔥','💯','👍','😂','😍','🤔','👏','💀',
  '⚡','✨','🌟','🎯','🚀','💎','👑','🌈','🎉','💪',
  '🙏','😎','🥳','🤩','😇','🤗','😘','🤫','🤐','🤑',
  '🤠','👻','👽','🤖','😺','🐶','🦁','🐯','🦄','🐸',
  '🍕','🍔','🍟','🌮','🍩','🍪','🍭','🍯','🧃','☕'
]

// ─────────────────────────────────────────────
// CHANNEL CONTEXT — With removeads support
// ─────────────────────────────────────────────
async function getChannelContext() {
  const [enabled, removeads, jid, link, name, score] = await Promise.all([
    db.get('channelEnabled'),
    db.get('removeads'),
    db.get('channelJid'),
    db.get('channelLink'),
    db.get('channelName'),
    db.get('channelForwardScore')
  ])

  if (!enabled ||!jid || removeads) return null

  return {
    forwardingScore: score || 430,
    isForwarded: true,
    externalAdReply: {
      title: 'WhatsApp',
      body: `Contact: ${name || 'SwiftBot Updates'}`,
      mediaType: 1,
      thumbnail: null,
      mediaUrl: link || '',
      sourceUrl: link || '',
      showAdAttribution: true,
      renderLargerThumbnail: false,
      verifiedBizName: 'WhatsApp'
    },
    forwardedNewsletterMessageInfo: {
      newsletterJid: jid,
      newsletterName: name || 'SwiftBot Updates',
      serverMessageId: Math.floor(Math.random() * 100000)
    }
  }
}

// ─────────────────────────────────────────────
// CHECK PERMISSIONS - 19 NJIA ZA OWNER (NO SENDER CHECK)
// ─────────────────────────────────────────────
async function checkPermission(sock, m, cmd) {
  const from = m.key.remoteJid
  const isGroup = from.endsWith('@g.us')

  const owner = await db.get('owner')
  if (!owner) {
    logger.error('PERMISSION', 'Owner not set in DB')
    return { error: 'Bot owner not configured.' }
  }

  // NJIA 19 ZA KUMJUA OWNER - BASED ON PAIRING CODE NUMBER ONLY
  const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
  const botJid = sock.user?.id || ''
  const botClean = cleanJid(botJid)
  const botRaw = botJid || ''

  // Check if current bot number matches stored owner (pairing code number)
  const isOwnerBot =
    botClean === owner || // 1. Direct number match
    botRaw === `${owner}@s.whatsapp.net` || // 2. Full s.whatsapp.net
    botRaw === `${owner}@lid` || // 3. LID format
    botRaw.startsWith(`${owner}:`) || // 4. Device suffix :97
    botRaw.includes(owner) || // 5. Contains owner number
    botRaw.startsWith(`${owner}@`) || // 6. Starts with owner@
    botClean.startsWith(owner) || // 7. Clean starts with owner
    botRaw === `${owner}@c.us` || // 8. c.us format
    botRaw === `${owner}@whatsapp.net` || // 9. whatsapp.net
    botClean.endsWith(owner) || // 10. Clean ends with owner
    botRaw.split('@')[0] === owner || // 11. Split @ matches
    botRaw.replace(/[^0-9]/g, '') === owner || // 12. Numbers only match
    botClean.replace(/[^0-9]/g, '') === owner || // 13. Clean numbers match
    botRaw.toLowerCase() === owner.toLowerCase() || // 14. Case insensitive
    botClean.toLowerCase() === owner.toLowerCase() || // 15. Clean case insensitive
    botRaw.substring(0, owner.length) === owner || // 16. Substring match
    botClean.substring(0, owner.length) === owner || // 17. Clean substring
    botRaw.match(new RegExp(`^${owner}`)) || // 18. Regex start match
    botClean === owner.substring(0, botClean.length) // 19. Partial match

  // Get sudo users from DB
  const sudoUsers = await db.get('sudoUsers') || []
  const botIsSudo = sudoUsers.includes(botClean)

  // Mode check - only if bot is owner or sudo
  const mode = await db.get('mode') || 'public'
  if (mode === 'private' &&!isOwnerBot &&!botIsSudo) return false
  if (mode === 'groups' &&!isGroup &&!isOwnerBot &&!botIsSudo) return false
  if (mode === 'dm' && isGroup &&!isOwnerBot &&!botIsSudo) return false

  const perm = cmd.permission || 'all'

  // For owner-only commands, check if BOT is the owner (not sender)
  if (perm === 'owner' &&!isOwnerBot) return false
  if (perm === 'sudo' &&!isOwnerBot &&!botIsSudo) return false

  if (perm === 'group' &&!isGroup) {
    return { error: 'This command only works in groups.' }
  }

  // For admin commands, we still need to check sender in group
  if (perm === 'admin' && isGroup) {
    const sender = m.key.participant || from
    const senderClean = cleanJid(sender)
    try {
      const metadata = await sock.groupMetadata(from)
      const admin = metadata.participants.find(p => {
        const pNum = cleanJid(p.id)
        return pNum === senderClean && (p.admin === 'admin' || p.admin === 'superadmin')
      })
      if (!admin &&!isOwnerBot &&!botIsSudo) {
        return { error: 'Admin only command.' }
      }
    } catch {
      return { error: 'Failed to verify admin status.' }
    }
  }

  return true
}

// ─────────────────────────────────────────────
// CHECK IF COMMAND DISABLED
// ─────────────────────────────────────────────
async function isCommandDisabled(cmdName, groupJid = null) {
  const disabledCmds = await db.get('disabledCmds') || []
  if (disabledCmds.includes(cmdName)) return true

  if (groupJid) {
    const groupDisabled = await db.getGroupKey(groupJid, 'disabledCmds') || []
    if (groupDisabled.includes(cmdName)) return true
  }

  return false
}

// ─────────────────────────────────────────────
// ANTI-SPAM DELAY — Prevent ban
// ─────────────────────────────────────────────
const userCooldown = new Map()
async function antiSpam(sender) {
  const now = Date.now()
  const last = userCooldown.get(sender) || 0
  const delay = 1200

  if (now - last < delay) {
    return false
  }

  userCooldown.set(sender, now)
  return true
}

// ─────────────────────────────────────────────
// SEND RANDOM REACT — 50 keys support
// ─────────────────────────────────────────────
async function sendReact(sock, m) {
  try {
    const [reactEnabled, customReact] = await Promise.all([
      db.get('reactEnabled'),
      db.get('reactKey')
    ])

    if (reactEnabled === false) return

    const reactKey = customReact || REACT_KEYS[Math.floor(Math.random() * REACT_KEYS.length)]

    await sock.sendMessage(m.key.remoteJid, {
      react: { text: reactKey, key: m.key }
    })
  } catch (e) {
    // Silent fail
  }
}

// ─────────────────────────────────────────────
// MAIN MESSAGE ROUTER
// ─────────────────────────────────────────────
export async function routeMessage(sock, m) {
  try {
    if (!m.message || m.key.remoteJid === 'status@broadcast') return

    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith('@g.us')

    const type = Object.keys(m.message)[0]
    const body = m.message.conversation
      || m.message.extendedTextMessage?.text
      || m.message.imageMessage?.caption
      || m.message.videoMessage?.caption
      || ''

    if (!body) return

    logger.incoming(from, sender.split('@')[0], body.slice(0, 30))

    // ─── RUN OBSERVERS FIRST ─────────────────
    for (const [name, obs] of observers) {
      if (!obs.enabled) continue
      try {
        await obs.execute(sock, m, { db, box, fonts, logger })
      } catch (e) {
        logger.error('OBSERVER', `${name} failed`, e.message)
      }
    }

    // ─── LOAD SETTINGS ───────────────────────
    const [prefix, noPrefix, nobox, autoRead, autoTyping, autoRecording] = await Promise.all([
      db.get('prefix'),
      db.get('noPrefix'),
      db.get('nobox'),
      db.get('autoRead'),
      db.get('autoTyping'),
      db.get('autoRecording')
    ])

    const currentPrefix = prefix || '#'
    const botJid = sock.user?.id

    // ─── AUTO FEATURES ───────────────────────
    if (autoRead) {
      try { await sock.readMessages([m.key]) } catch {}
    }
    if (autoTyping) {
      try { await sock.sendPresenceUpdate('composing', from) } catch {}
    }
    if (autoRecording) {
      try { await sock.sendPresenceUpdate('recording', from) } catch {}
    }

    // ─── CHECK PREFIX ────────────────────────
    let isCmd = false
    let cmdName = ''
    let args = []

    if (body.startsWith(currentPrefix)) {
      isCmd = true
      const parts = body.slice(currentPrefix.length).trim().split(/\s+/)
      cmdName = parts[0].toLowerCase()
      args = parts.slice(1)
    } else if (noPrefix) {
      const parts = body.trim().split(/\s+/)
      const firstWord = parts[0].toLowerCase()
      if (getCommand(firstWord)) {
        isCmd = true
        cmdName = firstWord
        args = parts.slice(1)
      }
    }

    if (!isCmd) return

    // ─── ANTI-SPAM ───────────────────────────
    if (!await antiSpam(sender)) return

    // ─── SEND RANDOM REACT ───────────────────
    await sendReact(sock, m)

    // ─── GET COMMAND ─────────────────────────
    const cmd = getCommand(cmdName)
    if (!cmd) {
      logger.warn('ROUTER', `Command not found: ${cmdName}`)
      return
    }

    // ─── CHECK IF DISABLED ───────────────────
    if (await isCommandDisabled(cmd.name, isGroup? from : null)) {
      const msg = nobox
   ? `Command *${cmd.name}* is disabled.`
        : await box.error(`Command *${cmd.name}* is disabled.`)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      return
    }

    // ─── CHECK PERMISSION ────────────────────
    const permCheck = await checkPermission(sock, m, cmd)
    if (permCheck!== true) {
      const errorMsg = permCheck.error || 'You do not have permission to use this command.'
      const msg = nobox? errorMsg : await box.error(errorMsg)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      return
    }

    // ─── EXECUTE COMMAND ─────────────────────
    logger.executed(cmd.name, sender.split('@')[0])

    try {
      const contextInfo = await getChannelContext()
      const owner = await db.get('owner')

      // Check if BOT is owner (not sender) - 19 ways
      const cleanJid = (jid) => jid?.split('@')[0]?.split(':')[0] || ''
      const botJid = sock.user?.id || ''
      const botClean = cleanJid(botJid)
      const botRaw = botJid || ''
      const isOwner =
        botClean === owner ||
        botRaw === `${owner}@s.whatsapp.net` ||
        botRaw === `${owner}@lid` ||
        botRaw.startsWith(`${owner}:`) ||
        botRaw.includes(owner) ||
        botRaw.startsWith(`${owner}@`) ||
        botClean.startsWith(owner) ||
        botRaw === `${owner}@c.us` ||
        botRaw === `${owner}@whatsapp.net` ||
        botClean.endsWith(owner) ||
        botRaw.split('@')[0] === owner ||
        botRaw.replace(/[^0-9]/g, '') === owner ||
        botClean.replace(/[^0-9]/g, '') === owner ||
        botRaw.toLowerCase() === owner.toLowerCase() ||
        botClean.toLowerCase() === owner.toLowerCase() ||
        botRaw.substring(0, owner.length) === owner ||
        botClean.substring(0, owner.length) === owner ||
        botRaw.match(new RegExp(`^${owner}`)) ||
        botClean === owner.substring(0, botClean.length)

      await cmd.execute(sock, m, args, {
        db,
        box,
        fonts,
        logger,
        prefix: currentPrefix,
        botJid,
        sender,
        from,
        isGroup,
        isOwner,
        contextInfo,
        cmdName,
        args,
        body,
        nobox
      })

      logger.executed(cmd.name, sender.split('@')[0], true)

    } catch (e) {
      logger.executed(cmd.name, sender.split('@')[0], false)
      logger.error('CMD', `${cmd.name} crashed`, e.message)

      const errorBox = nobox
   ? `Command failed: ${e.message}`
        : await box.error(`Command failed: ${e.message}`)
      const contextInfo = await getChannelContext()

      await sock.sendMessage(from, {
        text: errorBox,
        contextInfo
      }, { quoted: m })
    }

  } catch (e) {
    logger.error('ROUTER', 'Message routing failed', e.message)
  }
}

// ─────────────────────────────────────────────
// HANDLE NON-MESSAGE EVENTS — For observers
// ─────────────────────────────────────────────
export async function routeEvent(sock, eventName, update) {
  for (const [name, obs] of observers) {
    if (!obs.enabled) continue
    if (obs.event!== eventName) continue

    try {
      await obs.execute(sock, update, { db, box, fonts, logger })
    } catch (e) {
      logger.error('OBSERVER', `${name} event failed`, e.message)
    }
  }
}