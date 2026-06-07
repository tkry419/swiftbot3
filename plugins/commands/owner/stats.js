/**
 * SwiftBot - plugins/commands/owner/stats.js
 * Host Statistics - Full System Metrics
 * Shows hostname, uptime, RAM, CPU, env, etc
 */

function getName(msg, jid) {
  return msg.pushName || jid.split('@')[0]
}

import os from 'os'
import { execSync } from 'child_process'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${days}d ${hours}h ${mins}m ${secs}s`
}

export default {
  name: 'stats',
  alias: ['status', 'sysinfo', 'host', 'metrics'],
  desc: 'Show complete host statistics',
  usage: '',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, nobox }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const senderName = getName(m, sender)

    const sent = await sock.sendMessage(from, {
      text: nobox
   ? `Gathering system stats...\n\nBy: ${senderName}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *HOST STATS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Owner: ${senderName}\n║\n║ Gathering metrics...\n╚━━━━━━━━━━━━━━━━━═❒`
    }, { quoted: m })

    try {
      // System Info
      const hostname = os.hostname()
      const platform = os.platform()
      const arch = os.arch()
      const release = os.release()
      const type = os.type()

      // Uptime
      const sysUptime = os.uptime()
      const procUptime = process.uptime()

      // Memory
      const totalMem = os.totalmem()
      const freeMem = os.freemem()
      const usedMem = totalMem - freeMem
      const memUsage = ((usedMem / totalMem) * 100).toFixed(2)

      // Process Memory
      const procMem = process.memoryUsage()
      const heapUsed = procMem.heapUsed
      const heapTotal = procMem.heapTotal
      const rss = procMem.rss
      const external = procMem.external

      // CPU
      const cpus = os.cpus()
      const cpuModel = cpus[0]?.model || 'Unknown'
      const cpuCores = cpus.length
      const loadAvg = os.loadavg()

      // Network
      const networkInterfaces = os.networkInterfaces()
      const netCount = Object.keys(networkInterfaces).length

      // Env Info
      const nodeVersion = process.version
      const envMode = process.env.NODE_ENV || 'development'
      const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI
      const dbMode = db.mode
      const pid = process.pid

      // Bot Stats
      const [prefix, botname, mode, owner, totalUsers, totalGroups] = await Promise.all([
        db.get('prefix'),
        db.get('botname'),
        db.get('mode'),
        db.get('owner'),
        db.getAllUsers().then(u => Object.keys(u).length),
        db.getAllGroups().then(g => Object.keys(g).length)
      ])

      // Disk - try to get if available
      let diskInfo = 'N/A'
      try {
        if (platform!== 'win32') {
          const df = execSync('df -h / | tail -1').toString()
          const parts = df.split(/\s+/)
          diskInfo = `${parts[2]} / ${parts[1]} (${parts[4]})`
        }
      } catch {}

      const statsText = nobox
   ? `🖥️ HOST STATISTICS\n\n` +
      `System:\n` +
      `Hostname: ${hostname}\n` +
      `Platform: ${platform} ${arch}\n` +
      `OS: ${type} ${release}\n` +
      `Node: ${nodeVersion}\n` +
      `PID: ${pid}\n\n` +
      `Uptime:\n` +
      `System: ${formatUptime(sysUptime)}\n` +
      `Process: ${formatUptime(procUptime)}\n\n` +
      `Memory:\n` +
      `System: ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memUsage}%)\n` +
      `Free: ${formatBytes(freeMem)}\n` +
      `Process RSS: ${formatBytes(rss)}\n` +
      `Heap: ${formatBytes(heapUsed)} / ${formatBytes(heapTotal)}\n\n` +
      `CPU:\n` +
      `Model: ${cpuModel}\n` +
      `Cores: ${cpuCores}\n` +
      `Load: ${loadAvg.map(l => l.toFixed(2)).join(', ')}\n\n` +
      `Network:\n` +
      `Interfaces: ${netCount}\n` +
      `Disk: ${diskInfo}\n\n` +
      `Environment:\n` +
      `Mode: ${envMode}\n` +
      `DB: ${dbMode} ${mongoUrl? '✅' : '⚠️ RAM'}\n\n` +
      `Bot:\n` +
      `Name: ${botname}\n` +
      `Prefix: ${prefix}\n` +
      `Mode: ${mode}\n` +
      `Owner: ${owner}\n` +
      `Users: ${totalUsers}\n` +
      `Groups: ${totalGroups}`
        : `╔═━━━━━━━━━━━━━━━━═❒\n║ *HOST STATISTICS*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ 🖥️ SYSTEM\n║ Hostname: ${hostname}\n║ Platform: ${platform} ${arch}\n║ OS: ${type} ${release}\n║ Node: ${nodeVersion}\n║ PID: ${pid}\n║\n║ ⏰ UPTIME\n║ System: ${formatUptime(sysUptime)}\n║ Process: ${formatUptime(procUptime)}\n║\n║ 💾 MEMORY\n║ System: ${formatBytes(usedMem)} / ${formatBytes(totalMem)}\n║ Usage: ${memUsage}%\n║ Free: ${formatBytes(freeMem)}\n║ Process RSS: ${formatBytes(rss)}\n║ Heap: ${formatBytes(heapUsed)} / ${formatBytes(heapTotal)}\n║\n║ 🔥 CPU\n║ Model: ${cpuModel}\n║ Cores: ${cpuCores}\n║ Load: ${loadAvg.map(l => l.toFixed(2)).join(', ')}\n║\n║ 🌐 NETWORK\n║ Interfaces: ${netCount}\n║ Disk: ${diskInfo}\n║\n║ ⚙️ ENVIRONMENT\n║ Mode: ${envMode}\n║ DB: ${dbMode} ${mongoUrl? '✅' : '⚠️ RAM'}\n║\n║ 🤖 BOT\n║ Name: ${botname}\n║ Prefix: ${prefix}\n║ Mode: ${mode}\n║ Owner: ${owner}\n║ Users: ${totalUsers}\n║ Groups: ${totalGroups}\n╚━━━━━━━━━━━━━━━━━═❒`

      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: statsText
        })
      } catch {}

    } catch (error) {
      try {
        await sock.sendMessage(from, {
          edit: sent.key,
          text: nobox
      ? `Failed to get stats\n\nError: ${error.message}`
            : `╔═━━━━━━━━━━━━━━━━═❒\n║ *STATS FAILED*\n╚━━━━━━━━━━━━━━━━━═❒\n╔═━━━━━━━━━━━━━━━━═❒\n║ Error: ${error.message}\n╚━━━━━━━━━━━━━━━━━═❒`
        })
      } catch {}
    }
  }
}