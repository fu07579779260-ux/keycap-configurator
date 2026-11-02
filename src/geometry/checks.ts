import type { KeycapConfig } from '@/model/config'
import { TECHNOLOGY_DEFAULTS } from '@/model/options'
import type { PrinterPreset } from '@/model/printers'
import { bodyParams } from './body'
import { brailleWidth } from './braille'
import { engraveDepth } from './legends'

export type CheckId =
  | 'wall-thin'
  | 'text-thin'
  | 'engrave-limited'
  | 'marker-edge'
  | 'legend-edge'
  | 'braille-wide'
  | 'tolerance-tight'
  | 'stem-approx'
  | 'translucent-opaque'
  | 'second-colour-unused'

/** "warning": likely to print badly or not fit. "note": worth knowing, not a problem by itself. */
export interface Check {
  id: CheckId
  level: 'warning' | 'note'
  /** Numbers for the message, already formatted (mm with 2 decimals). */
  values: Record<string, string>
}

/** Bold text strokes are roughly this fraction of the font size; icon bars are about 0.11 of their size. */
const TEXT_STROKE = 0.13
const ICON_STROKE = 0.11
/** Typical width of one bold character relative to the font size. */
const CHAR_WIDTH = 0.62

const mm = (v: number) => v.toFixed(2)

/** Materials that let light through; translucency means nothing on the others. */
const CLEAR_MATERIALS = ['clear', 'petg']

/** Things to check before printing, worst first. */
export function printChecks(config: KeycapConfig, printer: PrinterPreset): Check[] {
  const checks: Check[] = []
  const p = bodyParams(config)
  const { size, top, legend, stem, manufacturing } = config
  const tech = TECHNOLOGY_DEFAULTS[manufacturing.technology]
  // The flat part of the top, inside the rounded edge
  const flatHalfX = p.topWidth / 2 - size.topFillet
  const flatHalfY = p.topDepth / 2 - size.topFillet

  if (size.wallThickness < printer.minWall) {
    checks.push({ id: 'wall-thin', level: 'warning', values: { wall: mm(size.wallThickness), min: mm(printer.minWall) } })
  }

  if (stem.fitTolerance < 0) {
    checks.push({
      id: 'tolerance-tight',
      level: manufacturing.technology === 'fdm' ? 'warning' : 'note',
      values: { tolerance: mm(stem.fitTolerance) },
    })
  }

  if (top.form === 'tactile') {
    const halfX = top.markerSize / 2
    // A bar is long across but narrow front to back (same width rule as in markers.ts)
    const halfY = top.markerType === 'bar' ? Math.min(1.6, Math.max(0.8, top.markerSize * 0.25)) / 2 : halfX
    if (Math.abs(top.markerX) + halfX > flatHalfX || Math.abs(top.markerY) + halfY > flatHalfY) {
      checks.push({ id: 'marker-edge', level: 'warning', values: {} })
    }
  }

  if (legend.type === 'text' || legend.type === 'icon') {
    const stroke = legend.textSize * (legend.type === 'text' ? TEXT_STROKE : ICON_STROKE)
    if (stroke < tech.minLegendStroke) {
      const needed = tech.minLegendStroke / (legend.type === 'text' ? TEXT_STROKE : ICON_STROKE)
      checks.push({ id: 'text-thin', level: 'warning', values: { stroke: mm(stroke), min: mm(tech.minLegendStroke), size: mm(needed) } })
    }
    const chars = legend.type === 'text' ? Array.from(legend.text).length : 1
    const halfW = legend.type === 'text' ? (chars * legend.textSize * CHAR_WIDTH) / 2 : legend.textSize / 2
    const halfH = legend.type === 'text' ? legend.textSize * 0.4 : legend.textSize / 2
    if (chars > 0 && (Math.abs(legend.offsetX) + halfW > flatHalfX || Math.abs(legend.offsetY) + halfH > flatHalfY)) {
      checks.push({ id: 'legend-edge', level: 'warning', values: {} })
    }
    if (legend.textMode === 'engraved') {
      const depth = engraveDepth(legend.textDepth, size.wallThickness)
      if (depth < legend.textDepth) checks.push({ id: 'engrave-limited', level: 'note', values: { depth: mm(depth) } })
    }
  }

  if (legend.type === 'braille' && legend.brailleText) {
    const width = brailleWidth(legend.brailleText, legend.brailleDotSpacing) + legend.brailleDotDiameter
    const height = legend.brailleDotSpacing * 2 + legend.brailleDotDiameter
    if (Math.abs(legend.offsetX) + width / 2 > flatHalfX || Math.abs(legend.offsetY) + height / 2 > flatHalfY) {
      checks.push({ id: 'braille-wide', level: 'warning', values: { width: mm(width), room: mm(flatHalfX * 2) } })
    }
  }

  if (stem.type === 'choc-v1' || stem.type === 'alps' || stem.type === 'topre') {
    checks.push({ id: 'stem-approx', level: 'note', values: {} })
  }

  if (manufacturing.translucency > 0 && !CLEAR_MATERIALS.includes(manufacturing.material)) {
    checks.push({ id: 'translucent-opaque', level: 'note', values: {} })
  }

  const hasLegend =
    (legend.type === 'text' && legend.text.trim() !== '') ||
    (legend.type === 'braille' && legend.brailleText !== '') ||
    legend.type === 'icon'
  if (manufacturing.secondColour !== null && top.form !== 'tactile' && !hasLegend) {
    checks.push({ id: 'second-colour-unused', level: 'note', values: {} })
  }

  return checks.sort((a, b) => (a.level === b.level ? 0 : a.level === 'warning' ? -1 : 1))
}
