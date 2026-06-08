/**
 * SwiftBot - plugins/commands/economy/gang.js
 * Group-Based Gang/Clan System - Shared Bank + Upgrades
 * Uses db keys: eco_${groupJid}_gang_${name}_*, eco_${groupJid}_user_gang_${user}
 */

const formatCash = (num) => {
  return Number(num || 0).toLocaleString('en-US')
}

const GANG_UPGRADES = {
  vault: { name: 'Vault', max: 5, cost: [50000, 150000, 400000, 1000000, 3000000], desc: 'Increases gang bank limit' },
  turf: { name: 'Turf', max: 3, cost: [100000, 500000, 2000000], desc: '+5% work income for all members' },
  armory: { name: 'Armory', max: 3, cost: [200000, 800000, 2500000], desc: '+10% heist success + war power' }
}

const getGangLimit = (vaultLevel) => {
  return 100000 * Math.pow(5, vaultLevel) // LV0=100k, LV1=500k, LV2=2.5m, LV3=12.5m, LV4=62.5m, LV5=312.5m
}

const getGangPower = async (db, groupId, gangName) => {
  const [members, armory, turf] = await Promise.all([
    db.get(`eco_${groupId}_gang_${gangName}_members`),
    db.get(`eco_${groupId}_gang_${gangName}_armory`),
    db.get(`eco_${groupId}_gang_${gangName}_turf`)
  ])
  const memberList = JSON.parse(members || '[]')

  let totalPower = 0
  for (const member of memberList) {
    const [level, bank] = await Promise.all([
      db.get(`eco_${groupId}_level_${member}`),
      db.get(`eco_${groupId}_bank_${member}`)
    ])
    totalPower += (level || 1) * 100 + Math.floor((bank || 0) / 10000)
  }

  return totalPower + ((armory || 0) * 15) + ((turf || 0) * 5)
}

