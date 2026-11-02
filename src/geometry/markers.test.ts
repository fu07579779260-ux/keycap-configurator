import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import { MARKER_TYPES } from '@/model/options'
import { sanitizeConfig } from '@/model/sanitize'
import { bodyParams, topSurfaceZ, type MeshData } from './body'
import { meshSize, meshVolume } from './dimensions'
import { buildMarker } from './markers'
import { buildKeycap } from './solid'

let wasm: ManifoldToplevel

beforeAll(async () => {
  wasm = await Module()
  wasm.setup()
})

const tactile = (top: Partial<KeycapConfig['top']> = {}, size: Partial<KeycapConfig['size']> = {}) =>
  sanitizeConfig({
    ...DEFAULT_CONFIG,
    size: { ...DEFAULT_CONFIG.size, ...size },
    top: { ...DEFAULT_CONFIG.top, form: 'tactile', ...top },
  })

const volume = (m: MeshData) => meshVolume(m.positions, m.indices)

/** Highest z among vertices near (x, y). */
function peakNear({ positions: p }: MeshData, x: number, y: number, radius: number) {
  let z = -Infinity
  for (let i = 0; i < p.length; i += 3) {
    if (Math.hypot(p[i] - x, p[i + 1] - y) <= radius) z = Math.max(z, p[i + 2])
  }
  return z
}

describe('buildMarker', () => {
  it('returns nothing for non-tactile forms', () => {
    const config = sanitizeConfig({ top: { form: 'concave' } })
    expect(buildMarker(wasm.Manifold, bodyParams(config), config.top)).toBeNull()
  })

  it('builds every marker type as a solid', () => {
    for (const markerType of MARKER_TYPES) {
      const config = tactile({ markerType, markerSize: 4 })
      const marker = buildMarker(wasm.Manifold, bodyParams(config), config.top)!
      expect(marker.volume(), markerType).toBeGreaterThan(0.1)
      marker.delete()
    }
  })

  it('makes a ring hollow and a texture of several bumps', () => {
    const config = tactile({ markerType: 'ring', markerSize: 5 })
    const ring = buildMarker(wasm.Manifold, bodyParams(config), config.top)!
    const discConfig = tactile({ markerType: 'ring', markerSize: 1.5 })
    const disc = buildMarker(wasm.Manifold, bodyParams(discConfig), discConfig.top)!
    // A 5 mm ring has less material than a full 5 mm disc would
    expect(ring.volume()).toBeLessThan(Math.PI * 2.5 * 2.5 * 1.5)
    expect(disc.volume()).toBeGreaterThan(0)
    ring.delete()
    disc.delete()
  })
})

describe('tactile keycap', () => {
  it('rises the marker height above the top at the marker position', () => {
    for (const profile of ['dsa', 'sa'] as const) {
      const config = tactile({ markerType: 'dot', markerSize: 3, markerHeight: 0.8, markerX: 0, markerY: -3 }, { profile, row: 'R1' })
      const p = bodyParams(config)
      const mesh = buildKeycap(wasm, config)
      const surface = topSurfaceZ(p, 0, p.topSkew - 3)
      expect(peakNear(mesh, 0, p.topSkew - 3, 0.5), profile).toBeCloseTo(surface + 0.8, 1)
    }
  })

  it('moves with the marker position', () => {
    const config = tactile({ markerType: 'dot', markerX: 4, markerY: 2, markerHeight: 0.6 }, { profile: 'dsa' })
    const p = bodyParams(config)
    const mesh = buildKeycap(wasm, config)
    expect(peakNear(mesh, 4, 2, 0.5)).toBeCloseTo(topSurfaceZ(p, 4, 2) + 0.6, 1)
    // Nothing raised on the opposite side
    expect(peakNear(mesh, -4, -2, 0.5)).toBeLessThan(topSurfaceZ(p, -4, -2) + 0.05)
  })

  it('adds material without changing the footprint', () => {
    const plain = buildKeycap(wasm, sanitizeConfig({ ...DEFAULT_CONFIG, top: { ...DEFAULT_CONFIG.top, form: 'flat' } }))
    for (const markerType of MARKER_TYPES) {
      const mesh = buildKeycap(wasm, tactile({ markerType, markerSize: 4 }))
      expect(volume(mesh), markerType).toBeGreaterThan(volume(plain))
      expect(meshSize(mesh.positions).width, markerType).toBeCloseTo(18, 3)
    }
  })

  it('keeps clear of the cavity even with a thin wall and a tall marker', () => {
    const thin = buildKeycap(wasm, tactile({ markerType: 'dot', markerHeight: 1 }, { wallThickness: 0.8 }))
    const thick = buildKeycap(wasm, tactile({ markerType: 'dot', markerHeight: 1 }, { wallThickness: 1.5 }))
    expect(volume(thin)).toBeGreaterThan(0)
    expect(volume(thick)).toBeGreaterThan(volume(thin))
  })
})
