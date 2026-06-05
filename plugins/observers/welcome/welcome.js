/**
 * SwiftBot - plugins/observers/welcome/welcome.js
 * Auto welcome/goodbye messages — Per-group settings
 */

export default {
  name: 'welcome',
  event: 'group-participants.update',

  execute: async (sock, update, { db, box, fonts, logger }) => {
    const { id, participants, action } = update

    // Check if welcome enabled for this group
    const groupSettings = await db.getGroup(id)
    if (action === 'add' &&!groupSettings.welcomeMsg) return
    if (action === 'remove' &&!groupSettings.goodbyeMsg) return

    try {
      const metadata = await sock.groupMetadata(id)
      const groupName = metadata.subject

      for (const user of participants) {
        const username = user.split('@')[0]
        let text = ''

        if (action === 'add') {
          text = groupSettings.welcomeText ||
            `Welcome @${username} to ${fonts.bold(groupName)}!\n\n` +
            `Read group description and follow rules.`
        } else if (action === 'remove') {
          text = groupSettings.goodbyeText ||
            `Goodbye @${username} 👋\nLeft ${fonts.bold(groupName)}`
        } else {
          continue
        }

        const msg = await box.custom([
          fonts.sansBold(action === 'add'? '👋 WELCOME' : '👋 GOODBYE'),
          '',
          text
        ])

        await sock.sendMessage(id, {
          text: msg,
          mentions: [user]
        })

        logger.success('WELCOME', `${action} message sent`, { group: groupName, user })
      }

    } catch (e) {
      logger.error('WELCOME', 'Observer failed', e.message)
    }
  }
}