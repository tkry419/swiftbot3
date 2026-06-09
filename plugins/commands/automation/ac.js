/**
 * SwiftBot - plugins/commands/automation/autochannelai.js
 * Auto Channel AI Controller - Full control over ACI observer
 * Category: Automation
 * Usage: aci on/off | aci set <key> <value> | aci learn | aci preview
 * Controls all aci_ db keys for autochannelai.js observer
 */

export default {
  name: 'autochannelai',
  alias: ['aci'],
  desc: 'Control Auto Channel AI - posts, learns, replies',
  usage: 'aci on/off | aci set <key> <value> | aci list | aci learn | aci preview | aci reset',
  category: 'Automation',
  permission: 'owner',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid
    const action = args[0]?.toLowerCase()

    // Helper: Show current config
    async function showConfig() {
      const [
        enabled, channelJid, interval, postType, footer, groqKey,
        autoReply, autoReact, learningMode, picCount, stats
      ] = await Promise.all([
        db.get('aci_enabled'),
        db.get('aci_channel_jid'),
        db.get('aci_interval'),
        db.get('aci_post_type'),
        db.get('aci_footer'),
        db.get('aci_groq_key'),
        db.get('aci_autoreply'),
        db.get('aci_autoreact'),
        db.get('aci_learning_mode'),
        db.get('aci_picture_links'),
        db.get('aci_stats')
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 🤖ᴀᴜᴛᴏᴄʜᴀɴᴇʟᴀɪ 〙═╗
┃
┃➠ sᴛᴀᴛᴜs: ${enabled === 'true'? 'ᴏɴ ✅' : 'ᴏғғ ❌'}
┃➠ ᴄʜᴀɴᴇʟ: ${channelJid || 'ɴᴏᴛ sᴇᴛ'}
┃➠ ɪɴᴛᴇʀᴠᴀʟ: ${interval? (parseInt(interval) / 60000) + 'ᴍ' : '5ᴍ'}
┃➠ ᴘᴏsᴛ ᴛʏᴘᴇ: ${postType || 'ʀᴀɴᴅᴏᴍ'}
┃➠ ɢʀᴏq ᴋᴇʏ: ${groqKey? 'sᴇᴛ ✅' : 'ɴᴏᴛ sᴇᴛ ❌'}
┃➠ ᴀᴜᴛᴏ ʀᴇᴘʟʏ: ${autoReply === 'true'? 'ᴏɴ ✅' : 'ᴏғғ ❌'}
┃➠ ᴀᴜᴛᴏ ʀᴇᴀᴄᴛ: ${autoReact === 'true'? 'ᴏɴ ✅' : 'ᴏғғ ❌'}
┃➠ ʟᴇᴀʀɴ ᴍᴏᴅᴇ: ${learningMode === 'true'? 'ᴏɴ 🧠' : 'ᴏғғ'}
┃➠ ᴘɪᴄᴛᴜʀᴇs: ${picCount? picCount.length : 0}
┃➠ ғᴏᴏᴛᴇʀ: ${footer? 'sᴇᴛ' : 'ᴅᴇғᴀᴜʟᴛ'}
┃
┃📊 sᴛᴀᴛs:
┃➠ ᴘᴏsᴛs: ${stats?.posts || 0}
┃➠ ʀᴇᴘʟɪᴇs: ${stats?.replies || 0}
┃➠ ʀᴇᴀᴄᴛs: ${stats?.reactions || 0}
┃
┃➠ ᴜsᴇ: ${prefix}aci help
╚═══════════════════╝`
      }, { quoted: m })
    }

    // No args = show config
    if (!action) return showConfig()

    // ON/OFF
    if (action === 'on' || action === 'enable') {
      const channelJid = await db.get('aci_channel_jid')
      if (!channelJid) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ sᴇᴛ ᴄʜᴀɴɴᴇʟ ғɪʀsᴛ:
┃➠ ${prefix}aci set channel <jid>
╚═══════════════════╝`
        }, { quoted: m })
      }
      await db.set('aci_enabled', 'true')
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴀᴄɪ ᴏɴ 〙═╗
┃➠ ᴀᴜᴛᴏ ᴘᴏsᴛɪɴɢ sᴛᴀʀᴛᴇᴅ
┃➠ ᴄʜᴀɴɴᴇʟ: ${channelJid}
┃➠ ɪɴᴛᴇʀᴠᴀʟ: ${(await db.get('aci_interval') || 300000) / 60000}ᴍ
╚═══════════════════╝`
      }, { quoted: m })
    }

    if (action === 'off' || action === 'disable') {
      await db.set('aci_enabled', 'false')
      return await sock.sendMessage(from, {
        text: `╔═〘 ❌ᴀᴄɪ ᴏғ 〙═╗
┃➠ ᴀᴜᴛᴏ ᴘᴏsᴛɪɴɢ sᴛᴏᴘᴇᴅ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // SET command
    if (action === 'set') {
      const key = args[1]?.toLowerCase()
      const value = args.slice(2).join(' ')

      if (!key) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ⚙️ᴀᴄɪ sᴇᴛ 〙═╗
┃
┃➠ ${prefix}aci set channel <jid>
┃➠ ${prefix}aci set interval <minutes>
┃➠ ${prefix}aci set groqkey <key>
┃➠ ${prefix}aci set footer <text>
┃➠ ${prefix}aci set prompt <text>
┃➠ ${prefix}aci set type <poll/tutorial/update>
┃➠ ${prefix}aci set autoreply on/off
┃➠ ${prefix}aci set autoreact on/off
┃
╚═══════════════════╝`
        }, { quoted: m })
      }

      switch (key) {
        case 'channel':
          if (!value ||!value.includes('@newsletter')) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ᴄʜᴀɴɴᴇʟ ᴊɪᴅ
┃➠ ᴍᴜsᴛ ᴇɴᴅ ᴡɪᴛʜ @newsletter
╚═══════════════════╝`
            }, { quoted: m })
          }
          await db.set('aci_channel_jid', value)
          break

        case 'interval':
          const mins = parseInt(value)
          if (!mins || mins < 1) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
