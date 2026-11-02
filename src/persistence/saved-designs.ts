import { useSyncExternalStore } from 'react'
import type { KeycapConfig } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'
import { readJson, writeJson } from './storage'

/** A design the user saved under a name, in this browser. */
export interface SavedDesign {
  id: string
  name: string
  savedAt: string
  config: KeycapConfig
}

const KEY = 'saved'
export const MAX_SAVED = 50

function load(): SavedDesign[] {
  const data = readJson<unknown>(KEY)
  if (!Array.isArray(data)) return []
  return data
    .filter((d): d is SavedDesign => typeof d?.id === 'string' && typeof d.name === 'string' && typeof d.savedAt === 'string')
    .map((d) => ({ ...d, config: sanitizeConfig(d.config) }))
}

let designs = load()
const listeners = new Set<() => void>()

function set(next: SavedDesign[]) {
  designs = next
  writeJson(KEY, next)
  for (const l of listeners) l()
}

export const savedDesigns = {
  /** Save a copy under a name (newest first). Returns false when the list is full. */
  add(name: string, config: KeycapConfig, now = new Date()): boolean {
    if (designs.length >= MAX_SAVED) return false
    const design: SavedDesign = {
      id: `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim().slice(0, 60) || 'Untitled keycap',
      savedAt: now.toISOString(),
      config: structuredClone(config),
    }
    set([design, ...designs])
    return true
  },
  remove: (id: string) => set(designs.filter((d) => d.id !== id)),
  clear: () => set([]),
  get: () => designs,
}

export function useSavedDesigns(): SavedDesign[] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => designs,
  )
}
