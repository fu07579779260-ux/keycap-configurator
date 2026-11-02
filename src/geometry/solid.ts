import type { Manifold, ManifoldToplevel } from 'manifold-3d'
import type { KeycapConfig } from '@/model/config'
import { bodyParams, buildBody, type BodyParams, type MeshData } from './body'
import { buildLegend } from './legends'
import { fromManifold, toManifold } from './manifold-mesh'
import { buildMarker } from './markers'
import type { Outline } from './text-outline'
import { mainStemShape, stabiliserStemShape, STEM_INSET, type StemShape } from './stem-shapes'
import { stemLayout } from './stems'

/** How far the cavity pokes out below the bottom so the boolean cut is clean. */
const CUT_MARGIN = 1

/** The cavity: the outer body shrunk by the wall thickness on every side and the top. */
export function cavityParams(p: BodyParams, wall: number): BodyParams {
  const shrink = 2 * wall
  return {
    ...p,
    bottomWidth: p.bottomWidth - shrink,
    bottomDepth: p.bottomDepth - shrink,
    topWidth: Math.max(1, p.topWidth - shrink),
    topDepth: Math.max(1, p.topDepth - shrink),
    // Shifted down by CUT_MARGIN afterwards, so add it here to keep the top thickness
    height: p.height - wall + CUT_MARGIN,
    bottomCornerRadius: Math.max(0.2, p.bottomCornerRadius - wall),
    topCornerRadius: Math.max(0.2, p.topCornerRadius - wall),
    topFillet: Math.max(0, p.topFillet - wall),
  }
}

/**
 * Hollow keycap with its stems, as a closed printable mesh (Z-up, mm):
 * outer body − cavity, plus the tactile marker, plus each stem post
 * (trimmed to the inside of the cap) minus its socket, widened by the
 * fit tolerance, then the legend raised or engraved.
 * `extras.textOutline` carries traced legend text (browser only).
 */
export function buildKeycap(wasm: ManifoldToplevel, config: KeycapConfig, extras: { textOutline?: Outline } = {}): MeshData {
  const { Manifold } = wasm
  // Every Manifold lives in WASM memory and must be freed
  const owned: Manifold[] = []
  const own = (m: Manifold) => (owned.push(m), m)

  try {
    const p = bodyParams(config)
    // Keep at least a little cavity, whatever the wall setting
    const wall = Math.min(config.size.wallThickness, p.topWidth / 2 - 0.5, p.height / 2)
    const outer = own(toManifold(wasm, buildBody(p)))
    const cavity = own(own(toManifold(wasm, buildBody(cavityParams(p, wall)))).translate(0, 0, -CUT_MARGIN))
    let shell = own(outer.subtract(cavity))

    const marker = buildMarker(Manifold, p, config.top)
    if (marker) shell = own(shell.add(own(marker)))

    const layout = stemLayout(config)
    const stems = [
      { at: layout.main, shape: mainStemShape(config) },
      ...layout.stabilisers.map((at) => ({ at, shape: stabiliserStemShape(config) })),
    ]
    const tolerance = config.stem.fitTolerance
    const postHeight = p.height + 10

    for (const { at: [x, y], shape } of stems) {
      // Post from just above the bottom edge up into the top, trimmed to the outer body
      const post = own(own(stemPost(Manifold, shape, postHeight)).translate(x, y, STEM_INSET))
      shell = own(shell.add(own(post.intersect(outer))))
      const socket = own(own(stemSocket(Manifold, shape, tolerance)).translate(x, y, STEM_INSET))
      shell = own(shell.subtract(socket))
    }

    // Legend last, so an engraving also cuts through where a stem meets the top
    const legend = buildLegend(wasm, p, config.legend, wall, extras.textOutline)
    if (legend.add) shell = own(shell.add(own(legend.add)))
    if (legend.cut) shell = own(shell.subtract(own(legend.cut)))

    // Dots or markers placed beyond the top would print as loose pieces: keep only the keycap
    const pieces = shell.decompose().map(own)
    if (pieces.length > 1) shell = pieces.reduce((a, b) => (b.volume() > a.volume() ? b : a))

    return fromManifold(shell)
  } finally {
    for (const m of owned) m.delete()
  }
}

/** Solid post around the socket, standing on z = 0. */
function stemPost(M: typeof Manifold, shape: StemShape, height: number): Manifold {
  if (shape.kind === 'cross') return M.cylinder(height, shape.outer / 2, shape.outer / 2, 40)
  const box = M.cube([shape.block[0], shape.block[1], height], true)
  const lifted = box.translate(0, 0, height / 2)
  box.delete()
  return lifted
}

/** Socket cut into the post, open at the bottom. Tolerance widens every slot. */
function stemSocket(M: typeof Manifold, shape: StemShape, tolerance: number): Manifold {
  const tall = shape.depth + CUT_MARGIN
  // Boxes centred in x/y, running from z = −CUT_MARGIN to the socket depth
  const slot = (sx: number, sy: number, cx = 0) => {
    const box = M.cube([Math.max(0.1, sx + tolerance), Math.max(0.1, sy + tolerance), tall], true)
    const placed = box.translate(cx, 0, tall / 2 - CUT_MARGIN)
    box.delete()
    return placed
  }
  const parts =
    shape.kind === 'cross'
      ? [slot(shape.length, shape.widthH), slot(shape.widthV, shape.length)]
      : shape.centres.map((cx) => slot(shape.slot[0], shape.slot[1], cx))
  const socket = M.union(parts)
  for (const part of parts) part.delete()
  return socket
}