export default {
  name: 'gang',
  alias: ['clan', 'squad'],
  desc: 'Create/join gangs, shared bank, upgrades',
  usage: 'create <name> | join <name> | leave | info | deposit <amount> | withdraw <amount> | upgrade <type> | members',
  category: 'Economy',
  permission: 'all',

  execute: async (sock, m, args, { db, prefix, isGroup }) => {
    const from = m.key.remoteJid
    const sender = m.key.participant || m.key.remoteJid

    // 1. CHECK IF ECONOMY ENABLED
    if (isGroup) {
      const ecoEnabled = await db.getGroupKey(from, 'eco_enabled')
      if (!ecoEnabled) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴇᴄᴏɴᴏᴍʏ ᴅɪsᴀʙʟᴇᴅ
┃➠ ᴀsᴋ ᴀᴅᴍɪɴ ᴛᴏ ᴇɴᴀʙʟᴇ:
┃➠ ${prefix}ecoon
╚═══════════════════╝`
        }, { quoted: m })
      }
    }

    const groupId = isGroup? from : 'global'
    const userGangKey = `eco_${groupId}_user_gang_${sender}`
    const balanceKey = `eco_${groupId}_balance_${sender}`
    const jailKey = `eco_${groupId}_jail_${sender}`
    const subCmd = args[0]?.toLowerCase()

    // 2. FETCH USER DATA
    const [userGang, balance, jailTime, currency] = await Promise.all([
      db.get(userGangKey),
      db.get(balanceKey),
      db.get(jailKey),
      db.getGroupKey(groupId, 'eco_currency')
    ])

    const currencySymbol = currency || '$'

    // 3. CHECK JAIL
    if (jailTime && Date.now() < jailTime) {
      const remaining = Math.ceil((jailTime - Date.now()) / 60000)
      return await sock.sendMessage(from, {
        text: `╔═〘 🚨ᴊᴀɪʟ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɪɴ ᴊᴀɪʟ
┃➠ ⏰ ʀᴇʟᴇᴀsᴇ ɪɴ: ${remaining}ᴍ
┃➠ ɴᴏ ɢᴀɴɢ ᴀᴄᴛɪᴏɴs ɪɴ ᴊᴀɪʟ
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 4. CREATE GANG
    if (subCmd === 'create') {
      const gangName = args.slice(1).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!gangName || gangName.length < 3) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɪɴᴠᴀʟɪᴅ ɢᴀɴɢ ɴᴀᴍᴇ
┃➠ ᴍɪɴ 3 ᴄʜᴀʀs, ᴀ-ᴢ 0-9 ᴏɴʟʏ
┃➠ ᴜsᴀɢᴇ: ${prefix}gang create <name>
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (userGang) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ɪɴ ɢᴀɴɢ: ${userGang}
┃➠ ᴜsᴇ ${prefix}gang leave first
╚═══════════════════╝`
        }, { quoted: m })
      }

      const gangExistsKey = `eco_${groupId}_gang_${gangName}_owner`
      const owner = await db.get(gangExistsKey)
      if (owner) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɢᴀɴɢ "${gangName}" ᴇxɪsᴛs
┃➠ ᴄʜᴏsᴇ ᴀɴᴏᴛʜᴇʀ ɴᴀᴍᴇ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const createCost = 25000
      if (!balance || balance < createCost) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴄᴀsʜ
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(createCost)}
┃➠ ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance || 0)}
╚═══════════════════╝`
        }, { quoted: m })
      }

      await Promise.all([
        db.set(balanceKey, balance - createCost),
        db.set(userGangKey, gangName),
        db.set(gangExistsKey, sender),
        db.set(`eco_${groupId}_gang_${gangName}_bank`, 0),
        db.set(`eco_${groupId}_gang_${gangName}_members`, JSON.stringify([sender])),
        db.set(`eco_${groupId}_gang_${gangName}_vault`, 0),
        db.set(`eco_${groupId}_gang_${gangName}_turf`, 0),
        db.set(`eco_${groupId}_gang_${gangName}_armory`, 0)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 🏴ɢᴀɴɢ ᴄʀᴇᴀᴛᴇᴅ 〙═╗
┃➠ ɴᴀᴍᴇ: ${gangName}
┃➠ ᴏᴡɴᴇʀ: You
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(createCost)}
┃
┃➠ 🏦 ɢᴀɴɢ ʙᴀɴᴋ: ${currencySymbol}0
┃➠ 👥 ᴍᴇᴍʙᴇʀs: 1
┃➠ 📈 ʙᴀɴᴋ ʟɪᴍɪᴛ: ${currencySymbol}${formatCash(getGangLimit(0))}
┃➠ 💪 ᴘᴏᴡᴇʀ: 10
╚═══════════════════╝

╭━━━━❮ ᴄᴏᴍᴀɴᴅs ❯━⊷
┃➠ ${prefix}gang deposit <amount>
┃➠ ${prefix}gang upgrade vault
┃➠ ${prefix}war @user
╰━━━━━━━━━━━━━━━━━⊷`
      }, { quoted: m })
    }

    // 5. JOIN GANG
    if (subCmd === 'join') {
      const gangName = args.slice(1).join(' ').toLowerCase().replace(/[^a-z0-9]/g, '')
      if (!gangName) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ sᴘᴇᴄɪғʏ ɢᴀɴɢ ɴᴀᴍᴇ
┃➠ ᴜsᴀɢᴇ: ${prefix}gang join <name>
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (userGang) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴀʟʀᴇᴀᴅʏ ɪɴ ɢᴀɴɢ: ${userGang}
┃➠ ᴜsᴇ ${prefix}gang leave first
╚═══════════════════╝`
        }, { quoted: m })
      }

      const gangExistsKey = `eco_${groupId}_gang_${gangName}_owner`
      const owner = await db.get(gangExistsKey)
      if (!owner) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɢᴀɴɢ "${gangName}" ɴᴏᴛ ғᴏᴜɴᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const membersKey = `eco_${groupId}_gang_${gangName}_members`
      const members = JSON.parse(await db.get(membersKey) || '[]')

      if (members.length >= 10) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ɢᴀɴɢ ғᴜʟ: 10/10
