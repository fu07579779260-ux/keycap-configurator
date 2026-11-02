import { useSyncExternalStore } from 'react'
import type { MeshData } from '@/geometry/body'

/**
 * The uploaded base model, kept in memory only: it can be several MB and
 * doesn't travel in share links. After a reload the design still says
 * "upload", and the panel asks for the file again.
 */
export interface UploadedBase {
  name: string
  /** As read from the file, in mm (not yet placed). */
  mesh: MeshData
  triangles: number
}

let current: UploadedBase | null = null
const listeners = new Set<() => void>()

export const uploadStore = {
  set(next: UploadedBase | null) {
    current = next
    for (const l of listeners) l()
  },
  get: () => current,
}

export function useUploadedBase(): UploadedBase | null {
  return useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => current,
  )
}
