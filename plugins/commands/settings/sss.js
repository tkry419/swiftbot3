/**
 * SwiftBot - plugins/commands/settings/screenshots.js
 * Screenshot Privacy - Block screenshots of view-once media, profile pic, status
 * Category: settings
 * Uses Baileys: sock.updateProfileSettings, sock.fetchPrivacySettings
 * Works in DM + Groups, accepts @tag or raw numbers
 */

export default {
  name: 'screenshots',
  alias: ['screenshot', 'ssblock', 'viewonce'],
  desc: 'Block screenshots - view-once media, profile pic, status + custom excludes',
  usage: 'viewonce on/off | pic on/off | status on/off | exclude @user | status | reset',
  category: 'settings',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix }) => {
    const from = m.key.remoteJid
    const subCmd = args[0]?.toLowerCase()
    const mentioned = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []

    // Helper: Parse numbers from args if no mentions
    const parseNumbers = (startIdx = 1) => {
      const nums = []
      for (let i = startIdx; i < args.length; i++) {
        const clean = args[i].replace(/[^0-9]/g, '')
        if (clean.length >= 10) nums.push(clean + '@s.whatsapp.net')
      }
      return nums
    }

    const validOptions = ['viewonce', 'pic', 'status', 'exclude', 'reset']

    // 1. STATUS - Check current settings
    if (subCmd === 'status' ||!subCmd) {
      try {
        const settings = await sock.fetchPrivacySettings()
        const viewonceBlock = await db.get('ss_block_viewonce') || false
        const picBlock = await db.get('ss_block_pic') || false
        const statusBlock = await db.get('ss_block_status') || false
        const excludeList = JSON.parse(await db.get('ss_exclude') || '[]')

        let detailText = ''
        if (excludeList.length > 0) {
          detailText = `\n┃➠ ᴇxᴄʟᴜᴅᴇᴅ: ${excludeList.length} users`
        }

        return await sock.sendMessage(from, {
          text: `╔═〘 📵sᴄʀᴇᴇɴsʜᴏᴛ 〙═╗
┃➠ ᴠɪᴇᴡ-ᴏɴᴄᴇ: ${viewonceBlock? 'Bʟᴏᴄᴋᴇᴅ ✅' : 'Aʟᴏᴡᴇᴅ ❌'}
┃➠ ᴘʀᴏғɪʟᴇ ᴘɪᴄ: ${picBlock? 'Bʟᴏᴄᴋᴇᴅ ✅' : 'Aʟʟᴏᴡᴇᴅ ❌'}
┃➠ sᴛᴀᴛᴜs: ${statusBlock? 'Bʟᴏᴄᴋᴇᴅ ✅' : 'Aʟʟᴏᴡᴇᴅ ❌'}${detailText}
┃
┃➠ ᴇɴᴀʙʟᴇ: ${prefix}screenshots viewonce on
┃➠ ᴇxᴄʟᴜᴅᴇ: ${prefix}screenshots exclude @user
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
        }, { quoted: m })
      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ғᴇᴛᴄʜ sᴇᴛɪɴɢs
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 2. VIEWONCE SCREENSHOT BLOCK
    if (subCmd === 'viewonce') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}screenshots viewonce on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ screenshot_block_viewonce: enabled })
        await db.set('ss_block_viewonce', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🔒' : '🔓'}ᴠɪᴇᴡᴏɴᴄᴇ 〙═╗
┃➠ sᴄʀᴇᴇɴsʜᴏᴛ ʙʟᴏᴄᴋ: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'ᴘᴇᴏᴘʟᴇ ᴄᴀɴ\'ᴛ ss ᴜʀ ᴠɪᴇᴡ-ᴏɴᴄᴇ' : 'ᴘᴇᴏᴘʟᴇ ᴄᴀɴ ss ᴜʀ ᴠɪᴇᴡ-ᴏɴᴄᴇ'}
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴛᴏɢʟᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 3. PROFILE PIC SCREENSHOT BLOCK
    if (subCmd === 'pic') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}screenshots pic on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ screenshot_block_pic: enabled })
        await db.set('ss_block_pic', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🔒' : '🔓'}ᴘʀᴏғɪʟᴇ ᴘɪᴄ 〙═╗
┃➠ sᴄʀᴇᴇɴsʜᴏᴛ ʙʟᴏᴄᴋ: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'ᴘᴇᴏᴘʟᴇ ᴄᴀɴ\'ᴛ ss ᴜʀ ᴘʀᴏғɪʟᴇ ᴘɪᴄ' : 'ᴘᴇᴏᴘʟᴇ ᴄᴀɴ ss ᴜʀ ᴘʀᴏғɪʟᴇ ᴘɪᴄ'}
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴛᴏɢʟᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 4. STATUS SCREENSHOT BLOCK
    if (subCmd === 'status') {
      const toggle = args[1]?.toLowerCase()

      if (!['on', 'off', 'enable', 'disable'].includes(toggle)) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴜsᴀɢᴇ: ${prefix}screenshots status on/off
╚═══════════════════╝`
        }, { quoted: m })
      }

      const enabled = ['on', 'enable'].includes(toggle)

      try {
        await sock.updateProfileSettings({ screenshot_block_status: enabled })
        await db.set('ss_block_status', enabled)

        return await sock.sendMessage(from, {
          text: `╔═〘 ${enabled? '🔒' : '🔓'}sᴛᴀᴛᴜs 〙═╗
┃➠ sᴄʀᴇᴇɴsʜᴏᴛ ʙʟᴏᴄᴋ: ${enabled? 'ON' : 'OFF'}
┃➠ ${enabled? 'ᴘᴇᴏᴘʟᴇ ᴄᴀɴ\'ᴛ ss ᴜʀ sᴛᴀᴛᴜs' : 'ᴘᴇᴏᴘʟᴇ ᴄᴀɴ ss ᴜʀ sᴛᴀᴛᴜs'}
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴛᴏɢʟᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 5. EXCLUDE USERS - allow them to screenshot even if blocked
    if (subCmd === 'exclude') {
      let targets = mentioned.length > 0? mentioned : parseNumbers(1)

      if (targets.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴍᴇɴᴛɪᴏɴ ᴜsᴇʀs ᴏʀ ᴘᴀss ɴᴜᴍʙᴇʀs
┃➠ ᴇx: ${prefix}screenshots exclude @user
┃➠ ᴇx: ${prefix}screenshots exclude 2348012345678
╚═══════════════════╝`
        }, { quoted: m })
      }

      try {
        let excludeList = JSON.parse(await db.get('ss_exclude') || '[]')
        excludeList = [...new Set([...excludeList,...targets])]

        await sock.updateProfileSettings({ screenshot_except: excludeList })
        await db.set('ss_exclude', JSON.stringify(excludeList))

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ᴜᴘᴅᴀᴛᴇᴅ 〙═╗
┃➠ sᴄʀᴇᴇɴsʜᴏᴛ ᴇxᴄᴇᴘᴛɪᴏɴs: ${excludeList.length}
┃➠ ᴀᴅᴅᴇᴅ: ${targets.length} users
┃
┃➠ ᴛʜᴇʏ ᴄᴀɴ ss ᴇᴠᴇɴ ɪғ ʙʟᴏᴄᴋᴇᴅ
╚═══════════════════╝`,
          mentions: targets
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ᴇxᴄʟᴜᴅᴇ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // 6. RESET - Turn all off
    if (subCmd === 'reset') {
      try {
        await sock.updateProfileSettings({
          screenshot_block_viewonce: false,
          screenshot_block_pic: false,
          screenshot_block_status: false
        })
        await db.set('ss_block_viewonce', false)
        await db.set('ss_block_pic', false)
        await db.set('ss_block_status', false)
        await db.set('ss_exclude', null)

        return await sock.sendMessage(from, {
          text: `╔═〘 ✅ʀᴇsᴇᴛ 〙═╗
┃➠ ᴀʟ sᴄʀᴇᴇɴsʜᴏᴛ ʙʟᴏᴄᴋs: OFF
┃➠ ᴇxᴄʟᴜᴅᴇ ʟɪsᴛ ᴄʟᴇᴀʀᴇᴅ
╚═══════════════════╝`
        }, { quoted: m })

      } catch (e) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ғᴀɪʟᴇᴅ ᴛᴏ ʀᴇsᴇᴛ
┃➠ ${e.message}
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    // HELP
    return await sock.sendMessage(from, {
      text: `╔═〘 📵sᴄʀᴇᴇɴsʜᴏᴛ 〙═╗
┃➠ ${prefix}screenshots viewonce on/off
┃➠ ${prefix}screenshots pic on/off
┃➠ ${prefix}screenshots status on/off
┃➠ ${prefix}screenshots exclude @user
┃➠ ${prefix}screenshots exclude 2348012345678
┃➠ ${prefix}screenshots status - ᴠɪᴇᴡ sᴇᴛᴛɪɴɢs
┃➠ ${prefix}screenshots reset - ᴄʟᴇᴀʀ ᴀʟ
┃
┃➠ ᴡᴏʀᴋs ɪɴ DM & ɢʀᴏᴜᴘs
╚═══════════════════╝`
    }, { quoted: m })
  }
}