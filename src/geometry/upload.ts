import type { RhinoModule } from 'rhino3dm'
import type { MeshData } from './body'
import { STEM_INSET } from './stem-shapes'

/** Why an uploaded file couldn't be used (shown to the user). */
export type UploadError = 'unreadable' | 'empty' | 'no-mesh' | 'too-big'

/** Upper limit so a huge scan doesn't freeze the page. */
export const MAX_UPLOAD_TRIANGLES = 300_000

// ---------- STL ----------

/** Binary or ASCII STL → indexed mesh in the file's units (STL has none; mm is assumed). */
export function parseStl(buffer: ArrayBuffer): MeshData | UploadError {
  const bytes = new Uint8Array(buffer)
  if (bytes.length < 15) return 'unreadable'
  const view = new DataView(buffer)
  const binaryCount = bytes.length >= 84 ? view.getUint32(80, true) : -1
  // Binary files can also start with "solid", so trust the size first
  if (binaryCount >= 0 && 84 + binaryCount * 50 === bytes.length) {
    if (binaryCount === 0) return 'empty'
    if (binaryCount > MAX_UPLOAD_TRIANGLES) return 'too-big'
    const soup = new Float32Array(binaryCount * 9)
    for (let i = 0; i < binaryCount; i++) {
      for (let k = 0; k < 9; k++) soup[i * 9 + k] = view.getFloat32(84 + i * 50 + 12 + k * 4, true)
    }
    return weld(soup)
  }

  const text = new TextDecoder().decode(bytes)
  if (!/^\s*solid/i.test(text)) return 'unreadable'
  const numbers = [...text.matchAll(/vertex\s+(\S+)\s+(\S+)\s+(\S+)/gi)].flatMap((m) => [m[1], m[2], m[3]].map(Number))
  if (numbers.length === 0) return 'empty'
  if (numbers.length % 9 !== 0 || numbers.some((n) => !Number.isFinite(n))) return 'unreadable'
  if (numbers.length / 9 > MAX_UPLOAD_TRIANGLES) return 'too-big'
  return weld(new Float32Array(numbers))
}

/** Merge identical corners (STL repeats them per triangle) and drop zero-area triangles. */
export function weld(soup: Float32Array): MeshData {
  const index = new Map<string, number>()
  const positions: number[] = []
  const indices: number[] = []
  const id = (i: number) => {
    const key = `${soup[i].toFixed(4)},${soup[i + 1].toFixed(4)},${soup[i + 2].toFixed(4)}`
    let n = index.get(key)
    if (n === undefined) {
      n = positions.length / 3
      index.set(key, n)
      positions.push(soup[i], soup[i + 1], soup[i + 2])
    }
    return n
  }
  for (let t = 0; t < soup.length; t += 9) {
    const a = id(t)
    const b = id(t + 3)
    const c = id(t + 6)
    if (a !== b && b !== c && a !== c) indices.push(a, b, c)
  }
  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) }
}

// ---------- 3DM ----------

/** Millimetres per model unit for the units people actually use. */
const UNIT_TO_MM: Record<string, number> = {
  Millimeters: 1,
  Centimeters: 10,
  Meters: 1000,
  Inches: 25.4,
  Feet: 304.8,
  Microns: 0.001,
}

/**
 * Meshes from a .3dm file, scaled to mm. Mesh objects are used directly;
 * Breps and extrusions use the render meshes Rhino saved with the file.
 */
export function parse3dm(rhino: RhinoModule, buffer: ArrayBuffer): MeshData | UploadError {
  let doc: ReturnType<RhinoModule['File3dm']['fromByteArray']> | null
  try {
    doc = rhino.File3dm.fromByteArray(new Uint8Array(buffer))
  } catch {
    return 'unreadable'
  }
  if (!doc) return 'unreadable'

  const unitName = Object.entries(rhino.UnitSystem).find(([, v]) => v === doc!.settings().modelUnitSystem)?.[0] ?? 'Millimeters'
  const scale = UNIT_TO_MM[unitName] ?? 1
  const soup: number[] = []

  const addMesh = (mesh: { vertices(): { count: number; get(i: number): number[] }; faces(): { count: number; get(i: number): number[] } }) => {
    const v = mesh.vertices()
    const f = mesh.faces()
    const at = (i: number) => v.get(i).map((c) => c * scale)
    for (let i = 0; i < f.count; i++) {
      const [a, b, c, d] = f.get(i)
      soup.push(...at(a), ...at(b), ...at(c))
      // Quads repeat the third corner as the fourth when they're really triangles
      if (d !== c) soup.push(...at(a), ...at(c), ...at(d))
    }
  }

  const objects = doc.objects()
  for (let i = 0; i < objects.count; i++) {
    const geometry = objects.get(i).geometry() as unknown as {
      objectType: unknown
      faces?: () => { count: number; get(i: number): { getMesh?(type: unknown): unknown } }
      getMesh?: (type: unknown) => unknown
      vertices?: unknown
    }
    if (geometry.objectType === rhino.ObjectType.Mesh) {
      addMesh(geometry as never)
    } else if (geometry.objectType === rhino.ObjectType.Brep && geometry.faces) {
      const faces = geometry.faces()
      for (let j = 0; j < faces.count; j++) {
        const mesh = faces.get(j).getMesh?.(rhino.MeshType.Any)
        if (mesh) addMesh(mesh as never)
      }
    } else if (geometry.objectType === rhino.ObjectType.Extrusion && geometry.getMesh) {
      const mesh = geometry.getMesh(rhino.MeshType.Any)
      if (mesh) addMesh(mesh as never)
    }
  }
  ;(doc as unknown as { delete(): void }).delete()

  if (soup.length === 0) return 'no-mesh'
  if (soup.length / 9 > MAX_UPLOAD_TRIANGLES) return 'too-big'
  return weld(new Float32Array(soup))
}

// ---------- Placement ----------

/**
 * Centre the model on the main stem (x, y) and stand it where the
 * generated stems start (z = STEM_INSET), so a stem modelled anywhere
 * lands in the right place.
 */
export function autoPlace(mesh: MeshData): MeshData {
  const p = mesh.positions
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity
  for (let i = 0; i < p.length; i += 3) {
    minX = Math.min(minX, p[i]); maxX = Math.max(maxX, p[i])
    minY = Math.min(minY, p[i + 1]); maxY = Math.max(maxY, p[i + 1])
    minZ = Math.min(minZ, p[i + 2])
  }
  const dx = -(minX + maxX) / 2
  const dy = -(minY + maxY) / 2
  const dz = STEM_INSET - minZ
  const moved = new Float32Array(p.length)
  for (let i = 0; i < p.length; i += 3) {
    moved[i] = p[i] + dx
    moved[i + 1] = p[i + 1] + dy
    moved[i + 2] = p[i + 2] + dz
  }
  return { positions: moved, indices: mesh.indices }
}
