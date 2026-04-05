/**
 * i18n/index.js — Merges all per-page translation bundles.
 * Import { t } or { translations } from here, or from the root i18n.js shortcut.
 */
import sidebar   from './sidebar'
import dashboard from './dashboard'
import ai        from './ai'
import update    from './update'
import settings  from './settings'
import help      from './help'
import login     from './login'
import landing   from './landing'

export const translations = {
    ...sidebar,
    ...dashboard,
    ...ai,
    ...update,
    ...settings,
    ...help,
    ...login,
    ...landing,
}

/**
 * t(key, lang) — returns the translated string for the given key and language.
 * @param {string} key  — key from translations above
 * @param {'en'|'vi'} lang
 */
export function t(key, lang = 'vi') {
    const entry = translations[key]
    if (!entry) { console.warn(`[i18n] Missing key: ${key}`); return key }
    return entry[lang] ?? entry['vi'] ?? key
}
