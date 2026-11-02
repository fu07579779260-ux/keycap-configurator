import type { KeycapConfig } from '@/model/config'
import type { StemType } from '@/model/options'

/**
 * Socket shapes on the underside of the keycap, in mm. The fit tolerance is
 * added on top of the slot sizes (positive = looser).
 *
 * MX, Choc V2 and the stabiliser stems use the standard MX cross. Choc V1,
 * Alps and Topre values are approximations and should be checked with a
 * test print on the real switch (build step 22).
 */
export type StemShape =
  | {
      kind: 'cross'
      /** Outer diameter of the round stem. */
      outer: number
      /** Arm length of the cross (both arms). */
      length: number
      /** Width of the horizontal arm (along x) and the vertical arm (along y). */
      widthH: number
      widthV: number
      depth: number
    }
  | {
      kind: 'slots'
      /** Outer block (x, y) around the slots. */
      block: [number, number]
      /** Each slot (x, y) and the x positions of the slot centres. */
      slot: [number, number]
      centres: number[]
      depth: number
    }

export const MX_CROSS: StemShape = { kind: 'cross', outer: 5.5, length: 4.1, widthH: 1.31, widthV: 1.17, depth: 3.8 }

const PRESETS: Record<Exclude<StemType, 'custom' | 'upload'>, StemShape> = {
  mx: MX_CROSS,
  'choc-v2': { ...MX_CROSS, depth: 3.0 },
  // Two rectangular legs 5.7 mm apart
  'choc-v1': { kind: 'slots', block: [9.6, 4.6], slot: [1.3, 3.1], centres: [-2.85, 2.85], depth: 3.0 },
  // One rectangular slider
  alps: { kind: 'slots', block: [6.8, 4.6], slot: [4.6, 2.3], centres: [0], depth: 3.5 },
  // Topre slider with an MX-like cross mount (approximate)
  topre: { kind: 'cross', outer: 6.4, length: 4.4, widthH: 1.5, widthV: 1.5, depth: 3.5 },
}

/** Stem used for the main switch. Uploaded bases are handled in build step 18; until then they use MX. */
export function mainStemShape(config: KeycapConfig): StemShape {
  const { stem } = config
  if (stem.type === 'custom') {
    return {
      kind: 'cross',
      outer: stem.outerDiameter,
      length: stem.crossLength,
      widthH: stem.crossWidthH,
      widthV: stem.crossWidthV,
      depth: stem.socketDepth,
    }
  }
  return stem.type === 'upload' ? MX_CROSS : PRESETS[stem.type]
}

/** Stabilisers: Choc V1 boards use Choc stabilisers, everything else Cherry-style MX stems. */
export function stabiliserStemShape(config: KeycapConfig): StemShape {
  return config.stem.type === 'choc-v1' ? PRESETS['choc-v1'] : MX_CROSS
}

/** Stems start this far above the bottom edge so they don't touch the switch housing. */
export const STEM_INSET = 0.5
