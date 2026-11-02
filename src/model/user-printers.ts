import { useSyncExternalStore } from 'react'
import { loadUserPresets, saveUserPresets, type PrinterPreset } from './printers'

// Shared store so the print panel and the settings page see the same list
let presets: PrinterPreset[] = loadUserPresets()
const listeners = new Set<() => void>()

function set(next: PrinterPreset[]) {
  presets = next
  saveUserPresets(next)
  for (const l of listeners) l()
}

export const userPrinters = {
  add: (preset: PrinterPreset) => set([...presets, preset]),
  remove: (id: string) => set(presets.filter((p) => p.id !== id)),
  clear: () => set([]),
}

export function useUserPrinters(): PrinterPreset[] {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => presets,
  )
}
