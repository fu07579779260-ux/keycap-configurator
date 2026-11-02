import type { KeycapConfig } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'
import { decodeShareParam, readShareParam } from '@/model/serialize'
import { readJson, writeJson } from './storage'

const KEY = 'design'

/** The design from the last visit, or null on a first visit. */
export function loadSession(): KeycapConfig | null {
  const saved = readJson<unknown>(KEY)
  return saved === null ? null : sanitizeConfig(saved)
}

let autosave = true

export function saveSession(config: KeycapConfig) {
  if (autosave) writeJson(KEY, config)
}

/** Used by "Clear all local data", so a pending autosave can't write the design back. */
export function stopAutosave() {
  autosave = false
}

/** A design carried in the address (…#/configure?c=…), or null. */
export function designFromHash(hash: string): KeycapConfig | null {
  const param = readShareParam(hash)
  return param ? decodeShareParam(param) : null
}

/** Drop the ?c=… part once it's been opened, so a reload doesn't undo later edits. */
export function stripShareParam() {
  const [route] = window.location.hash.split('?')
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}${route}`)
}
