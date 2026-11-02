import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import { PROFILES, ROWS, TOP_FORMS } from '@/model/options'
import { sanitizeConfig } from '@/model/sanitize'
import { bodyParams, buildBody, roundedRect, topShape, type MeshData } from './body'
import { PROFILE_SHAPES } from './profiles'

function bounds({ positions }: MeshData) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k])
      max[k] = Math.max(max[k], positions[i + k])
    }
  }
  return { min, max }
}

/** Signed volume; positive when all faces point outward. */
function volume({ positions: p, indices: t }: MeshData) {
  let v = 0
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [t[i] * 3, t[i + 1] * 3, t[i + 2] * 3]
    v += (p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c])) / 6
  }
  return v
}

/** Every edge must be used exactly twice, once in each direction. Bottom-ring
 *  duplicates are merged by position first. */
function isClosed({ positions: p, indices: t }: MeshData) {
  const key = (i: number) => `${p[i * 3].toFixed(5)},${p[i * 3 + 1].toFixed(5)},${p[i * 3 + 2].toFixed(5)}`
  const edges = new Map<string, number>()
  for (let i = 0; i < t.length; i += 3) {
    for (let e = 0; e < 3; e++) {
      const a = key(t[i + e])
      const b = key(t[i + ((e + 1) % 3)])
      edges.set(`${a}|${b}`, (edges.get(`${a}|${b}`) ?? 0) + 1)
    }
  }
  for (const [edge, count] of edges) {
    const [a, b] = edge.split('|')
    if (count !== 1 || edges.get(`${b}|${a}`) !== 1) return false
  }
  return true
}

/** A design with the given size settings and, unless stated, a flat top. */
const design = (size: Partial<KeycapConfig['size']>, top: Partial<KeycapConfig['top']> = { form: 'flat' }) =>
  sanitizeConfig({
    ...DEFAULT_CONFIG,
    size: { ...DEFAULT_CONFIG.size, ...size },
    top: { ...DEFAULT_CONFIG.top, ...top },
  })

/** z of the vertex closest (in x, y) to the given point, looking only at the top surface. */
function topZ({ positions: p }: MeshData, x: number, y: number) {
  let best = Infinity
  let z = NaN
  for (let i = 0; i < p.length; i += 3) {
    if (p[i + 2] < 1) continue
    const d = Math.hypot(p[i] - x, p[i + 1] - y)
    if (d < best - 1e-9 || (Math.abs(d - best) < 1e-9 && p[i + 2] > z)) {
      best = d
      z = p[i + 2]
    }
  }
  return z
}

describe('roundedRect', () => {
  it('has the same number of points for any size', () => {
    expect(roundedRect(18, 18, 1).length).toBe(roundedRect(100, 12, 3).length)
  })

  it('stays inside the rectangle', () => {
    for (const [x, y] of roundedRect(18, 14, 2)) {
      expect(Math.abs(x)).toBeLessThanOrEqual(9 + 1e-9)
      expect(Math.abs(y)).toBeLessThanOrEqual(7 + 1e-9)
    }
  })
})

describe('buildBody', () => {
  it('matches the 1u footprint and the profile height', () => {
    const p = bodyParams(design({ profile: 'dsa' }))
    const { min, max } = bounds(buildBody(p))
    expect(max[0] - min[0]).toBeCloseTo(18, 5)
    expect(max[1] - min[1]).toBeCloseTo(18, 5)
    expect(min[2]).toBe(0)
    expect(max[2]).toBeCloseTo(PROFILE_SHAPES.dsa.rows.R3.height, 5)
  })

  it('keeps the top inside the footprint for every profile', () => {
    for (const profile of PROFILES) {
      const { min, max } = bounds(buildBody(bodyParams(design({ profile }))))
      expect(max[0] - min[0], profile).toBeCloseTo(18, 5)
      expect(max[1] - min[1], profile).toBeCloseTo(18, 5)
    }
  })

  it('uses the height override', () => {
    const { max } = bounds(buildBody(bodyParams(design({ heightOverride: 12 }))))
    expect(max[2]).toBeCloseTo(12, 5)
  })

  it('gets wider with the key width', () => {
    const { min, max } = bounds(buildBody(bodyParams(design({ widthU: 2 }))))
    expect(max[0] - min[0]).toBeCloseTo(2 * 19.05 - 1.05, 5)
  })

  it('raises the back edge for a positive tilt (number row)', () => {
    const mesh = buildBody(bodyParams(design({ profile: 'sa', row: 'R1' })))
    const p = mesh.positions
    let frontTop = 0
    let backTop = 0
    for (let i = 0; i < p.length; i += 3) {
      if (p[i + 1] < 0) frontTop = Math.max(frontTop, p[i + 2])
      else backTop = Math.max(backTop, p[i + 2])
    }
    expect(backTop).toBeGreaterThan(frontTop + 1)
  })

  it('is closed with outward faces for every profile and row', () => {
    for (const profile of PROFILES) {
      for (const row of ROWS) {
        const mesh = buildBody(bodyParams(design({ profile, row })))
        expect(mesh.positions.every(Number.isFinite), `${profile} ${row}`).toBe(true)
        expect(isClosed(mesh), `${profile} ${row} closed`).toBe(true)
        expect(volume(mesh), `${profile} ${row} volume`).toBeGreaterThan(0)
      }
    }
  })

  it('limits a large fillet so the shape stays valid', () => {
    const mesh = buildBody({ ...bodyParams(design({ profile: 'dsa' })), topFillet: 50 })
    expect(mesh.positions.every(Number.isFinite)).toBe(true)
    expect(isClosed(mesh)).toBe(true)
  })
})

