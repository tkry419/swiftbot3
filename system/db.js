/**
 * SwiftBot - system/db.js
 * Auto-detects MongoDB or falls back to RAM mode
 * All settings are real-time — no restart needed
 * FULLY ADAPTIVE - accepts any DB keys
 */

import { MongoClient } from 'mongodb'

// ─────────────────────────────────────────────
// DEFAULT SETTINGS — All changeable at runtime
// Only for fallback values, NOT restrictions
// ─────────────────────────────────────────────
export const DEFAULTS = {
  // Bot identity
  prefix: '#',
  botname: 'SwiftBot',
  botimage: 'https://i.ibb.co/S7sRhPFq/IMG-20260601-WA0038.jpg',
  language: 'en',
  theme: 'default',

  // Owner — FIX: Empty by default, set from sock.user.id on connect
  owner: '',
  ownerName: 'Owner',

  // Mode
  mode: 'public', // public | private | groups | dm
  noPrefix: false, // true = "menu" works without prefix

  // Box Style — Added for 30 styles
  boxStyle: '1', // Default Classic

  // Channel context (forwarded style — same as Repo 1)
  channelEnabled: true,
  channelJid: '', // Set via env or setagentapi command
  channelLink: '',
  channelName: 'SwiftBot Updates',
  channelForwardScore: 430,

  // AI Agent
  agentEnabled: false,
  agentApi: null, // Groq API key
  agentModel: 'llama3-70b-8192',
  agentSystem: 'You are SwiftBot, a helpful WhatsApp assistant.',
  agentFallbacks: ['llama3-70b-8192', 'llama3-8b-8192', 'mixtral-8x7b-32768'],

  // Automation
  autoRead: false,
  autoTyping: false,
  autoRecording: false,
  autoStatusView: false,

  // Anti features (global defaults — groups override per-group)
  antiLink: false,
  antiBadWord: false,
  antiSpam: false,
  antiDelete: false,

  // Messaging
  welcomeMsg: true,
  goodbyeMsg: true,

  // Lists (arrays)
  sudoUsers: [],
  disabledCmds: [],
  badWords: [],

  // Economy / XP (optional, can be disabled)
  economyEnabled: false,
  xpEnabled: false,

  // ─── AUTO LIKE STATUS ───
  autolikestatus: false,
  autolikestatusAll: false,
  autolikestatusUsers: [],

  // ─── ANTI LINK ───
  antilink: false,
  antilinkAction: 'delete',
  antilinkGroupsEnabled: false,
  antilinkGroups: [],
  antilinkWhitelist: [],

  // ─── ANTI BAD WORDS ───
  antibadwords: false,
  antibadwordsAction: 'delete',
  antibadwordsGroupsEnabled: false,
  antibadwordsGroups: [],
  antibadwordsWhitelist: [],
  antibadwordsList: [],

  // ─── ANTI SPAM ───
  antispam: false,
  antispamAction: 'delete',
  antispamLimit: 5,
  antispamWindow: 10,
  antispamGroupsEnabled: false,
  antispamGroups: [],
  antispamWhitelist: [],

  // ─── ANTI STICKER ───
  antisticker: false,
  antistickerAction: 'delete',
  antistickerGroupsEnabled: false,
  antistickerGroups: [],
  antistickerWhitelist: [],

  // ─── ANTI VIDEO ───
  antivideo: false,
  antivideoAction: 'delete',
  antivideoGroupsEnabled: false,
  antivideoGroups: [],
  antivideoWhitelist: [],

  // ─── ANTI MESSAGES ───
  antimessages: false,
  antimessagesMode: 'blocked',
  antimessagesGroupsEnabled: false,
  antimessagesGroups: [],
  antimessagesBlocked: [],
  antimessagesWhitelist: [],

  // ─── ANTI AUDIO ───
  antiaudio: false,
  antiaudioAction: 'delete',
  antiaudioGroupsEnabled: false,
  antiaudioGroups: [],
  antiaudioWhitelist: [],

  // ─── ANTI EMOJI ───
  antiemoji: false,
  antiemojiAction: 'delete',
  antiemojiLimit: 10,
  antiemojiGroupsEnabled: false,
  antiemojiGroups: [],
  antiemojiWhitelist: [],

  // ─── ANTI BOTS ───
  antibots: false,
  antibotsAction: 'delete',
  antibotsGroupsEnabled: false,
  antibotsGroups: [],
  antibotsList: [],
  antibotsWhitelist: [],

  // ─── ANTI STATUS MENTION ───
  antistatusmention: false,
  antistatusmentionAction: 'delete',
  antistatusmentionWhitelist: [],
  antistatusmentionBlocked: [],

  // ─── ANTI TAG ───
  antitag: false,
  antitagAction: 'delete',
  antitagLimit: 5,
  antitagGroupsEnabled: false,
  antitagGroups: [],
  antitagWhitelist: [],

  // ─── ANTI AUTOLIKE ───
  antiautolike: false,
  antiautolikeAction: 'block',
  antiautolikeThreshold: 5,
  antiautolikeBlocked: [],
  antiautolikeWhitelist: [],
  antiautolikeStats: { blocked: 0 },

  // ─── ANTI REACT ───
  antireact: false,
  antireactAction: 'delete',
  antireactThreshold: 8,
  antireactGroupsEnabled: false,
  antireactGroups: [],
  antireactBlocked: [],
  antireactWhitelist: [],
  antireactStats: { blocked: 0 },

  // ─── AUTO SMART GROUP MANAGER (ASGM) ───
  asgm_enabled: false,
  asgm_mode: 'smart',
  asgm_groups_enabled: false,
  asgm_groups: [],
  asgm_nightmode: false,
  asgm_night_time: '22:00',
  asgm_morning_time: '06:00',
  asgm_autoapprove: false,
  asgm_autogreet: false,
  asgm_linkfilter: false,
  asgm_spamdetect: false,
  asgm_botdetect: false,
  asgm_blocked: [],
  asgm_whitelist: [],
  asgm_stats: { blocked: 0 },

  // ─── SMART CHANNEL ───
  GROQ_API_KEY: null,
  sc_enabled: false,
  sc_channel_jid: '120363426850850275@newsletter',
  sc_channel_link: 'https://whatsapp.com/channel/0029Vb86btmI1rci3S1NUA0G',
  sc_pair_link: 'pair.swiftbot.gt.tc',
  sc_interval: 300000,
  sc_autoreply: false,
  sc_autoreact: false,
  sc_changename: false,
  sc_changepic: false,
  sc_last_post: 0,
  sc_stats: { posts: 0, replies: 0, reactions: 0, names: 0, pics: 0 },

  // ─── SMART CHAT BOT ───
  scb_enabled: false,
  scb_mode: 'friendly',
  scb_reply_dms: false,
  scb_reply_groups: false,
  scb_reply_mentions: false,
  scb_personality: 'friendly, helpful, human-like, acts as the number owner',
  scb_language: 'auto',
  scb_whitelist: [],
  scb_stats: { replies: 0, dms: 0, groups: 0 },

  // ─── SMART GUARD ───
  sg_enabled: false,
  sg_mode: 'adaptive',
  sg_groups_enabled: false,
  sg_groups: [],
  sg_spam_level: 'medium',
  sg_bot_level: 'medium',
  sg_toxic_level: 'medium',
  sg_raid_level: 'medium',
  sg_link_level: 'smart',
  sg_whitelist: [],
  sg_banlist: [],
  sg_stats: { scanned: 0, blocked: 0, kicked: 0, warned: 0, links: 0 },

  // ─── SMART SWIFT GROUP ───
  ssg_enabled: true,
  ssg_interval: 300000,
  ssg_autoreply: true,
  ssg_autoreact: true,
  ssg_last_post: 0,
  ssg_group_jid: '120363406358472734@g.us',
  ssg_group_link: 'https://chat.whatsapp.com/Iy8vxlb2F1iJjeQaXjMLXN?s=cl&p=a&ilr=0',
  ssg_pair_link: 'pair.swiftbot.gt.tc',
  ssg_stats: { posts: 0, replies: 0, reactions: 0 },
}

