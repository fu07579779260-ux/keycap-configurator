import Module, { type ManifoldToplevel } from 'manifold-3d'
import rhino3dm, { type RhinoModule } from 'rhino3dm'
import { beforeAll, describe, expect, it } from 'vitest'
import { meshToStl } from '@/export/stl'
import { write3dm } from '@/export/rhino'
import { DEFAULT_CONFIG } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'
import { meshSize, meshVolume } from './dimensions'
import { fromManifold } from './manifold-mesh'
import { buildKeycap } from './solid'
import { STEM_INSET } from './stem-shapes'
import { autoPlace, parse3dm, parseStl, weld } from './upload'
import type { MeshData } from './body'

let wasm: ManifoldToplevel
let rhino: RhinoModule
beforeAll(async () => {
  wasm = await Module()
  wasm.setup()
  rhino = await rhino3dm()
})

/** A closed cylinder (a stand-in for someone's custom stem), modelled away from the origin. */
function cylinder(radius: number, height: number, at: [number, number, number] = [0, 0, 0]): MeshData {
  const m = wasm.Manifold.cylinder(height, radius, radius, 32)
  const moved = m.translate(at)
  const mesh = fromManifold(moved)
  m.delete()
  moved.delete()
  return mesh
}

const volume = (m: MeshData) => meshVolume(m.positions, m.indices)

describe('parseStl', () => {
  it('reads a binary STL back into a closed indexed mesh', () => {
    const original = cylinder(3, 5)
    const parsed = parseStl(meshToStl(original)) as MeshData
    expect(parsed.positions.length).toBe(original.positions.length)
    expect(volume(parsed)).toBeCloseTo(volume(original), 3)
  })

  it('reads an ASCII STL', () => {
    const ascii = `solid test
facet normal 0 0 1
 outer loop
  vertex 0 0 0
  vertex 1 0 0
  vertex 0 1 0
 endloop
endfacet
endsolid test`
    const parsed = parseStl(new TextEncoder().encode(ascii).buffer) as MeshData
    expect(Array.from(parsed.indices)).toEqual([0, 1, 2])
  })

  it('reports unreadable and empty files', () => {
    expect(parseStl(new TextEncoder().encode('hello world, not an stl').buffer)).toBe('unreadable')
    expect(parseStl(new ArrayBuffer(84))).toBe('empty')
  })

  it('welds repeated corners and drops degenerate triangles', () => {
    const soup = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, /* shares two corners */ 1, 0, 0, 1, 1, 0, 0, 1, 0, /* zero area */ 0, 0, 0, 0, 0, 0, 1, 1, 1])
    const mesh = weld(soup)
    expect(mesh.positions.length / 3).toBe(5)
    expect(mesh.indices.length / 3).toBe(2)
  })
})

describe('parse3dm', () => {
  it('reads meshes and converts the units to mm', () => {
    const original = cylinder(3, 5)
    const bytes = write3dm(rhino, [{ mesh: original, name: 'Stem', colour: '#111111' }])
    const parsed = parse3dm(rhino, bytes.slice().buffer) as MeshData
    expect(volume(parsed)).toBeCloseTo(volume(original), 2)
  })

  it('reports files that are not 3DM', () => {
    expect(parse3dm(rhino, new TextEncoder().encode('nope').buffer)).toBe('unreadable')
  })
})

describe('autoPlace', () => {
  it('centres the model and stands it on the stem start height', () => {
    const placed = autoPlace(cylinder(2.5, 4, [30, -12, 7]))
    const p = placed.positions
    const xs = p.filter((_, i) => i % 3 === 0)
    const zs = p.filter((_, i) => i % 3 === 2)
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 4)
    expect(Math.min(...zs)).toBeCloseTo(STEM_INSET, 4)
  })
})

describe('uploaded base in the keycap', () => {
  const uploadConfig = sanitizeConfig({ stem: { type: 'upload', uploadName: 'stem.stl' } })

  it('replaces the generated main stem', () => {
    const base = autoPlace(cylinder(2.75, 6))
    const withUpload = buildKeycap(wasm, uploadConfig, { uploadedBase: base })
    const withMx = buildKeycap(wasm, DEFAULT_CONFIG)
    // A solid post has no cross socket, so it adds more material than the MX stem
    expect(volume(withUpload)).toBeGreaterThan(volume(withMx))
  })

  it('falls back to the MX stem until a file is uploaded', () => {
    expect(volume(buildKeycap(wasm, uploadConfig))).toBeCloseTo(volume(buildKeycap(wasm, DEFAULT_CONFIG)), 3)
  })

  it('cuts off anything outside the cap or above it', () => {
    // A tall wide block: sticks out sideways and through the top
    const big = autoPlace(fromManifold(wasm.Manifold.cube([40, 6, 30], true)))
    const size = meshSize(buildKeycap(wasm, uploadConfig, { uploadedBase: big }).positions)
    expect(size.width).toBeCloseTo(18, 1)
    expect(size.height).toBeLessThan(8)
  })
})
