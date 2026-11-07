import type { KeycapConfig } from '@/model/config'
import { PROFILE_SHAPES } from '@/geometry/profiles'
import type { KeyPosition } from './layouts'

const same = (a: number, b: number) => Math.abs(a - b) < 1e-6

/** Positions where a keycap of this width fits (only regular, 1u-deep keys). */
export function fittingKeys(keys: KeyPosition[], widthU: number) {
  return keys.filter((k) => k.h === 1 && same(k.w, widthU))
}

/** Where a design goes first: J for 1u, the usual key for each long width. */
const PREFERRED = ['KeyJ', 'ControlLeft', 'Tab', 'CapsLock', 'Backspace', 'Enter', 'ShiftRight', 'Space', 'ShiftLeft']

/** The position to show the design on: the chosen one if it still fits, otherwise a sensible default; null if no position fits. */
export function placeDesign(keys: KeyPosition[], widthU: number, chosen: string | null): KeyPosition | null {
  const fits = fittingKeys(keys, widthU)
  if (fits.length === 0) return null
  const pick = (code: string | null) => fits.find((k) => k.code === code)
  return pick(chosen) ?? PREFERRED.map(pick).find(Boolean) ?? fits[0]
}

/** True when the profile's rows differ (OEM, Cherry, SA, MT3); DSA and XDA are the same on every row. */
export function isSculpted(profile: KeycapConfig['size']['profile']) {
  const rows = Object.values(PROFILE_SHAPES[profile].rows)
  return rows.some((r) => r.height !== rows[0].height || r.tilt !== rows[0].tilt)
}

/** The row the position wants, when it differs from the design's row on a sculpted profile. */
export function rowMismatch(config: KeycapConfig, key: KeyPosition) {
  return isSculpted(config.size.profile) && config.size.row !== key.row ? key.row : null
}
