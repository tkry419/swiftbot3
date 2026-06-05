export default {
  name: 'ping',
  alias: ['p', 'speed'],
  desc: 'Check bot response speed with animation',
  usage: '',
  category: 'general',
  permission: 'all',

  execute: async (sock, m, args, { db, box, fonts, nobox }) => {
    const from = m.key.remoteJid
    const start = Date.now()

    // STEP 1: Send initial message
    let msg = await sock.sendMessage(from, {
      text: nobox? 'Pinging...' : await box.info('PING', 'Pinging...')
    }, { quoted: m })

    // STEP 2: Animation frames
    const frames = ['▱▱▱▱▱ 0%', '▰▱▱ 20%', '▰▰▱▱▱ 40%', '▰▰▰▱▱ 60%', '▰▰▰▰▱ 80%', '▰▰▰▰▰ 100%']

    for (let i = 0; i < frames.length - 1; i++) {
      await new Promise(r => setTimeout(r, 300))
      const editText = nobox
      ? `Pinging...\n${frames[i]}`
        : await box.info('PING', `Pinging...\n${frames[i]}`)

      await sock.sendMessage(from, {
        text: editText,
        edit: msg.key
      })
    }

    // STEP 3: Final result with speed
    const latency = Date.now() - start
    let speed = 'Slow 🐌'
    let bar = '▰▱▱▱▱'

    if (latency < 100) {
      speed = 'Ultra Fast ⚡'
      bar = '▰▰▰'
    } else if (latency < 300) {
      speed = 'Fast 🚀'
      bar = '▰▰▰▰▱'
    } else if (latency < 600) {
      speed = 'Good ✨'
      bar = '▰▰▰▱▱'
    } else if (latency < 1000) {
      speed = 'Normal 💫'
      bar = '▰▰▱▱▱'
    }

    const finalText = nobox
    ? `Pong! 🏓\n\nSpeed: ${latency}ms\nStatus: ${speed}\n${bar} 100%`
      : await box.success(`Pong! 🏓\n\nSpeed: ${latency}ms\nStatus: ${speed}\n${bar} 100%`)

    // EDIT final message - no delete
    await sock.sendMessage(from, {
      text: finalText,
      edit: msg.key
    })
  }
}