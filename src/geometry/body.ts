import type { KeycapConfig } from '@/model/config'
import type { SlopeDirection } from '@/model/options'
import { footprint } from './dimensions'
import { PROFILE_SHAPES } from './profiles'

/** Plain mesh data (Z-up, mm) so geometry can be tested and exported without three.js. */
export interface MeshData {
  positions: Float32Array
  indices: Uint32Array
}

/** Shape of the top surface, added on top of the profile's (tilted) top plane. */
export type TopShape =
  | { kind: 'flat' }
  | { kind: 'cylindrical' | 'spherical'; depth: number }
  | { kind: 'dome'; height: number }
  | { kind: 'slope'; angle: number; direction: SlopeDirection }

export interface BodyParams {
  bottomWidth: number
  bottomDepth: number
  topWidth: number
  topDepth: number
  /** Top centre offset towards the back (+y). */
  topSkew: number
  /** Height at the centre of the top plane (before the top shape). */
  height: number
  /** Degrees; positive raises the back edge. */
  tilt: number
  bottomCornerRadius: number
  topCornerRadius: number
  topFillet: number
  top: TopShape
}

const CORNER_SEGMENTS = 8
const EDGE_SEGMENTS = 12
const FILLET_STEPS = 6
const CAP_RINGS = 10

/** Turn the chosen top form into a surface shape. Tactile keeps a flat top; its marker is added separately. */
export function topShape(config: KeycapConfig): TopShape {
  const { top } = config
  switch (top.form) {
    case 'concave': {
      const kind = top.dishShape === 'auto' ? PROFILE_SHAPES[config.size.profile].dish : top.dishShape
      return { kind, depth: top.dishDepth }
    }
    case 'convex':
      return { kind: 'dome', height: top.domeHeight }
    case 'angled':
      return { kind: 'slope', angle: top.slopeAngle, direction: top.slopeDirection }
    default:
      return { kind: 'flat' }
  }
}

/** Resolve the body dimensions for a design. */
export function bodyParams(config: KeycapConfig): BodyParams {
  const shape = PROFILE_SHAPES[config.size.profile]
  const row = shape.rows[config.size.row]
  const base = footprint(config.size.widthU)
  return {
    bottomWidth: base.width,
    bottomDepth: base.depth,
    topWidth: base.width - shape.topInsetX,
    topDepth: base.depth - shape.topInsetY,
    // The top must not overhang the base at the back
    topSkew: Math.min(shape.topSkew, shape.topInsetY / 2),
    height: config.size.heightOverride ?? row.height,
    tilt: row.tilt,
    bottomCornerRadius: shape.bottomCornerRadius,
    topCornerRadius: shape.topCornerRadius,
    topFillet: config.size.topFillet,
    top: topShape(config),
  }
}

/**
 * Points around a rounded rectangle, counter-clockwise seen from above.
 * Straight edges are subdivided so curved top shapes can bend them.
 * The point count is the same for any size, so rings can be joined.
 */
export function roundedRect(width: number, depth: number, radius: number, cx = 0, cy = 0): [number, number][] {
  const r = Math.max(0.01, Math.min(radius, width / 2 - 0.01, depth / 2 - 0.01))
  const hx = width / 2 - r
  const hy = depth / 2 - r
  const corners: [number, number, number][] = [
    [hx, -hy, -Math.PI / 2],
    [hx, hy, 0],
    [-hx, hy, Math.PI / 2],
    [-hx, -hy, Math.PI],
  ]
  const points: [number, number][] = []
  corners.forEach(([x, y, start], c) => {
    for (let i = 0; i <= CORNER_SEGMENTS; i++) {
      const a = start + (i / CORNER_SEGMENTS) * (Math.PI / 2)
      points.push([cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)])
    }
    // Straight edge from the end of this corner to the start of the next one
    const [nx, ny, nStart] = corners[(c + 1) % 4]
    const end = points[points.length - 1]
    const next: [number, number] = [cx + nx + r * Math.cos(nStart), cy + ny + r * Math.sin(nStart)]
    for (let i = 1; i < EDGE_SEGMENTS; i++) {
      const t = i / EDGE_SEGMENTS
      points.push([end[0] + (next[0] - end[0]) * t, end[1] + (next[1] - end[1]) * t])
    }
  })
  return points
}

