/**
 * SwiftBot - system/loader.js
 * Auto-loads all plugins from plugins/commands and plugins/observers
 * Zero hardcode — scans folders dynamically
 * Hot-reload support — no restart needed for new plugins
 */

import { readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { logger } from './logger.js'
import { db } from './db.js'
import { setCommands, setObservers } from './router.js' // FIX: Import setters

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─────────────────────────────────────────────
// GLOBAL STORAGE
// ─────────────────────────────────────────────
export const commands = new Map()
export const observers = new Map()
export const categories = new Map()

// Command aliases map: alias -> actual command name
export const aliases = new Map()

// ─────────────────────────────────────────────
// PLUGIN PATHS
// ─────────────────────────────────────────────
const PLUGINS_DIR = join(__dirname, '..', 'plugins')
const COMMANDS_DIR = join(PLUGINS_DIR, 'commands')
const OBSERVERS_DIR = join(PLUGINS_DIR, 'observers')

// ─────────────────────────────────────────────
// SCAN FOLDER RECURSIVELY
// ─────────────────────────────────────────────
function scanFolder(dir, ext = '.js') {
  const files = []

  try {
    const items = readdirSync(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = join(dir, item.name)

      if (item.isDirectory()) {
        // Recursive scan subfolders
        files.push(...scanFolder(fullPath, ext))
      } else if (item.isFile() && item.name.endsWith(ext)) {
        files.push(fullPath)
      }
    }
  } catch (e) {
    logger.warn('LOADER', `Failed to scan ${dir}`, e.message)
  }

  return files
}

// ─────────────────────────────────────────────
// VALIDATE COMMAND STRUCTURE
// ─────────────────────────────────────────────
function validateCommand(cmd, filePath) {
  if (!cmd || typeof cmd!== 'object') {
    logger.error('LOADER', `Invalid command export: ${filePath}`)
    return false
  }

  if (!cmd.name || typeof cmd.name!== 'string') {
    logger.error('LOADER', `Command missing name: ${filePath}`)
    return false
  }

  if (!cmd.execute || typeof cmd.execute!== 'function') {
    logger.error('LOADER', `Command missing execute(): ${filePath}`)
    return false
  }

  return true
}

// ─────────────────────────────────────────────
// VALIDATE OBSERVER STRUCTURE
// ─────────────────────────────────────────────
function validateObserver(obs, filePath) {
  if (!obs || typeof obs!== 'object') {
    logger.error('LOADER', `Invalid observer export: ${filePath}`)
    return false
  }

  if (!obs.name || typeof obs.name!== 'string') {
    logger.error('LOADER', `Observer missing name: ${filePath}`)
    return false
  }

  if (!obs.execute || typeof obs.execute!== 'function') {
    logger.error('LOADER', `Observer missing execute(): ${filePath}`)
    return false
  }

  return true
}

// ─────────────────────────────────────────────
// LOAD COMMANDS
// ─────────────────────────────────────────────
async function loadCommands() {
  commands.clear()
  aliases.clear()
  categories.clear()

  const files = scanFolder(COMMANDS_DIR)
  logger.info('LOADER', `Found ${files.length} command files`)

  for (const file of files) {
    try {
      // Convert to file:// URL for ESM import
      const fileUrl = pathToFileURL(file).href

      // Add timestamp to bypass import cache for hot-reload
      const cacheBuster = `${fileUrl}?t=${Date.now()}`
      const module = await import(cacheBuster)
      let cmd = module.default || module

      // NEW: Dynamic name/alias support
      if (cmd.init && typeof cmd.init === 'function') {
        const dynamic = await cmd.init({ db, categories })
        cmd = {...cmd,...dynamic }
      }

      if (!validateCommand(cmd, file)) continue

      // Get category from folder name
      const relativePath = file.replace(COMMANDS_DIR, '').replace(/^[\/\\]/, '')
      const parts = relativePath.split(/[\/\\]/)
      const category = parts.length > 1? parts[0] : 'misc'

      // Attach metadata
      cmd.category = cmd.category || category
      cmd.file = file
      cmd.path = relativePath

      // Register command
      commands.set(cmd.name.toLowerCase(), cmd)

      // Register aliases
      if (Array.isArray(cmd.alias)) {
        cmd.alias.forEach(a => aliases.set(a.toLowerCase(), cmd.name.toLowerCase()))
      }

      // Track categories
      if (!categories.has(cmd.category)) {
        categories.set(cmd.category, {
          name: cmd.category,
          desc: `${cmd.category} commands`,
          commands: []
        })
      }
      categories.get(cmd.category).commands.push({
        name: cmd.name,
        desc: cmd.desc || '',
        usage: cmd.usage || '',
        aliases: cmd.alias || []
      })

      logger.pluginLoaded(cmd.name, 'COMMAND', 1)

    } catch (e) {
      logger.error('LOADER', `Failed to load command: ${file}`, e.message)
    }
  }

  logger.success('LOADER', `Loaded ${commands.size} commands in ${categories.size} categories`)
}

// ─────────────────────────────────────────────
// LOAD OBSERVERS
// ─────────────────────────────────────────────
async function loadObservers() {
  observers.clear()

  const files = scanFolder(OBSERVERS_DIR)
  logger.info('LOADER', `Found ${files.length} observer files`)

  for (const file of files) {
    try {
      const fileUrl = pathToFileURL(file).href
      const cacheBuster = `${fileUrl}?t=${Date.now()}`
      const module = await import(cacheBuster)
      const obs = module.default || module

      if (!validateObserver(obs, file)) continue

      // Get category from folder name
      const relativePath = file.replace(OBSERVERS_DIR, '').replace(/^[\/\\]/, '')
      const parts = relativePath.split(/[\/\\]/)
      const category = parts.length > 1? parts[0] : 'misc'

      obs.category = obs.category || category
      obs.file = file
      obs.path = relativePath

      // Check if observer is enabled in db
      const enabled = await db.get(`observer_${obs.name}_enabled`)
      obs.enabled = enabled!== false // default true

      observers.set(obs.name.toLowerCase(), obs)
      logger.pluginLoaded(obs.name, 'OBSERVER', 1)

    } catch (e) {
      logger.error('LOADER', `Failed to load observer: ${file}`, e.message)
    }
  }

  logger.success('LOADER', `Loaded ${observers.size} observers`)
}

// ─────────────────────────────────────────────
// HOT RELOAD SINGLE FILE
// ─────────────────────────────────────────────
export async function reloadPlugin(filePath) {
  try {
    const fileUrl = pathToFileURL(filePath).href
    const cacheBuster = `${fileUrl}?t=${Date.now()}`
    const module = await import(cacheBuster)
    const plugin = module.default || module

    if (filePath.includes('commands')) {
      if (!validateCommand(plugin, filePath)) return false

      commands.set(plugin.name.toLowerCase(), plugin)
      setCommands(commands) // FIX: Update router
      logger.success('LOADER', `Hot-reloaded command: ${plugin.name}`)
      return true
    }

    if (filePath.includes('observers')) {
      if (!validateObserver(plugin, filePath)) return false

      observers.set(plugin.name.toLowerCase(), plugin)
      setObservers(observers) // FIX: Update router
      logger.success('LOADER', `Hot-reloaded observer: ${plugin.name}`)
      return true
    }

    return false
  } catch (e) {
    logger.error('LOADER', `Hot-reload failed: ${filePath}`, e.message)
    return false
  }
}

// ─────────────────────────────────────────────
// RELOAD ALL PLUGINS
// ─────────────────────────────────────────────
export async function reloadAll() {
  logger.info('LOADER', 'Reloading all plugins...')
  await loadCommands()
  await loadObservers()

  // FIX: Update router after reload
  setCommands(commands)
  setObservers(observers)

  logger.success('LOADER', 'All plugins reloaded')
  return {
    commands: commands.size,
    observers: observers.size,
    categories: categories.size
  }
}

// ─────────────────────────────────────────────
// GET COMMAND BY NAME OR ALIAS
// ─────────────────────────────────────────────
export function getCommand(name) {
  const key = name.toLowerCase()
  return commands.get(key) || commands.get(aliases.get(key))
}

// ─────────────────────────────────────────────
// CHECK IF COMMAND EXISTS
// ─────────────────────────────────────────────
export function hasCommand(name) {
  const key = name.toLowerCase()
  return commands.has(key) || aliases.has(key)
}

// ─────────────────────────────────────────────
// GET ALL COMMANDS IN CATEGORY
// ─────────────────────────────────────────────
export function getCategoryCommands(category) {
  return categories.get(category)?.commands || []
}

// ─────────────────────────────────────────────
// GET ALL CATEGORIES
// ─────────────────────────────────────────────
export function getAllCategories() {
  return Array.from(categories.values())
}

// ─────────────────────────────────────────────
// INIT LOADER — Call on startup
// ─────────────────────────────────────────────
export async function initLoader() {
  logger.info('LOADER', 'Initializing plugin loader...')
  await loadCommands()
  await loadObservers()

  // FIX: CRITICAL - Register with router
  setCommands(commands)
  setObservers(observers)

  logger.success('LOADER', 'Plugin loader ready')
  return {
    commands: commands.size,
    observers: observers.size,
    categories: Array.from(categories.keys())
  }
}