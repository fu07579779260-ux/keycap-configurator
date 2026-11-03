import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'
import { acrossFingertip, findEdges, pixelsPerMm, type Point } from './measure'
import { applyRecommendation, recommend } from './recommend'
import { scanFingerWidth, scanPoints } from './scan'

describe('recommend', () => {
  it('picks a narrower top for narrower fingertips', () => {
    expect(recommend(13).profile).toBe('cherry')
    expect(recommend(16.5).profile).toBe('dsa')
    expect(recommend(20).profile).toBe('xda')
  })

  it('suggests a deeper dish for narrower fingertips, within range', () => {
    expect(recommend(13).dishDepth).toBeGreaterThan(recommend(20).dishDepth)
    for (const w of [8, 12, 16, 24, 40]) {
      const d = recommend(w).dishDepth
      expect(d).toBeGreaterThanOrEqual(0.5)
      expect(d).toBeLessThanOrEqual(1.4)
    }
  })

  it('explains each choice', () => {
    expect(recommend(16).reasons.map((r) => r.key)).toEqual(['fit.reason.dsa', 'fit.reason.depth', 'fit.reason.height'])
  })

  it('applies to a design as a valid concave key, keeping the rest', () => {
    const start = sanitizeConfig({ ...DEFAULT_CONFIG, stem: { ...DEFAULT_CONFIG.stem, type: 'choc-v2' }, top: { ...DEFAULT_CONFIG.top, form: 'angled' } })
    const out = applyRecommendation(start, recommend(19))
    expect(out.size.profile).toBe('xda')
    expect(out.top.form).toBe('concave')
    expect(out.stem.type).toBe('choc-v2')
    expect(sanitizeConfig(out)).toEqual(out)
  })
})

describe('photo measurement', () => {
  it('turns a marked card edge into pixels per mm', () => {
    expect(pixelsPerMm({ x: 0, y: 0 }, { x: 856, y: 0 }, 85.6)).toBeCloseTo(10, 6)
  })

  it('measures across the finger, halfway along the last segment', () => {
    const { centre, across } = acrossFingertip({ x: 100, y: 200 }, { x: 100, y: 100 })
    expect(centre).toEqual({ x: 100, y: 150 })
    expect(Math.abs(across.x)).toBeCloseTo(1, 6)
    expect(across.y).toBeCloseTo(0, 6)
  })

  it('finds the edges of a finger-coloured band on a dark background', () => {
    // Synthetic photo: skin from x = 80 to 120, dark elsewhere, with a little noise
    const colourAt = ({ x, y }: Point): [number, number, number] | null => {
      if (x < 0 || x > 300 || y < 0 || y > 300) return null
      const noise = ((Math.floor(x) * 7 + Math.floor(y) * 13) % 9) - 4
      return x >= 80 && x <= 120 ? [220 + noise, 170 + noise, 150] : [40, 40, 45 + noise]
    }
    const edges = findEdges(colourAt, { x: 100, y: 150 }, { x: 1, y: 0 }, 150)!
    const width = Math.abs(edges[1].x - edges[0].x)
    expect(width).toBeGreaterThan(38)
    expect(width).toBeLessThan(44)
  })

  it('gives up when no edge is in reach', () => {
    const flat = (): [number, number, number] => [200, 160, 140]
    expect(findEdges(flat, { x: 0, y: 0 }, { x: 1, y: 0 }, 50)).toBeNull()
  })
})

describe('scan measurement', () => {
  /** A fingertip-like point cloud: an elliptic cylinder 16 × 12 mm, 30 mm long, rounded at the tip. */
  function fingertip(width: number, thickness: number, length = 30): Float32Array {
    const pts: number[] = []
    for (let z = 0; z <= length; z += 0.5) {
      // Narrows over the last 6 mm like a fingertip
      const taper = z > length - 6 ? Math.sqrt(Math.max(0, 1 - ((z - (length - 6)) / 6) ** 2)) : 1
      for (let a = 0; a < 2 * Math.PI; a += Math.PI / 24) {
        pts.push((Math.cos(a) * width * taper) / 2, (Math.sin(a) * thickness * taper) / 2, z)
      }
    }
    // Rotate so the finger isn't along an axis
    const c = Math.cos(0.6), s = Math.sin(0.6)
    for (let i = 0; i < pts.length; i += 3) {
      const [x, , z] = [pts[i], pts[i + 1], pts[i + 2]]
      pts[i] = c * x + s * z
      pts[i + 2] = -s * x + c * z
    }
    return new Float32Array(pts)
  }

  it('measures the pad width (the wider direction), near the tip', () => {
    const width = scanFingerWidth(fingertip(16, 12))!
    expect(width).toBeGreaterThan(14)
    expect(width).toBeLessThanOrEqual(16.1)
  })

  it('needs enough points and length', () => {
    expect(scanFingerWidth(new Float32Array(30))).toBeNull()
  })

  it('reads OBJ and ASCII PLY vertices', () => {
    const obj = 'v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n'
    expect(Array.from(scanPoints('scan.obj', new TextEncoder().encode(obj).buffer)!)).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0])
    const ply = 'ply\nformat ascii 1.0\nelement vertex 2\nproperty float x\nproperty float y\nproperty float z\nend_header\n1 2 3\n4 5 6\n'
    expect(Array.from(scanPoints('scan.ply', new TextEncoder().encode(ply).buffer)!)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('reads binary PLY vertices with extra properties', () => {
    const header = 'ply\nformat binary_little_endian 1.0\nelement vertex 2\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nend_header\n'
    const head = new TextEncoder().encode(header)
    const body = new ArrayBuffer(2 * 13)
    const view = new DataView(body)
    ;[[1, 2, 3], [4, 5, 6]].forEach((v, i) => v.forEach((c, k) => view.setFloat32(i * 13 + k * 4, c, true)))
    const file = new Uint8Array(head.length + body.byteLength)
    file.set(head)
    file.set(new Uint8Array(body), head.length)
    expect(Array.from(scanPoints('scan.ply', file.buffer)!)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('refuses unknown file types', () => {
    expect(scanPoints('scan.fbx', new ArrayBuffer(10))).toBeNull()
  })
})
