import { useSyncExternalStore } from 'react'
import type { KeycapConfig } from './config'
import { TOP_FORMS } from './options'

/** Keycaps on the Compare page, left to right. */
export interface CompareItem {
  id: number
  config: KeycapConfig
}

/** Enough for a row of comparisons without making the scene unreadable. */
export const MAX_COMPARE = 8

let items: CompareItem[] = []
let nextId = 1
const listeners = new Set<() => void>()

function set(next: CompareItem[]) {
  items = next
  for (const l of listeners) l()
}

export const compareList = {
  /** Add a copy of a design; returns false when the list is full. */
  add(config: KeycapConfig): boolean {
    if (items.length >= MAX_COMPARE) return false
    set([...items, { id: nextId++, config: structuredClone(config) }])
    return true
  },
  /** Replace the list with the design in each of the five top forms. */
  fiveForms(config: KeycapConfig) {
    set(TOP_FORMS.map((form) => ({ id: nextId++, config: { ...structuredClone(config), top: { ...config.top, form } } })))
  },
  remove(id: number) {
    set(items.filter((i) => i.id !== id))
  },
  move(id: number, by: -1 | 1) {
    const at = items.findIndex((i) => i.id === id)
    const to = at + by
    if (at < 0 || to < 0 || to >= items.length) return
    const next = [...items]
    ;[next[at], next[to]] = [next[to], next[at]]
    set(next)
  },
  clear() {
    set([])
  },
  get: () => items,
}

export function useCompareList(): CompareItem[] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => items,
  )
}
