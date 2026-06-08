/**
 * SwiftBot - plugins/commands/settings/accounts.js
 * Multi-Account System - Switch between 2 accounts, link/unlink, view active
 * Category: settings
 * Uses DB to store multiple session configs
 */

export default {
  name: 'accounts',
  alias: ['acc', 'switch', 'multi'],
  desc: 'Switch between 2 WhatsApp accounts, link/unlink, view active',
  usage: 'list | add <name> | switch <id/name> | remove <id> | current',
  category: 'settings',
  permission: 'owner', // Only bot owner can switch accounts

  execute: async (sock, m, args, { db, prefix, isOwner }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()

    if (!isOwner) {
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏɴʟʏ ʙᴏᴛ ᴏᴡɴᴇʀ ᴄᴀɴ ᴍᴀɴᴀɢᴇ ᴀᴄᴄᴏᴜɴᴛs
╚═══════════════════╝`
      }, { quoted: m })
    }

    const accounts = JSON.parse(await db.get('linked_accounts') || '[]')
    const currentAcc = await db.get('current_account') || 'main'

    // 1. LIST ALL ACCOUNTS
    if (subCmd === 'list' ||!subCmd) {
      if (accounts.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 👤ᴀᴄᴄᴏᴜɴᴛs 〙═╗
┃➠ ᴄᴜʀʀᴇɴᴛ: ${currentAcc} ✅
┃➠ ɴᴏ ᴏᴛʜᴇʀ ᴀᴄᴄᴏᴜɴᴛs ʟɪɴᴋᴇᴅ
┃
┃➠ ᴀᴅᴅ: ${prefix}accounts add Work
╚═══════════════════╝`
        }, { quoted: m })
      }

      let listText = `╔═〘 👤ᴀᴄᴄᴏᴜɴᴛs 〙═╗\n┃➠ ᴄᴜʀʀᴇɴᴛ: ${currentAcc} ✅\n┃➠ ᴛᴏᴛᴀʟ: ${accounts.length + 1}\n┃\n`

      listText += `┃➠ [0] main ${currentAcc === 'main'? '✅' : ''}\n`

      for (let i = 0; i < accounts.length; i++) {
        const acc = accounts[i]
        const active = currentAcc === acc.id? '✅' : ''
        listText += `┃➠ [${i + 1}] ${acc.name} ${active}\n`
        listText += `┃ └─ ɪᴅ: ${acc.id}\n`
        listText += `┃ └─ ɴᴜᴍ: +${acc.number}\n`
      }

      listText += `┃\n┃➠ sᴡɪᴛᴄʜ: ${prefix}accounts switch <id/name>\n┃➠ ᴀᴅᴅ: ${prefix}accounts add <name>\n┃➠ ʀᴇᴍᴏᴠᴇ: ${prefix}accounts remove <id>\n╚═══════════════════╝`

      return await sock.sendMessage(from, { text: listText }, { quoted: m })
    }

    // 2. ADD NEW ACCOUNT
    if (subCmd === 'add') {
      const accName = args[1]

      if (!accName) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴀᴄᴄᴏᴜɴᴛ ɴᴀᴍᴇ
┃➠ ᴇx: ${prefix}accounts add Work
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (accounts.length >= 1) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴀx 2 ᴀᴄᴄᴏᴜɴᴛs ᴀʟʟᴏᴡᴇᴅ
┃➠ ʀᴇᴍᴏᴠᴇ ᴏɴᴇ ғɪʀsᴛ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const accId = `acc_${Date.now()}`

      return await sock.sendMessage(from, {
        text: `╔═〘 ⚙️sᴇᴛᴜᴘ 〙═╗
┃➠ ᴛᴏ ᴀᴅᴅ ᴀᴄᴄᴏᴜɴᴛ: ${accName}
┃➠ ɪᴅ: ${accId}
┃
┃➠ sᴄᴀɴ QR ᴡɪᴛʜ sᴇᴄᴏɴᴅ ᴘʜᴏɴᴇ
┃➠ ᴏʀ ᴜsᴇ ᴘᴀɪʀɪɴɢ ᴄᴏᴅᴇ
┃
┃➠ ɴᴏᴛᴇ: ʀᴇsᴛᴀʀᴛ ʙᴏᴛ ᴀғᴛᴇʀ ʟɪɴᴋ
┃➠ sᴀᴠᴇ sᴇssɪᴏɴ ᴀs: session_${accId}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 3. SWITCH ACCOUNT
    if (subCmd === 'switch') {
      const target = args[1]

      if (!target) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴀᴄᴄᴏᴜɴᴛ ɪᴅ/ɴᴀᴍᴇ
┃➠ ᴇx: ${prefix}accounts switch main
┃➠ ᴇx: ${prefix}accounts switch Work
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (target === 'main' || target === '0') {
        await db.set('current_account', 'main')
        return await sock.sendMessage(from, {
          text: `╔═〘 ✅sᴡɪᴛᴄʜᴇᴅ 〙═╗
┃➠ ᴀᴄᴛɪᴠᴇ: main
┃➠ ʀᴇsᴛᴀʀᴛ ʙᴏᴛ ᴛᴏ ᴀᴘᴘʟʏ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const foundAcc = accounts.find(a => a.id === target || a.name.toLowerCase() === target.toLowerCase())

      if (!foundAcc) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴀᴄᴄᴏᴜɴᴛ ɴᴏᴛ ғᴏᴜɴᴅ
┃➠ ᴄʜᴇᴄᴋ: ${prefix}accounts list
╚═══════════════════╝`
        }, { quoted: m })
      }

      await db.set('current_account', foundAcc.id)

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅sᴡɪᴛᴄʜᴇᴅ 〙═╗
┃➠ ᴀᴄᴛɪᴠᴇ: ${foundAcc.name}
┃➠ ɪᴅ: ${foundAcc.id}
┃➠ ɴᴜᴍ: +${foundAcc.number}
┃
┃➠ ʀᴇsᴛᴀʀᴛ ʙᴏᴛ ᴛᴏ ᴀᴘᴘʟʏ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. REMOVE ACCOUNT
    if (subCmd === 'remove') {
      const accId = args[1]

      if (!accId) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍɪssɪɴɢ ᴀᴄᴄᴏᴜɴᴛ ɪᴅ
┃➠ ᴇx: ${prefix}accounts remove acc_1234
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (accId === currentAcc) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴄᴀɴ'ᴛ ʀᴇᴍᴏᴠᴇ ᴀᴄᴛɪᴠᴇ ᴀᴄᴄᴏᴜɴᴛ
┃➠ sᴡɪᴛᴄʜ ғɪʀsᴛ: ${prefix}accounts switch main
╚═══════════════════╝`
        }, { quoted: m })
      }

      const newAccounts = accounts.filter(a => a.id!== accId)
      await db.set('linked_accounts', JSON.stringify(newAccounts))

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ʀᴇᴍᴏᴠᴇᴅ 〙═╗
┃➠ ᴀᴄᴄᴏᴜɴᴛ: ${accId}
┃➠ ᴅᴇʟᴇᴛᴇ sᴇssɪᴏɴ ғᴏʟᴅᴇʀ ᴛᴏᴏ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 5. CURRENT ACCOUNT
    if (subCmd === 'current') {
      const accInfo = currentAcc === 'main'?
        { name: 'main', number: sock.user.id.split('@')[0] } :
        accounts.find(a => a.id === currentAcc)

      return await sock.sendMessage(from, {
        text: `╔═〘 👤ᴄᴜʀʀᴇɴᴛ 〙═╗
┃➠ ɴᴀᴍᴇ: ${accInfo?.name || 'main'}
┃➠ ɴᴜᴍʙᴇʀ: +${accInfo?.number || sock.user.id.split('@')[0]}
┃➠ ɪᴅ: ${currentAcc}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 👤ᴀᴄᴄᴏᴜɴᴛs 〙═╗
┃➠ ${prefix}accounts list - ᴀʟ ᴀᴄᴄᴏᴜɴᴛs
┃➠ ${prefix}accounts add <name> - ʟɪɴᴋ ɴᴇᴡ
┃➠ ${prefix}accounts switch <id/name>
┃➠ ${prefix}accounts remove <id>
┃➠ ${prefix}accounts current - ᴀᴄᴛɪᴠᴇ
┃
┃➠ ᴍᴀx: 2 ᴀᴄᴄᴏᴜɴᴛs
╚═══════════════════╝`
    }, { quoted: m })
  }
}