import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'
import type { MeshData } from './body'
import { meshVolume } from './dimensions'
import { toManifold } from './manifold-mesh'
import { buildKeycap, buildKeycapParts } from './solid'
import type { Outline } from './text-outline'

let wasm: ManifoldToplevel

beforeAll(async () => {
  wasm = await Module()
  wasm.setup()
})

const SQUARE: Outline = [[[-2, -2], [2, -2], [2, 2], [-2, 2]]]

const design = (patch: { [S in keyof KeycapConfig]?: Partial<KeycapConfig[S]> }) =>
  sanitizeConfig({
    stem: DEFAULT_CONFIG.stem,
    size: { ...DEFAULT_CONFIG.size, profile: 'dsa' },
    top: { ...DEFAULT_CONFIG.top, form: 'flat', ...patch.top },
    legend: { ...DEFAULT_CONFIG.legend, ...patch.legend },
    manufacturing: { ...DEFAULT_CONFIG.manufacturing, secondColour: '#1a1a1a', ...patch.manufacturing },
  })

const volume = (m: MeshData) => meshVolume(m.positions, m.indices)

/** Volume shared by two meshes (should be ~0 for parts that only touch). */
function overlap(a: MeshData, b: MeshData) {
  const ma = toManifold(wasm, a)
  const mb = toManifold(wasm, b)
  const both = ma.intersect(mb)
  const v = both.volume()
  for (const m of [ma, mb, both]) m.delete()
  return v
}

describe('buildKeycapParts', () => {
  it('has no accent when there is nothing to colour', () => {
    const parts = buildKeycapParts(wasm, design({}))
    expect(parts.accent).toBeNull()
    expect(volume(parts.body)).toBeCloseTo(volume(buildKeycap(wasm, design({}))), 3)
  })

  it('splits a tactile marker off as the accent', () => {
    const config = design({ top: { form: 'tactile', markerType: 'dot', markerSize: 4, markerY: 0 } })
    const { body, accent } = buildKeycapParts(wasm, config)
    expect(accent).not.toBeNull()
    // Together they are the single-colour keycap, and they don't overlap
    expect(volume(body) + volume(accent!)).toBeCloseTo(volume(buildKeycap(wasm, config)), 1)
    expect(overlap(body, accent!)).toBeLessThan(0.01)
  })

  it('splits raised text off as the accent', () => {
    const config = design({ legend: { type: 'text', textMode: 'raised', textDepth: 0.5 } })
    const extras = { textOutline: SQUARE }
    const { body, accent } = buildKeycapParts(wasm, config, extras)
    expect(volume(accent!)).toBeGreaterThan(16 * 0.5 * 0.9)
    expect(volume(body) + volume(accent!)).toBeCloseTo(volume(buildKeycap(wasm, config, extras)), 1)
  })

  it('fills an engraving with the second colour (flush inlay)', () => {
    const config = design({ legend: { type: 'text', textMode: 'engraved', textDepth: 0.5 } })
    const extras = { textOutline: SQUARE }
    const { body, accent } = buildKeycapParts(wasm, config, extras)
    const plain = volume(buildKeycap(wasm, design({})))
    // The inlay is the engraved volume; body + inlay = the uncut keycap
    expect(volume(accent!)).toBeCloseTo(16 * 0.5, 0)
    expect(volume(body) + volume(accent!)).toBeCloseTo(plain, 1)
    expect(overlap(body, accent!)).toBeLessThan(0.01)
  })

  it('splits Braille dots and drops the ones beyond the top', () => {
    const one = buildKeycapParts(wasm, design({ legend: { type: 'braille', brailleText: 'a' } }))
    // "a1" = a, number sign, a: six dots, and the left-most one falls beyond a 1u top
    const tooWide = buildKeycapParts(wasm, design({ legend: { type: 'braille', brailleText: 'a1' } }))
    expect(volume(tooWide.accent!)).toBeCloseTo(volume(one.accent!) * 5, 1)
    // What's left stays over the cap
    const xs = Array.from(tooWide.accent!.positions).filter((_, i) => i % 3 === 0)
    expect(Math.min(...xs)).toBeGreaterThan(-9)
  })
})
