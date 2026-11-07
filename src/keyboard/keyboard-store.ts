import { useSyncExternalStore } from 'react'
import { readJson, writeJson } from '@/persistence/storage'
import { LAYOUTS, type LayoutId } from './layouts'

/** Keyboard page settings: which layout, and which key the design sits on (remembered in this browser). */
export interface KeyboardSettings {
  layout: LayoutId
  /** Physical key code of the chosen position; null = the default for the design's width. */
  position: string | null
}

const KEY = 'keyboard'
const DEFAULTS: KeyboardSettings = { layout: 'tkl', position: null }

function load(): KeyboardSettings {
  const stored = readJson<Partial<KeyboardSettings>>(KEY)
  return {
    layout: stored?.layout && LAYOUTS.includes(stored.layout) ? stored.layout : DEFAULTS.layout,
    position: typeof stored?.position === 'string' ? stored.position : null,
  }
}

let state = load()
const listeners = new Set<() => void>()

export const keyboardStore = {
  get: () => state,
  set(values: Partial<KeyboardSettings>) {
    state = { ...state, ...values }
    writeJson(KEY, state)
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
}

export const useKeyboardSettings = () => useSyncExternalStore(keyboardStore.subscribe, keyboardStore.get)