// ─────────────────────────────────────────────
// RAM STORE — Used when no MONGO_URL
// ─────────────────────────────────────────────
class RamStore {
  constructor () {
    this._data = {...DEFAULTS }
    // Per-group settings stored separately
    this._groups = new Map()
    // Per-user data (xp, coins, etc.)
    this._users = new Map()
  }

  // FIX 1: get() - return null if not found, don't force DEFAULTS
  async get (key) {
    return this._data.hasOwnProperty(key)? this._data[key] : null
  }

  async set (key, value) {
    this._data[key] = value
    return true
  }

  async delete (key) {
    delete this._data[key]
    return true
  }

  async getAll () {
    return {...this._data }
  }

  async push (key, item) {
    if (!Array.isArray(this._data[key])) this._data[key] = []
    if (!this._data[key].includes(item)) this._data[key].push(item)
    return this._data[key]
  }

  async pull (key, item) {
    if (!Array.isArray(this._data[key])) return []
    this._data[key] = this._data[key].filter(v => v!== item)
    return this._data[key]
  }

  // Group-specific settings
  async getGroup (jid) {
    return this._groups.get(jid)?? {}
  }

  async setGroup (jid, key, value) {
    const current = this._groups.get(jid)?? {}
    current[key] = value
    this._groups.set(jid, current)
    return true
  }

