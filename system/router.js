/**
 * SwiftBot - system/router.js
 * Message routing engine — Prefix logic, channel context, permissions
 * All settings real-time from DB — no restart needed
 */

import { db } from './db.js'
import { logger } from './logger.js'
import { box } from './box.js'
import { fonts } from './fonts.js'
import { getCommand, observers } from './loader.js' // KAMA ZAMANI

// ─────────────────────────────────────────────
// CHANNEL CONTEXT — Old style forwarded + View Channel
// ─────────────────────────────────────────────
async function getChannelContext() {
  const [enabled, jid, link, name, score] = await Promise.all([
    db.get('channelEnabled'),
    db.get('channelJid'),
    db.get('channelLink'),
    db.get('channelName'),
    db.get('channelForwardScore')
  ])

  if (!enabled ||!jid) return null

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
// CHECK PERMISSIONS - RAHISI KAMA ZAMANI
// ─────────────────────────────────────────────
async function checkPermission(sock, m, cmd) {
  const sender = m.key.participant || m.key.remoteJid
  const from = m.key.remoteJid
  const isGroup = from.endsWith('@g.us')

  // Owner check - RAHISI
  const owner = await db.get('owner')
  const isOwner = sender === `${owner}@s.whatsapp.net` || sender === owner

  // Sudo check
  const sudoUsers = await db.get('sudoUsers') || []
  const isSudo = sudoUsers.includes(sender.replace('@s.whatsapp.net', ''))

  // Bot mode check
  const mode = await db.get('mode') || 'public'
  if (mode === 'private' &&!isOwner &&!isSudo) return false
  if (mode === 'groups' &&!isGroup &&!isOwner &&!isSudo) return false
  if (mode === 'dm' && isGroup &&!isOwner &&!isSudo) return false

  // Command permission level
  const perm = cmd.permission || 'all'

  if (perm === 'owner' &&!isOwner) return false
  if (perm === 'sudo' &&!isOwner &&!isSudo) return false

  if (perm === 'group' &&!isGroup) {
    return { error: 'This command only works in groups.' }
  }

  if (perm === 'admin' && isGroup) {
    try {
      const metadata = await sock.groupMetadata(from)
      const admin = metadata.participants.find(p =>
        p.id === sender && (p.admin === 'admin' || p.admin === 'superadmin')
      )
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
  const delay = 1500

  if (now - last < delay) {
    return false
  }

  userCooldown.set(sender, now)
  return true
}

// ─────────────────────────────────────────────
// MAIN MESSAGE ROUTER
// ─────────────────────────────────────────────
export async function routeMessage(sock, m) {
  try {
    // Ignore status broadcasts, empty messages
    if (!m.message || m.key.remoteJid === 'status@broadcast') return
    // HAKUNA fromMe CHECK - KAMA ZAMANI

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
    const [prefix, noPrefix, autoRead, autoTyping, autoRecording] = await Promise.all([
      db.get('prefix'),
      db.get('noPrefix'),
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

    // HAKUNA REACT - KAMA ZAMANI

    // ─── GET COMMAND ─────────────────────────
    const cmd = getCommand(cmdName)
    if (!cmd) return

    // ─── CHECK IF DISABLED ───────────────────
    if (await isCommandDisabled(cmd.name, isGroup? from : null)) {
      const msg = await box.error(`Command *${cmd.name}* is disabled.`)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      return
    }

    // ─── CHECK PERMISSION ────────────────────
    const permCheck = await checkPermission(sock, m, cmd)
    if (permCheck!== true) {
      const errorMsg = permCheck.error || 'You do not have permission to use this command.'
      const msg = await box.error(errorMsg)
      await sock.sendMessage(from, { text: msg }, { quoted: m })
      return
    }

    // ─── EXECUTE COMMAND ─────────────────────
    logger.executed(cmd.name, sender.split('@')[0])

    try {
      const contextInfo = await getChannelContext()

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
        body
      })

      logger.executed(cmd.name, sender.split('@')[0], true)

    } catch (e) {
      logger.executed(cmd.name, sender.split('@')[0], false)
      logger.error('CMD', `${cmd.name} crashed`, e.message)

      const errorBox = await box.error(`Command failed: ${e.message}`)
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