╚═══════════════════╝`
        }, { quoted: m })
      }

      members.push(sender)
      await Promise.all([
        db.set(userGangKey, gangName),
        db.set(membersKey, JSON.stringify(members))
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴊᴏɪɴᴇᴅ 〙═╗
┃➠ ɢᴀɴɢ: ${gangName}
┃➠ 👥 ᴍᴇᴍʙᴇʀs: ${members.length}/10
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 6. LEAVE GANG
    if (subCmd === 'leave') {
      if (!userGang) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const ownerKey = `eco_${groupId}_gang_${userGang}_owner`
      const membersKey = `eco_${groupId}_gang_${userGang}_members`
      const [owner, members] = await Promise.all([db.get(ownerKey), db.get(membersKey)])
      const memberList = JSON.parse(members || '[]').filter(m => m!== sender)

      if (owner === sender && memberList.length > 0) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ᴏᴡɴᴇʀ ᴄᴀɴ'ᴛ ʟᴇᴀᴠᴇ
┃➠ ᴋɪᴄᴋ ᴀʟ ᴍᴇᴍʙᴇʀs ᴛᴏ ᴅɪsʙᴀɴᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      if (owner === sender && memberList.length === 0) {
        await Promise.all([
          db.set(userGangKey, null),
          db.set(ownerKey, null),
          db.set(membersKey, null),
          db.set(`eco_${groupId}_gang_${userGang}_bank`, null)
        ])
        return await sock.sendMessage(from, {
          text: `╔═〘 💥ᴅɪsʙᴀɴᴅᴇᴅ 〙═╗
