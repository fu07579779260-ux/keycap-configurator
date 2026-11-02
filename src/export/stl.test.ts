import Module from 'manifold-3d'
import { describe, expect, it } from 'vitest'
import { bodyParams, buildBody } from '@/geometry/body'
import { meshVolume } from '@/geometry/dimensions'
import { buildKeycap } from '@/geometry/solid'
import { DEFAULT_CONFIG } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'
import { designFileName, formSetFileName } from './filename'
import { meshToStl } from './stl'

/** Read a binary STL back into triangles. */
function parseStl(buffer: ArrayBuffer) {
  const view = new DataView(buffer)
  const count = view.getUint32(80, true)
  const triangles: { normal: number[]; vertices: number[][] }[] = []
  for (let i = 0; i < count; i++) {
    const at = 84 + i * 50
    const f = (k: number) => view.getFloat32(at + k * 4, true)
    triangles.push({
      normal: [f(0), f(1), f(2)],
      vertices: [[f(3), f(4), f(5)], [f(6), f(7), f(8)], [f(9), f(10), f(11)]],
    })
  }
  return { count, triangles }
}

describe('meshToStl', () => {
  const mesh = buildBody(bodyParams(DEFAULT_CONFIG))

  it('has the binary STL size: 84 + 50 bytes per triangle', () => {
    const stl = meshToStl(mesh)
    expect(stl.byteLength).toBe(84 + 50 * (mesh.indices.length / 3))
    expect(parseStl(stl).count).toBe(mesh.indices.length / 3)
  })

  it('writes the header text', () => {
    const header = new TextDecoder().decode(new Uint8Array(meshToStl(mesh, 'Test header'), 0, 11))
    expect(header).toBe('Test header')
  })

  it('stores the same vertices and unit normals', () => {
    const { triangles } = parseStl(meshToStl(mesh))
    const first = mesh.indices[0] * 3
    expect(triangles[0].vertices[0][0]).toBeCloseTo(mesh.positions[first], 5)
    for (const { normal } of triangles) {
      const length = Math.hypot(...normal)
      // Degenerate triangles (zero area) get a zero normal
      expect(length === 0 || Math.abs(length - 1) < 1e-4).toBe(true)
    }
  })

  it('keeps the volume of the printable keycap', async () => {
    const wasm = await Module()
    wasm.setup()
    const shell = buildKeycap(wasm, DEFAULT_CONFIG)
    const { triangles } = parseStl(meshToStl(shell))
    const positions = new Float32Array(triangles.flatMap((t) => t.vertices.flat()))
    const indices = Uint32Array.from({ length: positions.length / 3 }, (_, i) => i)
    expect(meshVolume(positions, indices)).toBeCloseTo(meshVolume(shell.positions, shell.indices), 1)
  })
})

describe('designFileName', () => {
  it('describes the design', () => {
    expect(designFileName(DEFAULT_CONFIG, 'stl')).toBe('keycap-cherry-r3-1u-concave-mx.stl')
  })

  it('names the five-forms set after the key, not its current form', () => {
    expect(formSetFileName(DEFAULT_CONFIG)).toBe('keycap-cherry-r3-1u-five-forms-mx.zip')
  })

  it('leaves out the row for profiles without rows', () => {
    const config = sanitizeConfig({ size: { profile: 'dsa', widthU: 6.25 }, top: { form: 'tactile' }, stem: { type: 'choc-v1' } })
    expect(designFileName(config, 'stl')).toBe('keycap-dsa-6.25u-tactile-choc-v1.stl')
  })
})
