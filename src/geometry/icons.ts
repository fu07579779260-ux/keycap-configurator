import type { CrossSection, ManifoldToplevel } from 'manifold-3d'
import type { Icon } from '@/model/options'

type Pt = [number, number]

/** Icons are drawn in a 10 × 10 box centred on (0, 0), then scaled to the legend size. */
const rect = (x0: number, y0: number, x1: number, y1: number): Pt[] => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
const rotatePts = (pts: Pt[], deg: number): Pt[] => {
  const a = (deg * Math.PI) / 180
  return pts.map(([x, y]) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)])
}
const movePts = (pts: Pt[], dx: number, dy: number): Pt[] => pts.map(([x, y]) => [x + dx, y + dy])

const ARROW_UP: Pt[] = [[0, 5], [4.2, 0.8], [1.4, 0.8], [1.4, -5], [-1.4, -5], [-1.4, 0.8], [-4.2, 0.8]]
const SPEAKER: Pt[] = [[-5, -1.6], [-3, -1.6], [-0.4, -4], [-0.4, 4], [-3, 1.6], [-5, 1.6]]
const BAR = rect(-2, -0.55, 2, 0.55)

/** Outline polygons (unioned with the non-zero rule) and holes for each icon. */
function iconParts(icon: Icon): { fill: Pt[][]; holes?: Pt[][]; outline?: boolean } {
  switch (icon) {
    case 'arrow-up':
      return { fill: [ARROW_UP] }
    case 'arrow-down':
      return { fill: [rotatePts(ARROW_UP, 180)] }
    case 'arrow-left':
      return { fill: [rotatePts(ARROW_UP, 90)] }
    case 'arrow-right':
      return { fill: [rotatePts(ARROW_UP, -90)] }
    case 'backspace':
      return { fill: [rotatePts(ARROW_UP, 90), rect(-5, -0.6, 5, 0.6)] }
    case 'tab':
      // Shortened right arrow (−5 … 3.6) against a bar at the right edge
      return { fill: [movePts(rotatePts(ARROW_UP, -90).map(([x, y]) => [x * 0.86, y] as Pt), -0.7, 0), rect(4.1, -4, 5, 4)] }
    case 'shift':
      // Hollow up arrow
      return { fill: [ARROW_UP], outline: true }
    case 'enter':
      return {
        fill: [rect(3.2, -1.9, 4.6, 4.5), rect(-2.2, -1.9, 4.6, -0.5), [[-5, -1.2], [-1.8, 1.8], [-1.8, -4.2]]],
      }
    case 'space':
      return { fill: [rect(-5, -3, 5, -1.8), rect(-5, -3, -3.8, 0.5), rect(3.8, -3, 5, 0.5)] }
    case 'home':
      return {
        fill: [[[0, 5], [5, 0.6], [3.4, 0.6], [3.4, -5], [-3.4, -5], [-3.4, 0.6], [-5, 0.6]]],
        holes: [rect(-1.1, -5.1, 1.1, -1.4)],
      }
    case 'esc':
      // ⎋: a broken circle with an arrow leaving towards the top left
      return {
        fill: [
          circle(0.6, -0.6, 4.4),
          movePts(rotatePts(ARROW_UP.map(([x, y]) => [x * 0.55, y * 0.55] as Pt), 45), -2.2, 2.2),
        ],
        holes: [circle(0.6, -0.6, 3.2), rect(-5, 0.2, -0.4, 5)],
      }
    case 'mute':
      return { fill: [SPEAKER, movePts(rotatePts(BAR, 45), 3, 0), movePts(rotatePts(BAR, -45), 3, 0)] }
    case 'volume-up':
      return { fill: [SPEAKER, movePts(BAR, 2.9, 0), movePts(rotatePts(BAR, 90), 2.9, 0)] }
    case 'volume-down':
      return { fill: [SPEAKER, movePts(BAR, 2.9, 0)] }
  }
}

function circle(cx: number, cy: number, r: number, n = 48): Pt[] {
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * 2 * Math.PI), cy + r * Math.sin((i / n) * 2 * Math.PI)])
}

/** Make a polygon counter-clockwise so the 'Positive' fill rule counts it. */
function ccw(pts: Pt[]): Pt[] {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i]
    const [x1, y1] = pts[(i + 1) % pts.length]
    area += x0 * y1 - x1 * y0
  }
  return area < 0 ? [...pts].reverse() : pts
}

/** The icon as a 2D cross-section, `size` mm across. Caller deletes the result. */
export function iconSection(wasm: ManifoldToplevel, icon: Icon, size: number): CrossSection {
  const { CrossSection } = wasm
  const parts = iconParts(icon)
  const owned: CrossSection[] = []
  const own = (s: CrossSection) => (owned.push(s), s)
  try {
    let shape = own(CrossSection.union(parts.fill.map((p) => own(new CrossSection([ccw(p)], 'Positive')))))
    if (parts.outline) shape = own(shape.subtract(own(shape.offset(-1.1, 'Miter'))))
    for (const hole of parts.holes ?? []) shape = own(shape.subtract(own(new CrossSection([ccw(hole)], 'Positive'))))
    return shape.scale(size / 10)
  } finally {
    for (const s of owned) s.delete()
  }
}
