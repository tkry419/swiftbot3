export default {
  name: 'antidelete',
  alias: ['antidel'],
  desc: 'Control anti-delete settings',
  usage: '<on/off/set> [destination]',
  category: 'owner',
  permission: 'owner',

  execute: async (sock, m, args, { db, box, fonts, nobox, isGroup }) => {
    const from = m.key.remoteJid
    const action = args[0]?.toLowerCase()
    const value = args[1]

    if (!action ||!['on', 'off', 'set', 'status'].includes(action)) {
      const [enabled, dest, target] = await Promise.all([
        isGroup? db.getGroupKey(from, 'antiDelete') : db.get('antiDelete'),
        db.get('antiDeleteDest'),
        db.get('antiDeleteTarget')
      ])

      const status = enabled? 'ON' : 'OFF'
      const destText = dest || 'self'
      const targetText = target || 'owner DM'

      const msg = nobox
     ? `AntiDelete: ${status}\nDestination: ${destText} → ${targetText}\n\nUsage:\n#antidelete on/off\n#antidelete set self\n#antidelete set number 255747470941\n#antidelete set group 123@g.us\n#antidelete set channel 123@newsletter\n#antidelete set inplace`
        : await box.info('ANTI-DELETE',
            `Status: ${status}\n` +
            `Destination: ${destText} → ${targetText}\n\n` +
            `Usage:\n` +
            `${fonts.mono('#antidelete on/off')}\n` +
            `${fonts.mono('#antidelete set self')}\n` +
            `${fonts.mono('#antidelete set number 255747470941')}\n` +
            `${fonts.mono('#antidelete set group 123@g.us')}\n` +
            `${fonts.mono('#antidelete set inplace')}`
          )

      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    if (action === 'on') {
      if (isGroup) {
        await db.setGroup(from, 'antiDelete', true)
      } else {
        await db.set('antiDelete', true)
      }
      const msg = nobox
     ? 'AntiDelete enabled ✅\nDeleted messages will be recovered.'
        : await box.success('AntiDelete enabled\nDeleted messages will be recovered.')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    if (action === 'off') {
      if (isGroup) {
        await db.setGroup(from, 'antiDelete', false)
      } else {
        await db.set('antiDelete', false)
      }
      const msg = nobox
     ? 'AntiDelete disabled ❌'
        : await box.success('AntiDelete disabled')
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }

    if (action === 'set') {
      const destType = value?.toLowerCase()
      const destTarget = args[2]

      if (!['self', 'number', 'group', 'channel', 'inplace'].includes(destType)) {
        const msg = nobox
       ? 'Invalid destination. Use: self, number, group, channel, inplace'
          : await box.error('Invalid destination. Use: self, number, group, channel, inplace')
        return await sock.sendMessage(from, { text: msg }, { quoted: m })
      }

      await db.set('antiDeleteDest', destType)

      if (destType === 'self') {
        await db.delete('antiDeleteTarget')
        const msg = nobox
       ? 'Destination set: Your DM ✅'
          : await box.success('Destination set: Your DM')
        return await sock.sendMessage(from, { text: msg }, { quoted: m })
      }

      if (destType === 'inplace') {
        await db.delete('antiDeleteTarget')
        const msg = nobox
       ? 'Destination set: Same chat where deleted ✅'
          : await box.success('Destination set: Same chat where deleted')
        return await sock.sendMessage(from, { text: msg }, { quoted: m })
      }

      if (!destTarget) {
        const msg = nobox
       ? `Provide target for ${destType}\nExample: #antidelete set ${destType} 255747470941`
          : await box.error(`Provide target for ${destType}\nExample: #antidelete set ${destType} 255747470941`)
        return await sock.sendMessage(from, { text: msg }, { quoted: m })
      }

      let finalTarget = destTarget
      if (destType === 'number') finalTarget = destTarget.replace(/[^0-9]/g, '')
      if (destType === 'group' &&!destTarget.endsWith('@g.us')) finalTarget = destTarget + '@g.us'
      if (destType === 'channel' &&!destTarget.includes('@')) finalTarget = destTarget + '@newsletter'

      await db.set('antiDeleteTarget', finalTarget)
      const msg = nobox
     ? `Destination set: ${destType} → ${finalTarget} ✅`
        : await box.success(`Destination set: ${destType} → ${finalTarget}`)
      return await sock.sendMessage(from, { text: msg }, { quoted: m })
    }
  }
}