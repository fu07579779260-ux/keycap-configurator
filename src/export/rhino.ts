import type { File3dm, RhinoModule } from 'rhino3dm'
import type { MeshData } from '@/geometry/body'

/**
 * .3dm writer (rhino3dm). Model units are millimetres and the model is Z-up,
 * like the keycap geometry itself. Each colour part goes on its own named
 * layer, coloured like the part, so it can be edited or re-exported in Rhino.
 *
 * Files are written in Rhino 7 format: Rhino 7 and Rhino 8 both open it,
 * while the library default (Rhino 8 format) does not open in Rhino 7.
 */
export const RHINO_FILE_VERSION = 7

export interface RhinoPart {
  mesh: MeshData
  /** Layer and object name, e.g. "Keycap" or "Legend + marker". */
  name: string
  /** Hex colour for the layer, e.g. "#f2f2f0". */
  colour: string
}

// Embind objects live on the WASM heap and must be freed by hand
type Deletable = { delete(): void }
const free = (...objects: unknown[]) => objects.forEach((o) => (o as Deletable).delete())

const rgba = (hex: string) => ({
  r: parseInt(hex.slice(1, 3), 16),
  g: parseInt(hex.slice(3, 5), 16),
  b: parseInt(hex.slice(5, 7), 16),
  a: 255,
})

function addLayer(rhino: RhinoModule, doc: File3dm, name: string, colour: string): number {
  const layer = new rhino.Layer()
  layer.name = name
  layer.color = rgba(colour)
  const index = doc.layers().add(layer)
  free(layer)
  return index
}

function toRhinoMesh(rhino: RhinoModule, { positions: P, indices: I }: MeshData) {
  const m = new rhino.Mesh()
  const vertices = m.vertices()
  for (let i = 0; i < P.length; i += 3) vertices.add(P[i], P[i + 1], P[i + 2])
  const faces = m.faces()
  for (let f = 0; f < I.length; f += 3) faces.addTriFace(I[f], I[f + 1], I[f + 2])
  m.normals().computeNormals()
  m.compact()
  return m
}

/** Build a .3dm file in memory, one layer per part. */
export function write3dm(rhino: RhinoModule, parts: RhinoPart[], title = 'Keycap'): Uint8Array {
  const doc = new rhino.File3dm()
  doc.applicationName = 'Keycap Configurator'
  doc.settings().modelUnitSystem = rhino.UnitSystem.Millimeters

  for (const part of parts) {
    const layerIndex = addLayer(rhino, doc, part.name, part.colour)
    const mesh = toRhinoMesh(rhino, part.mesh)
    const attributes = new rhino.ObjectAttributes()
    attributes.layerIndex = layerIndex
    attributes.name = `${title} – ${part.name}`
    doc.objects().add(mesh, attributes)
    free(mesh, attributes)
  }

  const options = new rhino.File3dmWriteOptions()
  options.version = RHINO_FILE_VERSION
  const bytes = doc.toByteArrayOptions(options)
  free(options, doc)
  return bytes
}
