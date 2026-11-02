import type { KeycapConfig } from '@/model/config'

/** Key pitch: centre-to-centre distance between neighbouring keys. */
export const KEY_PITCH = 19.05
/** Gap left between neighbouring keycaps at the base. */
export const KEY_GAP = 1.05

/** Base footprint in mm: 1u → 18.00 × 18.00. */
export function footprint(widthU: number) {
  return { width: widthU * KEY_PITCH - KEY_GAP, depth: KEY_PITCH - KEY_GAP }
}

/** Stand-in height until the profile geometry exists (build step 5). */
export const PLACEHOLDER_HEIGHT = 9.4

export function placeholderSize(config: KeycapConfig) {
  return { ...footprint(config.size.widthU), height: config.size.heightOverride ?? PLACEHOLDER_HEIGHT }
}