/** Height added by the top shape at (x, y); zero for a flat top. */
function topOffset(p: BodyParams, x: number, y: number): number {
  // Position across the top, -1 … 1 in each direction
  const u = Math.max(-1, Math.min(1, x / (p.topWidth / 2)))
  const v = Math.max(-1, Math.min(1, (y - p.topSkew) / (p.topDepth / 2)))
  const top = p.top
  switch (top.kind) {
    case 'flat':
      return 0
    case 'cylindrical':
      // Curved across the width, straight front to back (front and back edges dip)
      return -top.depth * (1 - u * u)
    case 'spherical':
      // Bowl: deepest in the middle, zero at the corners
      return -top.depth * (1 - (u * u + v * v) / 2)
    case 'dome':
      return top.height * (1 - (u * u + v * v) / 2)
    case 'slope': {
      // Tilt around the top centre; "direction" is the side that ends up lower
      const tan = Math.tan((top.angle * Math.PI) / 180)
      const along = { front: y - p.topSkew, back: p.topSkew - y, left: x, right: -x }[top.direction]
      return tan * along
    }
  }
}

/** Height of the finished top surface at (x, y): profile height, row tilt and top shape. */
export function topSurfaceZ(p: BodyParams, x: number, y: number): number {
  const tan = Math.tan((p.tilt * Math.PI) / 180)
  return p.height + (y - p.topSkew) * tan + topOffset(p, x, y)
}

/**
 * Solid keycap body: a loft from the bottom footprint to the (tilted) top,
 * a quarter-circle fillet into the top, and a top surface shaped by the top
 * form. The top shape also bends the upper wall edge, as on real dished keycaps.
 */
export function buildBody(p: BodyParams): MeshData {
  // The fillet can't be larger than the top or than half the height
  const fillet = Math.max(0, Math.min(p.topFillet, p.topWidth / 2 - 0.5, p.topDepth / 2 - 0.5, p.height / 2))
  const surfaceZ = (x: number, y: number, drop: number) => topSurfaceZ(p, x, y) - drop

  const rings: [number, number, number][][] = []

  // Bottom edge and the top of the straight wall
  rings.push(roundedRect(p.bottomWidth, p.bottomDepth, p.bottomCornerRadius).map(([x, y]) => [x, y, 0]))
  rings.push(
    roundedRect(p.topWidth, p.topDepth, p.topCornerRadius, 0, p.topSkew).map(([x, y]) => [x, y, surfaceZ(x, y, fillet)]),
  )

  // Quarter-circle fillet from the wall into the top
  for (let i = 1; i <= FILLET_STEPS; i++) {
    const phi = (i / FILLET_STEPS) * (Math.PI / 2)
    const inset = fillet * (1 - Math.cos(phi))
    const rise = fillet * Math.sin(phi)
    rings.push(
      roundedRect(p.topWidth - 2 * inset, p.topDepth - 2 * inset, p.topCornerRadius - inset, 0, p.topSkew).map(
        ([x, y]) => [x, y, surfaceZ(x, y, fillet - rise)],
      ),
    )
  }

  // Top surface: the last fillet ring shrunk step by step towards the centre
  const edge = rings[rings.length - 1]
  for (let k = 1; k < CAP_RINGS; k++) {
    const s = 1 - k / CAP_RINGS
    rings.push(
      edge.map(([x, y]) => {
        const sx = x * s
        const sy = p.topSkew + (y - p.topSkew) * s
        return [sx, sy, surfaceZ(sx, sy, 0)]
      }),
    )
  }

  const n = rings[0].length
  const positions: number[] = []
  const indices: number[] = []
  for (const ring of rings) for (const v of ring) positions.push(...v)

  // Strips between consecutive rings (outward/upward-facing)
  for (let r = 0; r < rings.length - 1; r++) {
    const a = r * n
    const b = (r + 1) * n
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      indices.push(a + i, a + j, b + j, a + i, b + j, b + i)
    }
  }

  // Close the top with a fan around the centre point
  const innermost = (rings.length - 1) * n
  const topCentre = positions.length / 3
  positions.push(0, p.topSkew, surfaceZ(0, p.topSkew, 0))
  for (let i = 0; i < n; i++) indices.push(topCentre, innermost + i, innermost + ((i + 1) % n))

  // Bottom cap with its own vertices so the bottom edge stays sharp
  const bottomStart = positions.length / 3
  for (const v of rings[0]) positions.push(...v)
  const bottomCentre = positions.length / 3
  positions.push(0, 0, 0)
  for (let i = 0; i < n; i++) indices.push(bottomCentre, bottomStart + ((i + 1) % n), bottomStart + i)

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) }
}
