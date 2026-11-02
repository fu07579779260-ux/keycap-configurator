import Module, { type ManifoldToplevel } from 'manifold-3d'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import { ICONS } from '@/model/options'
import { sanitizeConfig } from '@/model/sanitize'
import { bodyParams, topSurfaceZ, type MeshData } from './body'
import { brailleCells, brailleDots, brailleWidth } from './braille'
import { meshVolume } from './dimensions'
import { iconSection } from './icons'
import { engraveDepth } from './legends'
import { toManifold } from './manifold-mesh'
import { buildKeycap } from './solid'
import { traceGrid, type Outline } from './text-outline'

let wasm: ManifoldToplevel

beforeAll(async () => {
  wasm = await Module()
  wasm.setup()
})

const design = (legend: Partial<KeycapConfig['legend']>, top: Partial<KeycapConfig['top']> = { form: 'flat' }, size: Partial<KeycapConfig['size']> = {}) =>
  sanitizeConfig({
    ...DEFAULT_CONFIG,
    size: { ...DEFAULT_CONFIG.size, profile: 'dsa', ...size },
    top: { ...DEFAULT_CONFIG.top, ...top },
    legend: { ...DEFAULT_CONFIG.legend, ...legend },
  })

const volume = (m: MeshData) => meshVolume(m.positions, m.indices)

/** A 4 × 4 mm square, standing in for traced text. */
const SQUARE: Outline = [[[-2, -2], [2, -2], [2, 2], [-2, 2]]]

function peakNear({ positions: p }: MeshData, x: number, y: number, radius: number) {
  let z = -Infinity
  for (let i = 0; i < p.length; i += 3) if (Math.hypot(p[i] - x, p[i + 1] - y) <= radius) z = Math.max(z, p[i + 2])
  return z
}

describe('Braille', () => {
  it('maps letters to their dots', () => {
    expect(brailleCells('a')).toEqual([[1]])
    expect(brailleCells('Esc')).toEqual([[1, 5], [2, 3, 4], [1, 4]])
  })

  it('puts the number sign once before a run of digits', () => {
    expect(brailleCells('12')).toEqual([[3, 4, 5, 6], [1], [1, 2]])
    expect(brailleCells('a1')).toEqual([[1], [3, 4, 5, 6], [1]])
  })

  it('skips characters without a Braille letter', () => {
    expect(brailleCells('a?')).toEqual([[1]])
  })

  it('lays dots out on the standard grid, centred', () => {
    // "b" = dots 1 and 2: left column, top and middle rows
    expect(brailleDots('b', 2.5)).toEqual([[-1.25, 2.5], [-1.25, 0]])
    expect(brailleWidth('ab', 2.5)).toBeCloseTo(2.5 * 2.48 + 2.5, 6)
  })
})

describe('traceGrid', () => {
  it('traces a filled square with a hole as two loops of four corners', () => {
    // 4 × 4 block with the centre 2 × 2 cleared
    const filled = (x: number, y: number) => x >= 0 && x < 4 && y >= 0 && y < 4 && !(x >= 1 && x < 3 && y >= 1 && y < 3)
    const loops = traceGrid(4, 4, filled, 0.5)
    expect(loops).toHaveLength(2)
    expect(loops.every((l) => l.length === 4)).toBe(true)
    // Centred and scaled: outer loop spans −1 … 1 mm
    const xs = loops.flat().map(([x]) => x)
    expect(Math.min(...xs)).toBe(-1)
    expect(Math.max(...xs)).toBe(1)
  })

  it('returns nothing for an empty grid', () => {
    expect(traceGrid(3, 3, () => false, 1)).toEqual([])
  })
})

