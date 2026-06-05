/**
 * SwiftBot - system/translate.js
 * Google Translate wrapper — Auto-translate replies
 * Uses google-translate-api-x (no API key needed)
 * Reads target language from DB real-time
 */

import translate from 'google-translate-api-x'
import { db } from './db.js'
import { logger } from './logger.js'

// ─────────────────────────────────────────────
// LANGUAGE CODES — Supported by Google
// ─────────────────────────────────────────────
export const LANG_CODES = {
  en: 'English',
  sw: 'Swahili',
  fr: 'French',
  es: 'Spanish',
  ar: 'Arabic',
  pt: 'Portuguese',
  hi: 'Hindi',
  de: 'German',
  it: 'Italian',
  ru: 'Russian',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  tr: 'Turkish',
  id: 'Indonesian',
  vi: 'Vietnamese'
}

// ─────────────────────────────────────────────
// AUTO TRANSLATE — Main function
// ─────────────────────────────────────────────
export async function autoTranslate(text, userJid = null) {
  try {
    if (!text || typeof text!== 'string') return text

    // Get target language — per-user or global
    let targetLang = 'en'

    if (userJid) {
      // Check if user has custom language
      const userLang = await db.getUser(userJid)
      targetLang = userLang?.language || await db.get('language') || 'en'
    } else {
      targetLang = await db.get('language') || 'en'
    }

    // Skip if already English or target is English
    if (targetLang === 'en') return text

    // Detect source language first
    const detected = await translate(text, { to: 'en' })
    if (detected.from.language.iso === targetLang) return text

    // Translate to target
    const result = await translate(text, { to: targetLang })
    logger.debug('TRANSLATE', `Translated to ${targetLang}`, {
      from: detected.from.language.iso,
      chars: text.length
    })

    return result.text

  } catch (e) {
    logger.error('TRANSLATE', 'Translation failed', e.message)
    return text // Return original if fails
  }
}

// ─────────────────────────────────────────────
// MANUAL TRANSLATE — For translate command
// ─────────────────────────────────────────────
export async function translateText(text, toLang = 'en', fromLang = 'auto') {
  try {
    if (!text) return { error: 'No text provided' }

    // Validate language code
    if (toLang!== 'auto' &&!LANG_CODES[toLang]) {
      return { error: `Language code '${toLang}' not supported` }
    }

    const result = await translate(text, {
      from: fromLang,
      to: toLang
    })

    return {
      text: result.text,
      from: result.from.language.iso,
      fromName: LANG_CODES[result.from.language.iso] || result.from.language.iso,
      to: toLang,
      toName: LANG_CODES[toLang] || toLang,
      autoCorrected: result.from.text.autoCorrected,
      didYouMean: result.from.text.didYouMean
    }

  } catch (e) {
    logger.error('TRANSLATE', 'Manual translate failed', e.message)
    return { error: e.message }
  }
}

// ─────────────────────────────────────────────
// DETECT LANGUAGE
// ─────────────────────────────────────────────
export async function detectLanguage(text) {
  try {
    if (!text) return null
    const result = await translate(text, { to: 'en' })
    return {
      code: result.from.language.iso,
      name: LANG_CODES[result.from.language.iso] || result.from.language.iso,
      confidence: result.from.language.didYouMean? 0.8 : 1.0
    }
  } catch (e) {
    logger.error('TRANSLATE', 'Detection failed', e.message)
    return null
  }
}

// ─────────────────────────────────────────────
// GET USER LANGUAGE
// ─────────────────────────────────────────────
export async function getUserLang(userJid) {
  const user = await db.getUser(userJid)
  const globalLang = await db.get('language') || 'en'
  const lang = user?.language || globalLang
  return {
    code: lang,
    name: LANG_CODES[lang] || lang
  }
}

// ─────────────────────────────────────────────
// SET USER LANGUAGE
// ─────────────────────────────────────────────
export async function setUserLang(userJid, langCode) {
  if (!LANG_CODES[langCode]) {
    return { success: false, error: 'Invalid language code' }
  }

  await db.setUser(userJid, 'language', langCode)
  logger.success('TRANSLATE', `User ${userJid} language set to ${langCode}`)
  return {
    success: true,
    lang: langCode,
    name: LANG_CODES[langCode]
  }
}

// ─────────────────────────────────────────────
// LIST SUPPORTED LANGUAGES
// ─────────────────────────────────────────────
export function listLanguages() {
  return Object.entries(LANG_CODES).map(([code, name]) => ({
    code,
    name
  }))
}