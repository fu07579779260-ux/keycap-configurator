import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from '@/persistence/storage'

/** Display preferences (Settings page). */
export interface Display {
  largeText: boolean
  highContrast: boolean
}

const KEY = 'display'

const prefers = (query: string) => {
  try {
    return window.matchMedia(query).matches
  } catch {
    return false
  }
}

function load(): Display {
  const saved = readJson<Partial<Display>>(KEY)
  return {
    largeText: saved?.largeText === true,
    // First visit: follow the system's "increase contrast" setting
    highContrast: typeof saved?.highContrast === 'boolean' ? saved.highContrast : prefers('(prefers-contrast: more)'),
  }
}

let current = load()
const listeners = new Set<() => void>()

/** Reflect the preferences on <html> so the CSS themes apply. */
export function applyDisplay(display: Display = current) {
  const root = document.documentElement
  if (display.largeText) root.dataset.text = 'large'
  else delete root.dataset.text
  if (display.highContrast) root.dataset.contrast = 'high'
  else delete root.dataset.contrast
}

export const displayStore = {
  set(patch: Partial<Display>) {
    current = { ...current, ...patch }
    writeJson(KEY, current)
    applyDisplay()
    for (const l of listeners) l()
  },
  get: () => current,
}

export function useDisplay(): Display {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => current,
  )
}

/** The system asks for less motion (used to turn off camera damping in the 3D views). */
export const prefersReducedMotion = () => prefers('(prefers-reduced-motion: reduce)')
