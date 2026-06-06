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