┃➠ ɢᴀɴɢ "${userGang}" ᴅᴇʟᴇᴛᴇᴅ
╚═══════════════════╝`
        }, { quoted: m })
      }

      await Promise.all([
        db.set(userGangKey, null),
        db.set(membersKey, JSON.stringify(memberList))
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 🚪ʟᴇғᴛ 〙═╗
┃➠ ʏᴏᴜ ʟᴇғᴛ "${userGang}"
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 7. MEMBERS LIST
    if (subCmd === 'members') {
      if (!userGang) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ
╚═══════════════════╝`
        }, { quoted: m })
      }

      const [members, owner] = await Promise.all([
        db.get(`eco_${groupId}_gang_${userGang}_members`),
        db.get(`eco_${groupId}_gang_${userGang}_owner`)
      ])

      const memberList = JSON.parse(members || '[]')
      let memberText = `╔═〘 👥ᴍᴇᴍʙᴇʀs 〙═╗\n┃➠ ɢᴀɴɢ: ${userGang}\n┃\n`

      for (const member of memberList) {
        const [level, name] = await Promise.all([
          db.get(`eco_${groupId}_level_${member}`),
          db.get(`pushname_${member}`)
        ])
        const isOwner = member === owner? '👑 ' : ''
        memberText += `┃➠ ${isOwner}@${name || member.split('@')[0]} - LV${level || 1}\n`
      }

      memberText += `╚═══════════════════╝`
      return await sock.sendMessage(from, { text: memberText, mentions: memberList }, { quoted: m })
    }

    // 8. GANG INFO
    if (subCmd === 'info' ||!subCmd) {
      if (!userGang) {
        return await sock.sendMessage(from, {
          text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗
┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ
┃➠ ${prefix}gang create <name>
┃➠ ${prefix}gang join <name>
╚═══════════════════╝`
        }, { quoted: m })
      }

      const [gangBank, owner, members, vault, turf, armory] = await Promise.all([
        db.get(`eco_${groupId}_gang_${userGang}_bank`),
        db.get(`eco_${groupId}_gang_${userGang}_owner`),
        db.get(`eco_${groupId}_gang_${userGang}_members`),
        db.get(`eco_${groupId}_gang_${userGang}_vault`),
        db.get(`eco_${groupId}_gang_${userGang}_turf`),
        db.get(`eco_${groupId}_gang_${userGang}_armory`)
      ])

      const memberList = JSON.parse(members || '[]')
      const isOwner = owner === sender
      const power = await getGangPower(db, groupId, userGang)

      return await sock.sendMessage(from, {
        text: `╔═〘 🏴ɢᴀɴɢ ɪɴғᴏ 〙═╗
┃➠ ɴᴀᴍᴇ: ${userGang}
┃➠ 👑 ᴏᴡɴᴇʀ: ${isOwner? 'You' : '@' + owner.split('@')[0]}
┃
┃➠ 🏦 ʙᴀɴᴋ: ${currencySymbol}${formatCash(gangBank || 0)}
┃➠ 📈 ʟɪᴍɪᴛ: ${currencySymbol}${formatCash(getGangLimit(vault || 0))}
┃➠ 👥 ᴍᴇᴍʙᴇʀs: ${memberList.length}/10
┃➠ 💪 ᴘᴏᴡᴇʀ: ${power}
┃
┃➠ 🔒 ᴠᴀᴜʟᴛ: LV${vault || 0}/${GANG_UPGRADES.vault.max}
┃➠ 🌆 ᴛᴜʀғ: LV${turf || 0}/${GANG_UPGRADES.turf.max}
┃➠ 🔫 ᴀʀᴍᴏʀʏ: LV${armory || 0}/${GANG_UPGRADES.armory.max}
╚═══════════════════╝

╭━━━━❮ ᴄᴏᴍᴀɴᴅs ❯━⊷
┃➠ ${prefix}gang deposit <amount>
┃➠ ${prefix}gang withdraw <amount>
┃➠ ${prefix}gang upgrade <type>
┃➠ ${prefix}gang members
┃➠ ${prefix}war @user
╰━━━━━━━━━━━━━━━━━⊷`,
        mentions: isOwner? [] : [owner]
      }, { quoted: m })
    }

    // 9. DEPOSIT
    if (subCmd === 'deposit') {
      if (!userGang) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ\n╚═══════════════════╝` }, { quoted: m })

      const amount = parseInt(args[1])
      if (!amount || isNaN(amount) || amount < 1000) {
        return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ᴍɪɴ ᴅᴇᴘᴏsɪᴛ: ${currencySymbol}1,000\n╚═══════════════════╝` }, { quoted: m })
      }
      if (!balance || balance < amount) {
        return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ᴄᴀsʜ\n┃➠ ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance || 0)}\n╚═══════════════════╝` }, { quoted: m })
      }

      const [gangBank, vault] = await Promise.all([
        db.get(`eco_${groupId}_gang_${userGang}_bank`),
        db.get(`eco_${groupId}_gang_${userGang}_vault`)
      ])
      const limit = getGangLimit(vault || 0)
      if ((gangBank || 0) + amount > limit) {
        return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ɢᴀɴɢ ʙᴀɴᴋ ғᴜʟ\n┃➠ ʟɪᴍɪᴛ: ${currencySymbol}${formatCash(limit)}\n╚═══════════════════╝` }, { quoted: m })
      }

      await Promise.all([
        db.set(balanceKey, balance - amount),
        db.set(`eco_${groupId}_gang_${userGang}_bank`, (gangBank || 0) + amount)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴅᴇᴘᴏsɪᴛᴇᴅ 〙═╗
┃➠ ᴀᴍᴏᴜɴᴛ: ${currencySymbol}${formatCash(amount)}
┃➠ ɢᴀɴɢ: ${userGang}
┃➠ 🏦 ɢᴀɴɢ ʙᴀɴᴋ: ${currencySymbol}${formatCash((gangBank || 0) + amount)}
┃➠ 💰 ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash(balance - amount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 10. WITHDRAW - OWNER ONLY
    if (subCmd === 'withdraw') {
      if (!userGang) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ\n╚═══════════════════╝` }, { quoted: m })
      const owner = await db.get(`eco_${groupId}_gang_${userGang}_owner`)
      if (owner!== sender) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ᴏɴʟʏ ᴏᴡɴᴇʀ ᴄᴀɴ ᴡɪᴛʜᴅʀᴀᴡ\n╚═══════════════════╝` }, { quoted: m })

      const amount = parseInt(args[1])
      const gangBank = await db.get(`eco_${groupId}_gang_${userGang}_bank`)
      if (!amount || isNaN(amount) || amount < 1000) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ᴍɪɴ ᴡɪᴛʜᴅʀᴀᴡ: ${currencySymbol}1,000\n╚═══════════════════╝` }, { quoted: m })
      if (!gangBank || gangBank < amount) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ɪɴ ɢᴀɴɢ ʙᴀɴᴋ\n╚═══════════════════╝` }, { quoted: m })

      await Promise.all([
        db.set(balanceKey, (balance || 0) + amount),
        db.set(`eco_${groupId}_gang_${userGang}_bank`, gangBank - amount)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ✅ᴡɪᴛʜᴅʀᴇᴡ 〙═╗
┃➠ ᴀᴍᴏᴜɴᴛ: ${currencySymbol}${formatCash(amount)}
┃➠ 🏦 ɢᴀɴɢ ʙᴀɴᴋ: ${currencySymbol}${formatCash(gangBank - amount)}
┃➠ 💰 ʏᴏᴜʀ ᴄᴀsʜ: ${currencySymbol}${formatCash((balance || 0) + amount)}
╚═══════════════════╝`
      }, { quoted: m })
    }

    // 11. UPGRADE - OWNER ONLY
    if (subCmd === 'upgrade') {
      if (!userGang) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ʏᴏᴜ'ʀᴇ ɴᴏᴛ ɪɴ ᴀ ɢᴀɴɢ\n╚═══════════════════╝` }, { quoted: m })
      const owner = await db.get(`eco_${groupId}_gang_${userGang}_owner`)
      if (owner!== sender) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ᴏɴʟʏ ᴏᴡɴᴇʀ ᴄᴀɴ ᴜᴘɢʀᴀᴅᴇ\n╚═══════════════════╝` }, { quoted: m })

      const upgradeType = args[1]?.toLowerCase()
      if (!GANG_UPGRADES[upgradeType]) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ᴏᴘᴛɪᴏɴs: vault, turf, armory\n╚═══════════════════╝` }, { quoted: m })

      const currentLevel = await db.get(`eco_${groupId}_gang_${userGang}_${upgradeType}`) || 0
      const upgradeData = GANG_UPGRADES[upgradeType]
      if (currentLevel >= upgradeData.max) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ${upgradeData.name} ᴀʟʀᴇᴀᴅʏ ᴍᴀx\n╚═══════════════════╝` }, { quoted: m })

      const cost = upgradeData.cost[currentLevel]
      const gangBank = await db.get(`eco_${groupId}_gang_${userGang}_bank`)
      if (!gangBank || gangBank < cost) return await sock.sendMessage(from, { text: `╔═〘 ❌ᴇʀᴏʀ 〙═╗\n┃➠ ɴᴏᴛ ᴇɴᴏᴜɢʜ ɪɴ ɢᴀɴɢ ʙᴀɴᴋ\n┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(cost)}\n╚═══════════════════╝` }, { quoted: m })

      await Promise.all([
        db.set(`eco_${groupId}_gang_${userGang}_bank`, gangBank - cost),
        db.set(`eco_${groupId}_gang_${userGang}_${upgradeType}`, currentLevel + 1)
      ])

      return await sock.sendMessage(from, {
        text: `╔═〘 ⬆️ᴜᴘɢʀᴀᴅᴇᴅ 〙═╗
┃➠ ᴜᴘɢʀᴀᴅᴇ: ${upgradeData.name}
┃➠ ʟᴇᴠᴇʟ: ${currentLevel} → ${currentLevel + 1}
┃➠ ᴄᴏsᴛ: ${currencySymbol}${formatCash(cost)}
┃
┃➠ ${upgradeData.desc}
┃➠ 🏦 ɢᴀɴɢ ʙᴀɴᴋ: ${currencySymbol}${formatCash(gangBank - cost)}
╚═══════════════════╝`
      }, { quoted: m })
    }

  }
}