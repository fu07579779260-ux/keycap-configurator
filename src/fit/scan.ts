import { parseStl } from '@/geometry/upload'

/** Points from a scan file: STL, OBJ or PLY (ASCII or binary little-endian). Only vertices are needed. */
export function scanPoints(name: string, buffer: ArrayBuffer): Float32Array | null {
  const ext = name.toLowerCase().split('.').pop()
  if (ext === 'stl') {
    const mesh = parseStl(buffer)
    return typeof mesh === 'string' ? null : mesh.positions
  }
  if (ext === 'obj') return objPoints(new TextDecoder().decode(buffer))
  if (ext === 'ply') return plyPoints(buffer)
  return null
}

function objPoints(text: string): Float32Array | null {
  const nums: number[] = []
  for (const m of text.matchAll(/^v\s+(\S+)\s+(\S+)\s+(\S+)/gm)) nums.push(+m[1], +m[2], +m[3])
  return nums.length >= 9 && nums.every(Number.isFinite) ? new Float32Array(nums) : null
}

function plyPoints(buffer: ArrayBuffer): Float32Array | null {
  const bytes = new Uint8Array(buffer)
  const head = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.length, 4096)))
  const end = head.indexOf('end_header')
  if (!head.startsWith('ply') || end < 0) return null
  const lines = head.slice(0, end).split(/\r?\n/)
  const format = lines.find((l) => l.startsWith('format'))?.split(/\s+/)[1]
  const count = Number(/element vertex (\d+)/.exec(head)?.[1] ?? 0)
  // Vertex properties in order, up to the next element
  const props: { name: string; type: string }[] = []
  let inVertex = false
  for (const l of lines) {
    if (l.startsWith('element')) inVertex = l.startsWith('element vertex')
    else if (inVertex && l.startsWith('property') && !l.includes('list')) {
      const [, type, name] = l.split(/\s+/)
      props.push({ name, type })
    }
  }
  const ix = ['x', 'y', 'z'].map((n) => props.findIndex((p) => p.name === n))
  if (!count || ix.some((i) => i < 0)) return null
  const out = new Float32Array(count * 3)
  const bodyStart = head.indexOf('\n', end) + 1

  if (format === 'ascii') {
    const rows = new TextDecoder().decode(bytes.slice(bodyStart)).split(/\r?\n/)
    for (let v = 0; v < count; v++) {
      const cols = rows[v]?.trim().split(/\s+/).map(Number)
      if (!cols) return null
      for (let k = 0; k < 3; k++) out[v * 3 + k] = cols[ix[k]]
    }
    return out
  }
  if (format !== 'binary_little_endian') return null
  const size: Record<string, number> = { char: 1, uchar: 1, int8: 1, uint8: 1, short: 2, ushort: 2, int16: 2, uint16: 2, int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4, double: 8, float64: 8 }
  const offsets: number[] = []
  let stride = 0
  for (const p of props) {
    offsets.push(stride)
    stride += size[p.type] ?? 4
  }
  const view = new DataView(buffer, bodyStart)
  for (let v = 0; v < count; v++) {
    for (let k = 0; k < 3; k++) {
      const p = props[ix[k]]
      const at = v * stride + offsets[ix[k]]
      out[v * 3 + k] = p.type.startsWith('double') || p.type === 'float64' ? view.getFloat64(at, true) : view.getFloat32(at, true)
    }
  }
  return out
}

/**
 * Fingertip pad width (mm) from scan points: find the finger's long axis,
 * take the narrower end as the tip, and measure across the finger 3–8 mm
 * back from the tip, along the widest direction (pad width, not thickness).
 */
export function scanFingerWidth(points: Float32Array): number | null {
  const n = points.length / 3
  if (n < 20) return null
  const mean = [0, 0, 0]
  for (let i = 0; i < n; i++) for (let k = 0; k < 3; k++) mean[k] += points[i * 3 + k] / n
  const cov = [0, 0, 0, 0, 0, 0, 0, 0, 0]
  for (let i = 0; i < n; i++) {
    const d = [0, 1, 2].map((k) => points[i * 3 + k] - mean[k])
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) cov[a * 3 + b] += (d[a] * d[b]) / n
  }
  const axis1 = principal(cov)
  // Remove the long axis, then find the widest direction across the finger
  const deflated = cov.map((c, idx) => c - eigenvalue(cov, axis1) * axis1[Math.floor(idx / 3)] * axis1[idx % 3])
  const axis2 = principal(deflated)

  const along = new Float32Array(n)
  const across = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const d = [0, 1, 2].map((k) => points[i * 3 + k] - mean[k])
    along[i] = d[0] * axis1[0] + d[1] * axis1[1] + d[2] * axis1[2]
    across[i] = d[0] * axis2[0] + d[1] * axis2[1] + d[2] * axis2[2]
  }
  let lo = Infinity, hi = -Infinity
  for (const a of along) { lo = Math.min(lo, a); hi = Math.max(hi, a) }
  if (hi - lo < 8) return null

  const spread = (from: number, to: number) => {
    let min = Infinity, max = -Infinity
    for (let i = 0; i < n; i++) if (along[i] >= from && along[i] <= to) { min = Math.min(min, across[i]); max = Math.max(max, across[i]) }
    return max > min ? max - min : 0
  }
  // The tip is the end that narrows
  const tipAtHigh = spread(hi - 3, hi) < spread(lo, lo + 3)
  const width = tipAtHigh ? spread(hi - 8, hi - 3) : spread(lo + 3, lo + 8)
  return width > 0 ? width : null
}

/** Dominant eigenvector of a symmetric 3×3 matrix (power iteration). */
function principal(m: number[]): [number, number, number] {
  let v: [number, number, number] = [1, 0.7, 0.3]
  for (let it = 0; it < 60; it++) {
    const w: [number, number, number] = [
      m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
      m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
      m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
    ]
    const len = Math.hypot(...w) || 1
    v = [w[0] / len, w[1] / len, w[2] / len]
  }
  return v
}

const eigenvalue = (m: number[], v: number[]) =>
  v[0] * (m[0] * v[0] + m[1] * v[1] + m[2] * v[2]) +
  v[1] * (m[3] * v[0] + m[4] * v[1] + m[5] * v[2]) +
  v[2] * (m[6] * v[0] + m[7] * v[1] + m[8] * v[2])