describe('icons', () => {
  it('builds every icon within its size', () => {
    for (const icon of ICONS) {
      const section = iconSection(wasm, icon, 6)
      expect(section.area(), icon).toBeGreaterThan(1)
      const { min, max } = section.bounds()
      expect(Math.max(-min[0], max[0], -min[1], max[1]), icon).toBeLessThanOrEqual(3.01)
      section.delete()
    }
  })

  it('draws shift as an outline, not a filled arrow', () => {
    const shift = iconSection(wasm, 'shift', 10)
    const up = iconSection(wasm, 'arrow-up', 10)
    // A 1.1-unit band around the arrow's edge, so clearly less than the filled arrow
    expect(shift.area()).toBeLessThan(up.area() * 0.9)
    shift.delete()
    up.delete()
  })
})

describe('legends on the keycap', () => {
  const plain = () => volume(buildKeycap(wasm, design({ type: 'none' })))

  it('raised text adds material at the set height above the surface', () => {
    const config = design({ type: 'text', textMode: 'raised', textDepth: 0.6 })
    const mesh = buildKeycap(wasm, config, { textOutline: SQUARE })
    expect(volume(mesh)).toBeCloseTo(plain() + 16 * 0.6, 0)
    expect(peakNear(mesh, 0, 0, 1)).toBeCloseTo(topSurfaceZ(bodyParams(config), 0, 0) + 0.6, 2)
  })

  it('engraved text removes material', () => {
    const mesh = buildKeycap(wasm, design({ type: 'text', textMode: 'engraved', textDepth: 0.5 }), { textOutline: SQUARE })
    expect(volume(mesh)).toBeCloseTo(plain() - 16 * 0.5, 0)
  })

  it('raised text follows a dished top', () => {
    const config = design({ type: 'text', textMode: 'raised', textDepth: 0.5 }, { form: 'concave', dishShape: 'spherical', dishDepth: 1.5 })
    const mesh = buildKeycap(wasm, config, { textOutline: SQUARE })
    expect(peakNear(mesh, 0, 0, 0.4)).toBeCloseTo(topSurfaceZ(bodyParams(config), 0, 0) + 0.5, 1)
  })

  it('never engraves through a thin top', () => {
    expect(engraveDepth(1, 0.8)).toBeCloseTo(0.4, 6)
    expect(engraveDepth(0.5, 2)).toBe(0.5)
    const mesh = buildKeycap(wasm, design({ type: 'text', textMode: 'engraved', textDepth: 1 }, { form: 'flat' }, { wallThickness: 0.8 }), {
      textOutline: SQUARE,
    })
    expect(volume(mesh)).toBeGreaterThan(0)
  })

  it('text without a traced outline adds nothing', () => {
    expect(volume(buildKeycap(wasm, design({ type: 'text', text: 'A' })))).toBeCloseTo(plain(), 3)
  })

  it('Braille adds one bump per dot', () => {
    const one = volume(buildKeycap(wasm, design({ type: 'braille', brailleText: 'a' }))) - plain()
    const three = volume(buildKeycap(wasm, design({ type: 'braille', brailleText: 'l' }))) - plain()
    expect(one).toBeGreaterThan(0.2)
    expect(three).toBeCloseTo(one * 3, 1)
  })

  it('never leaves loose pieces when Braille or a marker overhangs the top', () => {
    // Three cells are wider than a 1u top, and the marker sits off the edge
    for (const config of [
      design({ type: 'braille', brailleText: 'a1' }),
      sanitizeConfig({ ...design({ type: 'none' }), top: { ...DEFAULT_CONFIG.top, form: 'tactile', markerType: 'dot', markerX: 6, markerY: 6 } }),
    ]) {
      const solid = toManifold(wasm, buildKeycap(wasm, config))
      expect(solid.decompose().length).toBe(1)
      solid.delete()
    }
  })

  it('icons can be raised or engraved', () => {
    const raised = volume(buildKeycap(wasm, design({ type: 'icon', icon: 'home', textMode: 'raised', textSize: 6 })))
    const engraved = volume(buildKeycap(wasm, design({ type: 'icon', icon: 'home', textMode: 'engraved', textSize: 6 })))
    expect(raised).toBeGreaterThan(plain())
    expect(engraved).toBeLessThan(plain())
  })
})
