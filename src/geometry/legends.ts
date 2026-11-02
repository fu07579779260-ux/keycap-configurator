import type { CrossSection, Manifold, ManifoldToplevel } from 'manifold-3d'
import type { LegendConfig } from '@/model/config'
import { buildBody, topSurfaceZ, type BodyParams } from './body'
import { brailleDots } from './braille'
import { iconSection } from './icons'
import { toManifold } from './manifold-mesh'
import { surfaceDome } from './markers'
import type { Outline } from './text-outline'

/** Material always left between an engraving and the cavity. */
const MIN_FLOOR = 0.4

/** What a legend does to the keycap: material to add (raised) and/or to remove (engraved). */
export interface LegendSolids {
  add: Manifold | null
  cut: Manifold | null
}

/** Engraving depth limited so at least MIN_FLOOR of the top remains. */
export const engraveDepth = (depth: number, wall: number) => Math.max(0.1, Math.min(depth, wall - MIN_FLOOR))

/**
 * Text, Braille or icon on the top surface. Raised legends and engravings
 * follow the top's shape (dish, dome, tilt) at a constant height/depth.
 * `textOutline` is the traced text (browser only); without it, text adds nothing.
 */
export function buildLegend(
  wasm: ManifoldToplevel,
  p: BodyParams,
  legend: LegendConfig,
  wall: number,
  textOutline?: Outline,
): LegendSolids {
  const { Manifold, CrossSection } = wasm
  const none: LegendSolids = { add: null, cut: null }
  const cx = legend.offsetX
  const cy = p.topSkew + legend.offsetY

  if (legend.type === 'none') return none

  if (legend.type === 'braille') {
    const dots = brailleDots(legend.brailleText, legend.brailleDotSpacing)
    if (dots.length === 0) return none
    const domes = dots.map(([x, y]) =>
      surfaceDome(Manifold, p, cx + x, cy + y, legend.brailleDotDiameter, legend.brailleDotHeight),
    )
    const add = Manifold.union(domes)
    for (const d of domes) d.delete()
    return { add, cut: null }
  }

  // Text and icons: a 2D shape extruded straight up through the top
  let shape: CrossSection
  if (legend.type === 'icon') {
    shape = iconSection(wasm, legend.icon, legend.textSize)
  } else {
    if (!textOutline || textOutline.length === 0) return none
    shape = new CrossSection(textOutline, 'EvenOdd')
  }

  const owned: (Manifold | CrossSection)[] = [shape]
  const own = <T extends Manifold | CrossSection>(m: T) => (owned.push(m), m)
  try {
    const bounds = shape.bounds()
    if (shape.isEmpty()) return none
    // Surface heights over the legend's footprint
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i <= 4; i++) {
      for (let j = 0; j <= 4; j++) {
        const x = cx + bounds.min[0] + ((bounds.max[0] - bounds.min[0]) * i) / 4
        const y = cy + bounds.min[1] + ((bounds.max[1] - bounds.min[1]) * j) / 4
        const z = topSurfaceZ(p, x, y)
        lo = Math.min(lo, z)
        hi = Math.max(hi, z)
      }
    }

    if (legend.textMode === 'raised') {
      // Prism from just under the surface up past the raised height, clipped to "surface + height"
      const bottom = lo - 0.3
      const prism = own(own(shape.extrude(hi + legend.textDepth + 1 - bottom)).translate(cx, cy, bottom))
      const lifted = own(toManifold(wasm, buildBody({ ...p, height: p.height + legend.textDepth })))
      return { add: prism.intersect(lifted), cut: null }
    }

    // Engraved: everything in the prism above "surface − depth" (the part in the air removes nothing)
    const d = engraveDepth(legend.textDepth, wall)
    const bottom = lo - d - 0.1
    const prism = own(own(shape.extrude(hi + 1 - bottom)).translate(cx, cy, bottom))
    const lowered = own(toManifold(wasm, buildBody({ ...p, height: p.height - d })))
    return { add: null, cut: prism.subtract(lowered) }
  } finally {
    for (const m of owned) m.delete()
  }
}
