import type { MeshData } from '@/geometry/body'

/**
 * Binary STL (little-endian): 80-byte header, triangle count, then per
 * triangle a normal, three vertices and a 2-byte attribute. Units are mm,
 * Z up, as slicers expect.
 */
export function meshToStl(mesh: MeshData, header = 'Keycap Configurator'): ArrayBuffer {
  const { positions: p, indices: t } = mesh
  const count = t.length / 3
  const buffer = new ArrayBuffer(84 + count * 50)
  const view = new DataView(buffer)

  const title = new TextEncoder().encode(header.slice(0, 80))
  new Uint8Array(buffer, 0, 80).set(title)
  view.setUint32(80, count, true)

  let offset = 84
  for (let i = 0; i < t.length; i += 3) {
    const a = t[i] * 3
    const b = t[i + 1] * 3
    const c = t[i + 2] * 3
    // Face normal from the winding (counter-clockwise = outward)
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2]
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]
    let nx = uy * vz - uz * vy
    let ny = uz * vx - ux * vz
    let nz = ux * vy - uy * vx
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len
    ny /= len
    nz /= len

    for (const value of [nx, ny, nz, p[a], p[a + 1], p[a + 2], p[b], p[b + 1], p[b + 2], p[c], p[c + 1], p[c + 2]]) {
      view.setFloat32(offset, value, true)
      offset += 4
    }
    view.setUint16(offset, 0, true)
    offset += 2
  }
  return buffer
}