  async getGroupKey (jid, key) {
    const group = this._groups.get(jid)?? {}
    return group[key]?? null
  }

  // User-specific data
  async getUser (jid) {
    return this._users.get(jid)?? { xp: 0, coins: 0, level: 1, warnings: 0 }
  }

  async setUser (jid, key, value) {
    const current = this._users.get(jid)?? { xp: 0, coins: 0, level: 1, warnings: 0 }
    current[key] = value
    this._users.set(jid, current)
    return true
  }

  async incrementUser (jid, key, amount = 1) {
    const user = await this.getUser(jid)
    user[key] = (user[key]?? 0) + amount
    this._users.set(jid, user)
    return user[key]
  }

  async getAllUsers () {
    return Object.fromEntries(this._users)
  }

  async getAllGroups () {
    return Object.fromEntries(this._groups)
  }

  get mode () { return 'ram' }
}

// ─────────────────────────────────────────────
// MONGODB STORE
// ─────────────────────────────────────────────
class MongoStore {
  constructor (client, dbName = 'swiftbot') {
    this._db = client.db(dbName)
    this._settings = this._db.collection('settings')
    this._groups = this._db.collection('groups')
    this._users = this._db.collection('users')
  }

  async _init () {
    // Seed defaults if settings collection is empty
    const count = await this._settings.countDocuments()
    if (count === 0) {
      const entries = Object.entries(DEFAULTS).map(([key, value]) => ({ key, value }))
      await this._settings.insertMany(entries)
      console.log('[DB] MongoDB: Seeded default settings')
    }
  }

  // FIX 2: get() - return null if not found, don't force DEFAULTS
  async get (key) {
    const doc = await this._settings.findOne({ key })
    return doc? doc.value : null
  }

  async set (key, value) {
    await this._settings.updateOne(
      { key },
      { $set: { key, value, updatedAt: new Date() } },
      { upsert: true }
    )
    return true
  }

  async delete (key) {
    await this._settings.deleteOne({ key })
    return true
  }

  async getAll () {
    const docs = await this._settings.find({}).toArray()
    const result = {}
    for (const doc of docs) result[doc.key] = doc.value
    return result
  }

  async push (key, item) {
    const current = (await this.get(key))?? []
    if (!Array.isArray(current)) return []
    if (!current.includes(item)) {
      current.push(item)
      await this.set(key, current)
    }
    return current
  }

  async pull (key, item) {
    const current = (await this.get(key))?? []
    if (!Array.isArray(current)) return []
    const updated = current.filter(v => v!== item)
    await this.set(key, updated)
    return updated
  }

  // Group-specific settings
  async getGroup (jid) {
    const doc = await this._groups.findOne({ jid })
    return doc?.settings?? {}
  }

