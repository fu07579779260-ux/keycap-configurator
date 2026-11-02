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

type Extras = { textOutline?: Outline; uploadedBase?: MeshData }

/**
 * Hollow keycap with its stems, as one closed printable mesh (Z-up, mm):
 * outer body − cavity, plus each stem post (trimmed to the inside of the
 * cap) minus its socket widened by the fit tolerance, plus the tactile
 * marker and raised legend, minus an engraved legend.
 * `extras.textOutline` carries traced legend text (browser only);
 * `extras.uploadedBase` an uploaded base model that replaces the main stem.
 */
export function buildKeycap(wasm: ManifoldToplevel, config: KeycapConfig, extras: Extras = {}): MeshData {
  return withSolids(wasm, config, extras, ({ shell, raised, cut }, own) => {
    let all = shell
    if (raised) all = own(all.add(raised))
    if (cut) all = own(all.subtract(cut))
    return fromManifold(keepLargest(all, own))
  })
}

/**
 * The keycap split for two-colour printing: `body` in the main colour and
 * `accent` (marker, raised legend, or the filling of an engraving) in the
 * second colour. The parts touch but don't overlap; together they make
 * the same shape as buildKeycap, except that engravings come back filled
 * (an inlay, flush with the top). `accent` is null when there's nothing to colour.
 */
export function buildKeycapParts(
  wasm: ManifoldToplevel,
  config: KeycapConfig,
  extras: Extras = {},
): { body: MeshData; accent: MeshData | null } {
  return withSolids(wasm, config, extras, ({ shell, raised, cut }, own) => {
    const body = cut ? own(shell.subtract(cut)) : shell
    const pieces: Manifold[] = []
    if (raised) pieces.push(own(raised.subtract(body)))
    if (cut) pieces.push(own(cut.intersect(shell)))
    if (pieces.length === 0) return { body: fromManifold(keepLargest(body, own)), accent: null }

    const accent = own(wasm.Manifold.union(pieces))
    // Drop anything detached from the cap (same rule as the single-colour keycap)
    const keep = keepLargest(own(body.add(accent)), own)
    const keptBody = own(body.intersect(keep))
    const keptAccent = own(accent.intersect(keep))
    return {
      body: fromManifold(keptBody),
      accent: keptAccent.isEmpty() || keptAccent.volume() < 1e-3 ? null : fromManifold(keptAccent),
    }
  })
}

/** Keep only the biggest connected piece (loose dots beyond the top would print separately). */
function keepLargest(m: Manifold, own: (m: Manifold) => Manifold): Manifold {
  const pieces = m.decompose().map(own)
  return pieces.length > 1 ? pieces.reduce((a, b) => (b.volume() > a.volume() ? b : a)) : m
}

/** Shared construction; `finish` gets the pieces and must not keep Manifolds beyond its return. */
function withSolids<T>(
  wasm: ManifoldToplevel,
  config: KeycapConfig,
  extras: Extras,
  finish: (solids: { shell: Manifold; raised: Manifold | null; cut: Manifold | null }, own: (m: Manifold) => Manifold) => T,
): T {
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

    const layout = stemLayout(config)
    // An uploaded base replaces the generated main stem; stabilisers are still generated
    const uploaded = config.stem.type === 'upload' && extras.uploadedBase ? extras.uploadedBase : null
    const stems = [
      ...(uploaded ? [] : [{ at: layout.main, shape: mainStemShape(config) }]),
      ...layout.stabilisers.map((at) => ({ at, shape: stabiliserStemShape(config) })),
    ]

    if (uploaded) {
      // Keep the upload within the cap and the space straight below it (nothing poking out sideways or on top)
      const below = own(own(Manifold.cube([p.bottomWidth, p.bottomDepth, 30], true)).translate(0, 0, -15))
      const allowed = own(outer.add(below))
      const base = own(own(toManifold(wasm, uploaded)).intersect(allowed))
      shell = own(shell.add(base))
    }
    const tolerance = config.stem.fitTolerance
    const postHeight = p.height + 10

    for (const { at: [x, y], shape } of stems) {
      // Post from just above the bottom edge up into the top, trimmed to the outer body
      const post = own(own(stemPost(Manifold, shape, postHeight)).translate(x, y, STEM_INSET))
      shell = own(shell.add(own(post.intersect(outer))))
      const socket = own(own(stemSocket(Manifold, shape, tolerance)).translate(x, y, STEM_INSET))
      shell = own(shell.subtract(socket))
    }

    // Raised material (marker, raised legend) and the engraving, applied by `finish`
    const marker = buildMarker(Manifold, p, config.top)
    const legend = buildLegend(wasm, p, config.legend, wall, extras.textOutline)
    const raisedParts = [marker, legend.add].filter((m): m is Manifold => m !== null).map(own)
    const raised = raisedParts.length === 0 ? null : raisedParts.length === 1 ? raisedParts[0] : own(Manifold.union(raisedParts))
    const cut = legend.cut ? own(legend.cut) : null

    return finish({ shell, raised, cut }, own)
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
