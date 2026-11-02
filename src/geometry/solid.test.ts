import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import { STEM_TYPES } from '@/model/options'
import { sanitizeConfig } from '@/model/sanitize'
import { bodyParams, buildBody, type MeshData } from './body'
import { meshSize, meshVolume } from './dimensions'
import { buildKeycap } from './solid'
import { STEM_INSET } from './stem-shapes'

let wasm: ManifoldToplevel

beforeAll(async () => {
  // In Node the module finds manifold.wasm next to manifold.js
  wasm = await Module()
  wasm.setup()
})

const design = (patch: { [S in keyof KeycapConfig]?: Partial<KeycapConfig[S]> } = {}) =>
  sanitizeConfig({
    stem: { ...DEFAULT_CONFIG.stem, ...patch.stem },
    size: { ...DEFAULT_CONFIG.size, ...patch.size },
    top: { ...DEFAULT_CONFIG.top, ...patch.top },
    legend: DEFAULT_CONFIG.legend,
    manufacturing: DEFAULT_CONFIG.manufacturing,
  })

const volume = (m: MeshData) => meshVolume(m.positions, m.indices)

/** Is there solid material along a vertical line at (x, y), between z0 and z1? Casts a ray upward. */
function hitsBetween({ positions: p, indices: t }: MeshData, x: number, y: number, z0: number, z1: number) {
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [t[i] * 3, t[i + 1] * 3, t[i + 2] * 3]
    // Barycentric test of (x, y) in the triangle's xy projection
    const d = (p[b + 1] - p[c + 1]) * (p[a] - p[c]) + (p[c] - p[b]) * (p[a + 1] - p[c + 1])
    if (Math.abs(d) < 1e-12) continue
    const l1 = ((p[b + 1] - p[c + 1]) * (x - p[c]) + (p[c] - p[b]) * (y - p[c + 1])) / d
    const l2 = ((p[c + 1] - p[a + 1]) * (x - p[c]) + (p[a] - p[c]) * (y - p[c + 1])) / d
    const l3 = 1 - l1 - l2
    if (l1 < 0 || l2 < 0 || l3 < 0) continue
    const z = l1 * p[a + 2] + l2 * p[b + 2] + l3 * p[c + 2]
    if (z > z0 && z < z1) return true
  }
  return false
}

describe('buildKeycap', () => {
  it('keeps the outer size of the solid body', () => {
    const config = design()
    const shell = meshSize(buildKeycap(wasm, config).positions)
    const solid = meshSize(buildBody(bodyParams(config)).positions)
    expect(shell.width).toBeCloseTo(solid.width, 3)
    expect(shell.depth).toBeCloseTo(solid.depth, 3)
    expect(shell.height).toBeCloseTo(solid.height, 3)
  })

  it('is hollow: much less material than the solid body', () => {
    const config = design()
    const solid = volume(buildBody(bodyParams(config)))
    const shell = volume(buildKeycap(wasm, config))
    expect(shell).toBeGreaterThan(0)
    expect(shell).toBeLessThan(solid * 0.6)
  })

  it('uses more material for thicker walls', () => {
    const thin = volume(buildKeycap(wasm, design({ size: { wallThickness: 1 } })))
    const thick = volume(buildKeycap(wasm, design({ size: { wallThickness: 2 } })))
    expect(thick).toBeGreaterThan(thin)
  })

  it('cuts an MX cross into the stem: open in the arms, solid between them', () => {
    const mesh = buildKeycap(wasm, design({ stem: { type: 'mx' } }))
    const z0 = STEM_INSET + 0.2
    const z1 = STEM_INSET + 3.5
    // Inside an arm of the cross: no surface between the socket floor and the opening
    expect(hitsBetween(mesh, 1.5, 0, z0, z1)).toBe(false)
    // Diagonal between the arms: solid post wall, so the socket wall surfaces are crossed
    expect(hitsBetween(mesh, 1.4, 1.4, 0, z1)).toBe(true)
  })

  it('makes a looser socket for a larger tolerance', () => {
    const tight = volume(buildKeycap(wasm, design({ stem: { fitTolerance: 0 } })))
    const loose = volume(buildKeycap(wasm, design({ stem: { fitTolerance: 0.3 } })))
    expect(loose).toBeLessThan(tight)
  })

  it('adds stabiliser stems on a 2u key', () => {
    const without = volume(buildKeycap(wasm, design({ size: { widthU: 2, stabilisers: false } })))
    const withStabs = volume(buildKeycap(wasm, design({ size: { widthU: 2, stabilisers: true } })))
    expect(withStabs).toBeGreaterThan(without + 10)
  })

  it('produces a valid solid for every stem type', () => {
    for (const type of STEM_TYPES) {
      const mesh = buildKeycap(wasm, design({ stem: { type }, size: { widthU: 2 } }))
      expect(volume(mesh), type).toBeGreaterThan(50)
      expect(mesh.positions.every(Number.isFinite), type).toBe(true)
    }
  })

  it('cuts both Choc V1 slots at the main stem and at each stabiliser', () => {
    const mesh = buildKeycap(wasm, design({ stem: { type: 'choc-v1' }, size: { widthU: 2 } }))
    const half = 23.8 / 2
    for (const centre of [-half, 0, half]) {
      for (const slot of [-2.85, 2.85]) {
        expect(hitsBetween(mesh, centre + slot, 0, STEM_INSET + 0.2, STEM_INSET + 2.8), `slot at ${centre + slot}`).toBe(false)
      }
      // Between the two slots the block is solid
      expect(hitsBetween(mesh, centre, 0, 0, STEM_INSET + 2.8), `block at ${centre}`).toBe(true)
    }
  })

  it('uses the custom cross dimensions', () => {
    const narrow = volume(buildKeycap(wasm, design({ stem: { type: 'custom', crossLength: 3.8 } })))
    const wide = volume(buildKeycap(wasm, design({ stem: { type: 'custom', crossLength: 4.4 } })))
    expect(wide).toBeLessThan(narrow)
  })

  it('stays valid for a thick wall on a low key', () => {
    const mesh = buildKeycap(wasm, design({ size: { profile: 'dsa', wallThickness: 2.5, heightOverride: 4 } }))
    expect(volume(mesh)).toBeGreaterThan(0)
  })
})
