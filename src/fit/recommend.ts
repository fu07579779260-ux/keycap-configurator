import { PROFILE_SHAPES } from '@/geometry/profiles'
import type { StringKey } from '@/i18n/strings'
import type { KeycapConfig } from '@/model/config'
import type { Profile } from '@/model/options'
import { clampToRange } from '@/model/sanitize'
import { RANGES } from '@/model/config'

/** Fingertip widths the measurement accepts (PLAN.md §4.6). */
export const FINGER_RANGE = { min: 12, max: 24 }

export interface Recommendation {
  profile: Profile
  dishDepth: number
  /** Each line: a translated reason with its numbers. */
  reasons: { key: StringKey; values: Record<string, string> }[]
}

/**
 * Suggest a keycap shape for a fingertip width (mm).
 *
 * The idea: the dished top should be a little narrower than the
 * fingertip so it cradles it, and narrow fingertips settle better into a
 * deeper dish. Cherry's top is the narrowest (≈11.7 mm, cylindrical
 * dish), DSA is in between (≈12.7 mm, spherical), XDA the widest (≈14 mm).
 */
export function recommend(fingerWidth: number): Recommendation {
  const w = Math.min(FINGER_RANGE.max, Math.max(FINGER_RANGE.min, fingerWidth))
  const profile: Profile = w < 15 ? 'cherry' : w < 18 ? 'dsa' : 'xda'
  const topWidth = 18 - PROFILE_SHAPES[profile].topInsetX
  const dishDepth = clampToRange(Math.min(1.4, Math.max(0.5, 1.6 - (w - 13) * 0.1)), RANGES.top.dishDepth)

  return {
    profile,
    dishDepth,
    reasons: [
      {
        key: `fit.reason.${profile}`,
        values: { width: w.toFixed(1), top: topWidth.toFixed(1) },
      },
      { key: 'fit.reason.depth', values: { depth: dishDepth.toFixed(2) } },
      { key: 'fit.reason.height', values: { height: PROFILE_SHAPES[profile].rows.R3.height.toFixed(1) } },
    ],
  }
}

/** The design with the recommendation applied (concave top, profile height, everything else kept). */
export function applyRecommendation(config: KeycapConfig, rec: Recommendation): KeycapConfig {
  return {
    ...config,
    size: { ...config.size, profile: rec.profile, row: 'R3', heightOverride: null },
    top: { ...config.top, form: 'concave', dishShape: 'auto', dishDepth: rec.dishDepth },
  }
}
