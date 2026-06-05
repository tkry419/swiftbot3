/**
 * SwiftBot - plugins/observers/welcome/welcome.js
 * Auto welcome/goodbye messages — Per-group settings
 * Real-time, no restart needed
 */

export default {
  name: 'welcome',
  event: 'group-participants.update',

  execute: async (sock, update, { db, box, fonts, logger }) => {
    const { id, participants, action } = update

    // FIX: Use getGroupKey for faster checks + check nobox
    const [welcomeEnabled, goodbyeEnabled, nobox] = await Promise.all([
      db.getGroupKey(id, 'welcomeMsg'),
      db.getGroupKey(id, 'goodbyeMsg'),
      db.get('nobox')
    ])

    // Skip if disabled
    if (action === 'add' &&!welcomeEnabled) return
    if (action === 'remove' &&!goodbyeEnabled) return
    if (action!== 'add' && action!== 'remove') return

    try {
      const metadata = await sock.groupMetadata(id)
      const groupName = metadata.subject
      const groupDesc = metadata.desc || 'No description'

      for (const user of participants) {
        const username = user.split('@')[0]

        // Get custom text or use default
        const customWelcome = await db.getGroupKey(id, 'welcomeText')
        const customGoodbye = await db.getGroupKey(id, 'goodbyeText')

        let text = ''
        let header = ''

        if (action === 'add') {
          header = '👋 WELCOME'
          text = customWelcome ||
            `Hey @${username}!\n\n` +
            `Welcome to *${groupName}*\n` +
            `${groupDesc.slice(0, 100)}\n\n` +
            `Read rules and enjoy your stay!`
        } else {
          header = '👋 GOODBYE'
          text = customGoodbye ||
            `@${username} left\n\n` +
            `Goodbye from *${groupName}* 👋\n` +
            `We'll miss you!`
        }

        // Build message - respect nobox
        const msg = nobox
       ? `${header}\n\n${text}`
          : await box.custom([
              fonts.sansBold(header),
              '',
              text
            ])

        await sock.sendMessage(id, {
          text: msg,
          mentions: [user]
        })

        logger.success('WELCOME', `${action} message sent`, { group: groupName, user: username })
      }

    } catch (e) {
      logger.error('WELCOME', 'Observer failed', e.message)
    }
  }
}