describe('top forms', () => {
  // DSA: no tilt and no skew, so the top centre is at (0, 0)
  const dsa = { profile: 'dsa' as const }
  const h = PROFILE_SHAPES.dsa.rows.R3.height

  it('maps the form to a top shape', () => {
    expect(topShape(design(dsa))).toEqual({ kind: 'flat' })
    expect(topShape(design(dsa, { form: 'tactile' }))).toEqual({ kind: 'flat' })
    expect(topShape(design(dsa, { form: 'concave', dishShape: 'auto', dishDepth: 1 }))).toEqual({ kind: 'spherical', depth: 1 })
    expect(topShape(design({ profile: 'cherry' }, { form: 'concave', dishShape: 'auto', dishDepth: 1 }))).toEqual({
      kind: 'cylindrical',
      depth: 1,
    })
    expect(topShape(design(dsa, { form: 'convex', domeHeight: 0.6 }))).toEqual({ kind: 'dome', height: 0.6 })
  })

  it('flat: the centre is at the profile height', () => {
    expect(topZ(buildBody(bodyParams(design(dsa))), 0, 0)).toBeCloseTo(h, 5)
  })

  it('concave: the centre sits one dish depth lower', () => {
    const mesh = buildBody(bodyParams(design(dsa, { form: 'concave', dishShape: 'spherical', dishDepth: 1.5 })))
    expect(topZ(mesh, 0, 0)).toBeCloseTo(h - 1.5, 5)
  })

  it('cylindrical: the middle of the front edge dips, the corners do not', () => {
    const mesh = buildBody(bodyParams(design(dsa, { form: 'concave', dishShape: 'cylindrical', dishDepth: 1 })))
    const half = bodyParams(design(dsa)).topDepth / 2
    const frontMiddle = topZ(mesh, 0, -half)
    const frontSide = topZ(mesh, 5, -half)
    expect(frontMiddle).toBeLessThan(frontSide - 0.3)
  })

  it('convex: the centre rises by the dome height', () => {
    const mesh = buildBody(bodyParams(design(dsa, { form: 'convex', domeHeight: 0.8 })))
    expect(topZ(mesh, 0, 0)).toBeCloseTo(h + 0.8, 5)
  })

  it('angled: the chosen side ends up lower', () => {
    const half = 5
    for (const [direction, low, high] of [
      ['front', [0, -half], [0, half]],
      ['back', [0, half], [0, -half]],
      ['left', [-half, 0], [half, 0]],
      ['right', [half, 0], [-half, 0]],
    ] as const) {
      const mesh = buildBody(bodyParams(design(dsa, { form: 'angled', slopeAngle: 10, slopeDirection: direction })))
      expect(topZ(mesh, low[0], low[1]), direction).toBeLessThan(topZ(mesh, high[0], high[1]) - 1)
    }
  })

  it('is closed with outward faces for every form', () => {
    for (const form of TOP_FORMS) {
      for (const profile of ['cherry', 'sa'] as const) {
        const mesh = buildBody(bodyParams(design({ profile, row: 'R1', widthU: 2.25 }, { form, dishDepth: 2, domeHeight: 2, slopeAngle: 15 })))
        expect(isClosed(mesh), `${form} ${profile}`).toBe(true)
        expect(volume(mesh), `${form} ${profile}`).toBeGreaterThan(0)
      }
    }
  })
})