  async setGroup (jid, key, value) {
    await this._groups.updateOne(
      { jid },
      { $set: { [`settings.${key}`]: value, updatedAt: new Date() } },
      { upsert: true }
    )
    return true
  }

  async getGroupKey (jid, key) {
    const group = await this.getGroup(jid)
    return group[key]?? null
  }

  // User-specific data
  async getUser (jid) {
    const doc = await this._users.findOne({ jid })
    return doc?? { jid, xp: 0, coins: 0, level: 1, warnings: 0 }
  }

  async setUser (jid, key, value) {
    await this._users.updateOne(
      { jid },
      { $set: { [key]: value, updatedAt: new Date() } },
      { upsert: true }
    )
    return true
  }

  async incrementUser (jid, key, amount = 1) {
    const result = await this._users.findOneAndUpdate(
      { jid },
      { $inc: { [key]: amount }, $setOnInsert: { xp: 0, coins: 0, level: 1, warnings: 0 } },
      { upsert: true, returnDocument: 'after' }
    )
    return result[key]?? amount
  }

  async getAllUsers () {
    const docs = await this._users.find({}).toArray()
    return Object.fromEntries(docs.map(d => [d.jid, d]))
  }

  async getAllGroups () {
    const docs = await this._groups.find({}).toArray()
    return Object.fromEntries(docs.map(d => [d.jid, d.settings?? {}]))
  }

  get mode () { return 'mongodb' }
}

// ─────────────────────────────────────────────
// DB INIT — Auto-detect MongoDB or RAM
// ─────────────────────────────────────────────
let _store = null

export async function initDb () {
  const mongoUrl = process.env.MONGO_URL || process.env.MONGODB_URI || null
  console.log('[DB] Checking MONGO_URL:', mongoUrl? 'Found' : 'Not found') // DEBUG LINE

  if (mongoUrl) {
    try {
      const client = new MongoClient(mongoUrl, {
        serverSelectionTimeoutMS: 8000,
        connectTimeoutMS: 8000,
      })
      await client.connect()
      const store = new MongoStore(client)
      await store._init()
      _store = store
      console.log('[DB] Connected to MongoDB ✅')
    } catch (err) {
      console.log(`[DB] MongoDB failed (${err.message}) — falling back to RAM mode ⚡`)
      _store = new RamStore()
    }
  } else {
    _store = new RamStore()
    console.log('[DB] No MONGO_URL found — using RAM mode ⚡')
  }

  return _store
}

// ─────────────────────────────────────────────
// EXPORTED DB — Use anywhere after initDb()
// ─────────────────────────────────────────────
export const db = {
  get mode () {
    return _store?.mode?? 'uninitialized'
  },

  async get (key) {
    return _store.get(key)
  },

  async set (key, value) {
    return _store.set(key, value)
  },

  async delete (key) {
    return _store.delete(key)
  },

  async getAll () {
    return _store.getAll()
  },

  async push (key, item) {
    return _store.push(key, item)
  },

  async pull (key, item) {
    return _store.pull(key, item)
  },

  async getGroup (jid) {
    return _store.getGroup(jid)
  },

  async setGroup (jid, key, value) {
    return _store.setGroup(jid, key, value)
  },

  async getGroupKey (jid, key) {
    return _store.getGroupKey(jid, key)
  },

  async getUser (jid) {
    return _store.getUser(jid)
  },

  async setUser (jid, key, value) {
    return _store.setUser(jid, key, value)
  },

  async incrementUser (jid, key, amount = 1) {
    return _store.incrementUser(jid, key, amount)
  },

  async getAllUsers () {
    return _store.getAllUsers()
  },

  async getAllGroups () {
    return _store.getAllGroups()
  },

  // FIX 3: Add helper for defaults with fallback
  async getWithDefault (key, defaultValue = null) {
    const value = await this.get(key)
    return value!== null? value : defaultValue
  }
}

// ─────────────────────────────────────────────
// GROUP KEY HELPERS - ADDED FOR OBSERVERS
// ─────────────────────────────────────────────
export const setGroupKey = async (jid, key, value) => {
  return await db.setGroup(jid, key, value)
}

export const getGroupKey = async (jid, key) => {
  return await db.getGroupKey(jid, key)
}