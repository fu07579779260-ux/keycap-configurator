/** Geometry for measuring a fingertip in a photo. All points are in image pixels. */
export type Point = { x: number; y: number }

/** ID-1 card (bank card, ID card): long edge in mm. */
export const CARD_LONG_EDGE = 85.6

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Pixels per mm, from two points marking a known length. */
export function pixelsPerMm(a: Point, b: Point, lengthMm: number): number {
  return distance(a, b) / lengthMm
}

/**
 * Where to measure the fingertip: halfway between the last knuckle (DIP)
 * and the tip, across the finger. Returns the centre and the unit
 * direction across the finger.
 */
export function acrossFingertip(dip: Point, tip: Point): { centre: Point; across: Point } {
  const centre = { x: (dip.x + tip.x) / 2, y: (dip.y + tip.y) / 2 }
  const len = distance(dip, tip) || 1
  // Perpendicular to the finger's direction
  return { centre, across: { x: -(tip.y - dip.y) / len, y: (tip.x - dip.x) / len } }
}

/**
 * Find the finger's two edges along a line through `centre`: walk out in
 * both directions until the colour clearly differs from the skin at the
 * centre. `colourAt` returns [r, g, b] (0–255) or null outside the image.
 */
export function findEdges(
  colourAt: (p: Point) => [number, number, number] | null,
  centre: Point,
  across: Point,
  maxPx: number,
  threshold = 60,
): [Point, Point] | null {
  // Reference skin colour: average of a few pixels around the centre
  const samples = [-2, -1, 0, 1, 2]
    .map((d) => colourAt({ x: centre.x + across.x * d, y: centre.y + across.y * d }))
    .filter((c): c is [number, number, number] => c !== null)
  if (samples.length === 0) return null
  const skin = [0, 1, 2].map((k) => samples.reduce((s, c) => s + c[k], 0) / samples.length)
  const differs = (c: [number, number, number] | null) =>
    c === null || Math.hypot(c[0] - skin[0], c[1] - skin[1], c[2] - skin[2]) > threshold

  const walk = (sign: 1 | -1): Point | null => {
    for (let d = 3; d <= maxPx; d++) {
      const p = { x: centre.x + across.x * d * sign, y: centre.y + across.y * d * sign }
      const next = { x: p.x + across.x * sign, y: p.y + across.y * sign }
      // Two different pixels in a row, so a single noisy pixel isn't an edge
      if (differs(colourAt(p)) && differs(colourAt(next))) return p
    }
    return null
  }

  const a = walk(-1)
  const b = walk(1)
  return a && b ? [a, b] : null
}
