import type { KeycapConfig } from '@/model/config'
import { footprint } from './dimensions'
import { PROFILE_SHAPES } from './profiles'

/** Plain mesh data (Z-up, mm) so geometry can be tested and exported without three.js. */
export interface MeshData {
  positions: Float32Array
  indices: Uint32Array
}

export interface BodyParams {
  bottomWidth: number
  bottomDepth: number
  topWidth: number
  topDepth: number
  /** Top centre offset towards the back (+y). */
  topSkew: number
  /** Height at the centre of the top. */
  height: number
  /** Degrees; positive raises the back edge. */
  tilt: number
  bottomCornerRadius: number
  topCornerRadius: number
  topFillet: number
}

const CORNER_SEGMENTS = 8
const FILLET_STEPS = 6

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
  }
}

/** Points around a rounded rectangle, counter-clockwise seen from above. Same count for any size. */
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
  for (const [x, y, start] of corners) {
    for (let i = 0; i <= CORNER_SEGMENTS; i++) {
      const a = start + (i / CORNER_SEGMENTS) * (Math.PI / 2)
      points.push([cx + x + r * Math.cos(a), cy + y + r * Math.sin(a)])
    }
  }
  return points
}

/**
 * Solid keycap body: a loft from the bottom footprint to the (tilted) top,
 * with the top edge rounded by `topFillet`. The top is flat for now; top
 * forms (dish, dome…) replace the cap in build step 7.
 */
export function buildBody(p: BodyParams): MeshData {
  const tan = Math.tan((p.tilt * Math.PI) / 180)
  // The fillet can't be larger than the top or than half the height
  const fillet = Math.max(0, Math.min(p.topFillet, p.topWidth / 2 - 0.5, p.topDepth / 2 - 0.5, p.height / 2))
  const topPlaneZ = (y: number, drop: number) => p.height - drop + (y - p.topSkew) * tan

  const rings: [number, number, number][][] = []

  // Bottom edge and the top of the straight wall
  rings.push(roundedRect(p.bottomWidth, p.bottomDepth, p.bottomCornerRadius).map(([x, y]) => [x, y, 0]))
  rings.push(
    roundedRect(p.topWidth, p.topDepth, p.topCornerRadius, 0, p.topSkew).map(([x, y]) => [x, y, topPlaneZ(y, fillet)]),
  )

  // Quarter-circle fillet from the wall into the top
  for (let i = 1; i <= FILLET_STEPS; i++) {
    const phi = (i / FILLET_STEPS) * (Math.PI / 2)
    const inset = fillet * (1 - Math.cos(phi))
    const rise = fillet * Math.sin(phi)
    rings.push(
      roundedRect(p.topWidth - 2 * inset, p.topDepth - 2 * inset, p.topCornerRadius - inset, 0, p.topSkew).map(
        ([x, y]) => [x, y, topPlaneZ(y, fillet - rise)],
      ),
    )
  }

  const n = rings[0].length
  const positions: number[] = []
  const indices: number[] = []
  for (const ring of rings) for (const v of ring) positions.push(...v)

  // Side walls between consecutive rings (outward-facing)
  for (let r = 0; r < rings.length - 1; r++) {
    const a = r * n
    const b = (r + 1) * n
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      indices.push(a + i, a + j, b + j, a + i, b + j, b + i)
    }
  }

  // Top cap: fan from the top centre (the outline is convex)
  const topRing = (rings.length - 1) * n
  const topCentre = positions.length / 3
  positions.push(0, p.topSkew, p.height)
  for (let i = 0; i < n; i++) indices.push(topCentre, topRing + i, topRing + ((i + 1) % n))

  // Bottom cap with its own vertices so the bottom edge stays sharp
  const bottomStart = positions.length / 3
  for (const v of rings[0]) positions.push(...v)
  const bottomCentre = positions.length / 3
  positions.push(0, 0, 0)
  for (let i = 0; i < n; i++) indices.push(bottomCentre, bottomStart + ((i + 1) % n), bottomStart + i)

  return { positions: new Float32Array(positions), indices: new Uint32Array(indices) }
}
