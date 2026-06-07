/**
 * SwiftBot - plugins/commands/economy/decline.js
 * Decline beg requests
 */

export default {
  name: 'decline',
  alias: ['refuse', 'reject'],
  desc: 'Decline a beg request',
  usage: '<request_id>',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const requestId = parseInt(args[0])

    if (!requestId) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ʀᴇǫᴜᴇsᴛ ɪᴅ
┃
┃➠ ᴜsᴀɢᴇ: ${prefix}decline <request_id>
╚═══════════════════╝`
      }, { quoted: m })
    }

    const groupId = isGroup? from : 'global'
    const begRequestsKey = `eco_${groupId}_beg_requests`
    const begRequests = await db.get(begRequestsKey) || []
    const requestIdx = begRequests.findIndex(r => r.id === requestId)

    if (requestIdx === -1 || begRequests[requestIdx].target!== sender) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ʀᴇǫᴜᴇsᴛ ɴᴏᴛ ғᴏᴜɴᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

    begRequests[requestIdx].status = 'declined'
    await db.set(begRequestsKey, begRequests)

    await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴅᴇᴄʟɪɴᴇᴅ 〙═╗
┃➠ ʙᴇɢ ʀᴇǫᴜᴇsᴛ ᴅᴇᴄʟɪɴᴇᴅ
┃
┃➠ ɪᴅ: ${requestId}
┃➠ ғʀᴏᴍ: @${begRequests[requestIdx].begger.split('@')[0]}
╚═══════════════════╝`,
      mentions: [begRequests[requestIdx].begger]
    }, { quoted: m })
  }
}