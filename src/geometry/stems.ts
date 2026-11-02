import type { KeycapConfig } from '@/model/config'
import { KEY_PITCH } from './dimensions'

/**
 * Centre-to-centre distance between the two stabiliser stems, in mm, or
 * null when the key is too short to need stabilisers (< 2u).
 *
 * Standard Cherry-style spacings: 2–2.75u 23.8, 3u 38.1, 6u 95.25,
 * 6.25u 100, 7u 114.3. Long keys follow (width − 1u) × pitch, which gives
 * exactly those values. Other widths (3.25–5.75u) are not standard; they use
 * the 3u spacing and should be checked against the keyboard.
 */
export function stabiliserSpacing(widthU: number): number | null {
  if (widthU < 2) return null
  if (widthU < 3) return 23.8
  if (widthU < 6) return 38.1
  if (widthU === 6.25) return 100
  return Number(((widthU - 1) * KEY_PITCH).toFixed(2))
}

export const isStandardStabiliserWidth = (widthU: number) => widthU < 3.25 || widthU >= 6

/** Stem centres on the base plane (x, y) in mm. */
export function stemLayout(config: KeycapConfig) {
  const spacing = config.size.stabilisers ? stabiliserSpacing(config.size.widthU) : null
  return {
    main: [0, 0] as [number, number],
    stabilisers: spacing === null ? [] : ([[-spacing / 2, 0], [spacing / 2, 0]] as [number, number][]),
    spacing,
  }
}
