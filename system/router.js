/**
 * SwiftBot - system/router.js
 * Message routing engine — Prefix logic, channel context, permissions
 * All settings real-time from DB — no restart needed
 */

import { db } from './db.js'
import { logger } from './logger.js'
import { box } from './box.js'
import { fonts } from './fonts.js'
import { getCommand, observers } from './loader.js'

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
    db.get('removeads'), // FIX: Check if ads removed
    db.get('channelJid'),
    db.get('channelLink'),
    db.get('channelName'),
    db.get('channelForwardScore')
  ])

  // FIX: If removeads = true, return null = no channel data
  if (!enabled ||!jid || removeads) return null

  return {
    forwardingScore: score || 430,
    isForwarded: true,
    externalAdReply: {
      title: 'WhatsApp',
      body: `Contact: ${name || 'SwiftBot Updates'}`,
      mediaType: 1,
      thumbnail: null, // Loaded in index.js
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
// CHECK PERMISSIONS
// ─────────────────────────────────────────────
async function checkPermission(sock, m, cmd) {
  const sender = m.key.participant || m.key.remoteJid
  const from = m.key.remoteJid
  const isGroup = from.endsWith('@g.us')

  // Owner check — FIX: Support @lid format
  const owner = await db.get('owner')
  const senderNum = sender.split('@')[0].split(':')[0]
  const isOwner = senderNum === owner || sender === `${owner}@s.whatsapp.net`

  // Sudo check
  const sudoUsers = await db.get('sudoUsers') || []
  const isSudo = sudoUsers.includes(senderNum)

  // Bot mode check
  const mode = await db.get('mode') || 'public'
  if (mode === 'private' &&!isOwner &&!isSudo) return false
  if (mode === 'groups' &&!isGroup &&!isOwner &&!isSudo) return false
  if (mode === 'dm' && isGroup &&!isOwner &&!isSudo) return false

  // Command permission level
  const perm = cmd.permission || 'all' // all | group | admin | owner | sudo

  if (perm === 'owner' &&!isOwner) return false
  if (perm === 'sudo' &&!isOwner &&!isSudo) return false

  if (perm === 'group' &&!isGroup) {
    return { error: 'This command only works in groups.' }
  }

  if (perm === 'admin' && isGroup) {
    try {
      const metadata = await sock.groupMetadata(from)
      const admin = metadata.participants.find(p => {
        const pNum = p.id.split('@')[0].split(':')[0]
        return pNum === senderNum && (p.admin === 'admin' || p.admin === 'superadmin')
      })
      if (!admin &&!isOwner &&!isSudo) {
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
  // Global disabled
  const disabledCmds = await db.get('disabledCmds') || []
  if (disabledCmds.includes(cmdName)) return true

  // Per-group disabled
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
  const delay = 1200 // FIX: Reduced to 1.2s for faster response

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

    // FIX: If reacts disabled, skip
    if (reactEnabled === false) return

    const reactKey = customReact || REACT_KEYS[Math.floor(Math.random() * REACT_KEYS.length)]

    await sock.sendMessage(m.key.remoteJid, {
      react: { text: reactKey, key: m.key }
    })
  } catch (e) {
    // Silent fail — don't break commands if react fails
  }
}

// ─────────────────────────────────────────────
// MAIN MESSAGE ROUTER
// ─────────────────────────────────────────────
export async function routeMessage(sock, m) {
  try {
    // Ignore status broadcasts, empty messages
    if (!m.message || m.key.remoteJid === 'status@broadcast') return

    const from = m.key.remoteJid
    const sender = m.key.participant || from
    const isGroup = from.endsWith('@g.us')

    // Get message text
    const type = Object.keys(m.message)[0]
    const body = m.message.conversation
      || m.message.extendedTextMessage?.text
      || m.message.imageMessage?.caption
      || m.message.videoMessage?.caption
      || ''

    if (!body) return

    // Log incoming
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
      db.get('nobox'), // FIX: Check if box disabled
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
      // FIX: No-prefix mode — check if first word is a command
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
    if (!cmd) return

    // ─── CHECK IF DISABLED ───────────────────
    if (await isCommandDisabled(cmd.name, isGroup? from : null)) {
      // FIX: Respect nobox setting
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
      // Inject channel context if enabled
      const contextInfo = await getChannelContext()

      // Execute with full context
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
        contextInfo,
        cmdName,
        args,
        body,
        nobox // FIX: Pass nobox to commands
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