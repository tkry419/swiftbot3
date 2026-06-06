/**
 * SwiftBot - plugins/commands/profile/delete.js
 * Delete Messages - vs Bot
 * Works in groups and DM
 * Deletes replied messages silently
 * No admin checks
 */

export default {
  name: 'delete',
  alias: [
    'del',
    'dlt',
    'remove',
    'unsend'
  ],
  desc: 'Delete replied message',
  usage: 'reply message',
  category: 'Profile',
  permission: 'all',

  execute: async (sock, m, args, { db }) => {

    const from = m.key.remoteJid

    const context =
      m.message?.extendedTextMessage?.contextInfo

    // NO REPLY
    if (!context?.stanzaId) return

    try {

      // DELETE TARGET MESSAGE
      await sock.sendMessage(from, {
        delete: {
          remoteJid: from,
          fromMe:
            context.participant
              ? context.participant === sock.user.id
              : false,
          id: context.stanzaId,
          participant:
            context.participant || undefined
        }
      })

    } catch {

      // FALLBACK 1
      try {

        await sock.sendMessage(from, {
          delete: {
            remoteJid: from,
            id: context.stanzaId,
            participant:
              context.participant || undefined
          }
        })

      } catch {

        // FALLBACK 2
        try {

          await sock.chatModify({
            delete: true,
            lastMessages: [
              {
                key: {
                  remoteJid: from,
                  id: context.stanzaId,
                  fromMe: false,
                  participant:
                    context.participant || undefined
                },
                messageTimestamp:
                  Date.now()
              }
            ]
          }, from)

        } catch {}

      }

    }
  }
}