┃➠ ɪɴᴛᴇʀᴠᴀʟ ᴍᴜsᴛ ʙᴇ 1+ ᴍɪɴ
╚═══════════════════╝`
            }, { quoted: m })
          }
          await db.set('aci_interval', mins * 60000)
          break

        case 'groqkey':
        case 'key':
          if (!value || value.length < 20) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
              ┃➠ ɪɴᴠᴀʟɪᴅ ɢʀᴏq ᴋᴇʏ
              ╚═══════════════════╝`
            }, { quoted: m })
          }
          await db.set('aci_groq_key', value)
          break

        case 'footer':
          await db.set('aci_footer', value || '«🚀 SwiftBot — Create Your Own WhatsApp Bot Experience 💖»')
          break

        case 'prompt':
        case 'system':
          await db.set('aci_final_prompt', value)
          break

        case 'type':
          if (!['poll', 'tutorial', 'update', 'custom', 'random'].includes(value)) {
            return await sock.sendMessage(from, {
              text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
              ┃➠ ᴛʏᴘᴇ: poll/tutorial/update/custom/random
              ╚═══════════════════╝`
            }, { quoted: m })
          }
          await db.set('aci_post_type', value === 'random'? null : value)
          break

        case 'autoreply':
          await db.set('aci_autoreply', value === 'on'? 'true' : 'false')
          break

        case 'autoreact':
          await db.set('aci_autoreact', value === 'on'? 'true' : 'false')
          break

        default:
          return await sock.sendMessage(from, {
            text: `╔═〘 ❌ᴜɴᴋɴᴏᴡɴ ᴋᴇʏ 〙═╗
            ┃➠ ᴜsᴇ: ${prefix}aci set
            ╚═══════════════════╝`
          }, { quoted: m })
      }

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅sᴇᴛ 〙═╗
        ┃➠ ᴀᴄɪ_${key}: ᴜᴘᴅᴀᴛᴇᴅ
        ┃➠ ᴠᴀʟᴜᴇ: ${value.substring(0, 30)}${value.length > 30? '...' : ''}
        ╚═══════════════════╝`
      }, { quoted: m })
    }

    // ADD PIC
    if (action === 'addpic' || action === 'addimage') {
      const url = args[1]
      if (!url ||!url.startsWith('http')) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
          ┃➠ ᴘʀᴏᴠɪᴅᴇ ᴠᴀʟɪᴅ ɪᴍᴀɢᴇ ᴜʀʟ
          ╚═══════════════════╝`
        }, { quoted: m })
      }
      const pics = await db.get('aci_picture_links') || []
      pics.push(url)
      await db.set('aci_picture_links', pics)
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴘɪᴄ ᴀᴅᴅᴇᴅ 〙═╗
        ┃➠ ᴛᴏᴛᴀʟ ᴘɪᴄs: ${pics.length}
        ╚═══════════════════╝`
      }, { quoted: m })
    }

    // DEL PIC
    if (action === 'delpic' || action === 'delimage') {
      const index = parseInt(args[1]) - 1
      const pics = await db.get('aci_picture_links') || []
      if (isNaN(index) || index < 0 || index >= pics.length) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
          ┃➠ ɪɴᴠᴀʟɪᴅ ɪɴᴅᴇx 1-${pics.length}
          ╚═══════════════════╝`
        }, { quoted: m })
      }
      pics.splice(index, 1)
      await db.set('aci_picture_links', pics)
      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴘɪᴄ ᴅᴇʟᴇᴛᴇᴅ 〙═╗
        ┃➠ ʀᴇᴍᴀɪɴɪɴɢ: ${pics.length}
        ╚═══════════════════╝`
      }, { quoted: m })
    }

    // LIST PICS
    if (action === 'listpic' || action === 'pics') {
      const pics = await db.get('aci_picture_links') || []
      if (pics.length === 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 📷ᴘɪᴄs 〙═╗
          ┃➠ ɴᴏ ᴘɪᴄᴛᴜʀᴇs sᴇᴛ
          ┃➠ ᴜsᴇ: ${prefix}aci addpic <url>
          ╚═══════════════════╝`
        }, { quoted: m })
      }
      let list = `╔═〘 📷ᴘɪᴄs ${pics.length} 〙═╗\n┃\n`
      pics.forEach((url, i) => {
        list += `┃➠ ${i + 1}. ${url.substring(0, 35)}...\n`
      })
      list += `╚═══════════════════╝`
      return await sock.sendMessage(from, { text: list }, { quoted: m })
    }

    // LEARN MODE
    if (action === 'learn') {
      await db.set('aci_learning_mode', 'true')
      await db.set('aci_learning_data', [])
      return await sock.sendMessage(from, {
        text: `╔═〘 🧠ʟᴇᴀʀɴ ᴍᴏᴅᴇ 〙═╗
        ┃➠ sᴇɴᴅ ᴍᴇ ᴇxᴀᴍᴘʟᴇ ᴘᴏsᴛs
        ┃➠ ɪ'ʟʟ ʟᴇᴀʀɴ ʏᴏᴜʀ sᴛʏʟᴇ
        ┃
        ┃➠ sᴇɴᴅ "done" ᴡʜᴇɴ ғɪɴɪsʜ
        ╚═══════════════════╝`
      }, { quoted: m })
    }

    // PREVIEW
    if (action === 'preview' || action === 'test') {
      const [enabled, channelJid, prompt] = await Promise.all([
        db.get('aci_enabled'),
        db.get('aci_channel_jid'),
        db.get('aci_final_prompt')
      ])
      if (enabled!== 'true') {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀʀᴏʀ 〙═╗
          ┃➠ ᴀᴄɪ ɪs ᴏғғ
          ╚═══════════════════╝`
        }, { quoted: m })
      }
      await sock.sendMessage(from, {
        text: `╔═〘 🔄ᴛᴇsᴛɪɴɢ 〙═╗
        ┃➠ ɢᴇɴᴇʀᴀᴛɪɴɢ ᴘʀᴇᴠɪᴇᴡ...
        ╚═══════════════════╝`
      }, { quoted: m })
      // Trigger one post
      await db.set('aci_last_post', 0)
      return
    }

    // RESET
    if (action === 'reset') {
      const keys = [
        'aci_enabled', 'aci_channel_jid', 'aci_interval', 'aci_groq_key',
        'aci_final_prompt', 'aci_picture_links', 'aci_footer', 'aci_post_type',
        'aci_autoreply', 'aci_autoreact', 'aci_learning_mode', 'aci_stats'
      ]
      for (const key of keys) await db.set(key, null)
      return await sock.sendMessage(from, {
        text: `╔═〘 🗑️ʀᴇsᴇᴛ 〙═╗
        ┃➠ ᴀʟ ᴀᴄɪ sᴇᴛᴛɪɴɢs ᴄʟᴇᴀʀᴇᴅ
        ╚═══════════════════╝`
      }, { quoted: m })
    }

    // HELP
    if (action === 'help') {
      return await sock.sendMessage(from, {
        text: `╔═〘 🤖ᴀᴄɪ ʜᴇʟᴘ 〙═╗
┃
┃➠ ${prefix}aci on/off
┃➠ ${prefix}aci set channel <jid>
┃➠ ${prefix}aci set interval <min>
┃➠ ${prefix}aci set groqkey <key>
┃➠ ${prefix}aci set prompt <text>
┃➠ ${prefix}aci set footer <text>
┃➠ ${prefix}aci set type <poll/tutorial>
┃➠ ${prefix}aci set autoreply on/off
┃➠ ${prefix}aci set autoreact on/off
┃
┃➠ ${prefix}aci addpic <url>
┃➠ ${prefix}aci delpic <number>
┃➠ ${prefix}aci pics
┃
┃➠ ${prefix}aci learn
┃➠ ${prefix}aci preview
┃➠ ${prefix}aci reset
┃➠ ${prefix}aci list
┃
╚═══════════════════╝`
      }, { quoted: m })
    }

    // LIST = show config
    if (action === 'list') return showConfig()

    // Unknown
    return await sock.sendMessage(from, {
      text: `╔═〘 ❌ᴜɴᴋɴᴏᴡɴ 〙═╗
      ┃➠ ᴜsᴇ: ${prefix}aci help
      ╚═══════════════════╝`
    }, { quoted: m })
  }
}