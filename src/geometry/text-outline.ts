/** Closed outlines in mm, centred on (0, 0); y points towards the back. Holes are separate loops (even-odd). */
export type Outline = [number, number][][]

/** Pixels per em when rasterising; 160 px for a 4 mm legend gives 0.025 mm steps. */
const FONT_PX = 160
const FONT = `700 ${FONT_PX}px "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`

const cache = new Map<string, Outline>()

/**
 * Outline of a legend text, drawn with the browser's own fonts (so Chinese
 * works through the system's CJK font) and traced along pixel edges.
 * `size` is the font size in mm. Browser only.
 */
export function traceText(text: string, size: number): Outline {
  const key = `${size}|${text}`
  const hit = cache.get(key)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  const measure = canvas.getContext('2d')!
  measure.font = FONT
  const pad = Math.ceil(FONT_PX * 0.3)
  canvas.width = Math.ceil(measure.measureText(text).width) + pad * 2
  canvas.height = Math.ceil(FONT_PX * 1.5) + pad * 2
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.font = FONT
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#000'
  ctx.fillText(text, pad, canvas.height / 2)

  const { width: w, height: h } = canvas
  const alpha = ctx.getImageData(0, 0, w, h).data
  const filled = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && alpha[(y * w + x) * 4 + 3] >= 128

  const outline = traceGrid(w, h, filled, size / FONT_PX)
  cache.set(key, outline)
  return outline
}

/**
 * Trace the boundary between filled and empty cells of a grid into closed
 * loops, scaled to mm and centred on the ink. Exported for tests.
 */
export function traceGrid(w: number, h: number, filled: (x: number, y: number) => boolean, mmPerCell: number): Outline {
  // Directed boundary edges, keyed by their start point; filled cells stay on the same side
  const next = new Map<number, number[]>()
  const id = (x: number, y: number) => y * (w + 1) + x
  const add = (x0: number, y0: number, x1: number, y1: number) => {
    const from = id(x0, y0)
    const list = next.get(from)
    if (list) list.push(id(x1, y1))
    else next.set(from, [id(x1, y1)])
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!filled(x, y)) continue
      minX = Math.min(minX, x); maxX = Math.max(maxX, x + 1)
      minY = Math.min(minY, y); maxY = Math.max(maxY, y + 1)
      if (!filled(x, y - 1)) add(x, y, x + 1, y)
      if (!filled(x + 1, y)) add(x + 1, y, x + 1, y + 1)
      if (!filled(x, y + 1)) add(x + 1, y + 1, x, y + 1)
      if (!filled(x - 1, y)) add(x, y + 1, x, y)
    }
  }
  if (minX === Infinity) return []

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const loops: Outline = []
  for (const start of [...next.keys()]) {
    while (next.get(start)?.length) {
      const points: number[] = [start]
      let at = start
      for (;;) {
        const list = next.get(at)!
        const to = list.pop()!
        if (list.length === 0) next.delete(at)
        if (to === start) break
        points.push(to)
        at = to
      }
      // Keep only corners (drop points in the middle of straight runs)
      const corners: [number, number][] = []
      for (let i = 0; i < points.length; i++) {
        const prev = points[(i - 1 + points.length) % points.length]
        const cur = points[i]
        const nxt = points[(i + 1) % points.length]
        const [px, py] = [prev % (w + 1), Math.floor(prev / (w + 1))]
        const [x, y] = [cur % (w + 1), Math.floor(cur / (w + 1))]
        const [nx, ny] = [nxt % (w + 1), Math.floor(nxt / (w + 1))]
        if ((x - px) * (ny - y) - (y - py) * (nx - x) !== 0) {
          // Image y runs down; keycap y runs towards the back
          corners.push([(x - cx) * mmPerCell, -(y - cy) * mmPerCell])
        }
      }
      if (corners.length >= 3) loops.push(corners)
    }
  }
  return loops
}
