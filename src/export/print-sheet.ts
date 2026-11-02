import type { Check } from '@/geometry/checks'
import { stabiliserSpacing } from '@/geometry/stems'
import { fill } from '@/i18n/language'
import { STRINGS } from '@/i18n/strings'
import type { KeycapConfig } from '@/model/config'
import { profileHasRows, type Material, type Technology } from '@/model/options'
import type { PrinterPreset } from '@/model/printers'

/**
 * Content of the PDF print sheet, in English (the PDF's built-in fonts
 * can't draw Chinese). Kept separate from the PDF drawing so it can be tested.
 */
export interface SheetContent {
  title: string
  fileName: string
  date: string
  sections: { heading: string; rows: [string, string][] }[]
  checks: string[]
}

/** Grams per cm³, for the material estimate. */
export const DENSITY: Record<Material, number> = {
  pla: 1.24,
  petg: 1.27,
  tpu: 1.21,
  standard: 1.15,
  tough: 1.17,
  clear: 1.15,
  pa12: 1.01,
}

/** Starting print settings per technology (same as docs/test-print.md). */
const PRINT_HINTS: Record<Technology, { orientation: string; layer: string; supports: string; after: string }> = {
  fdm: {
    orientation: 'Top face down on the plate, stem up',
    layer: '0.12 mm or finer, 0.4 mm nozzle, 3+ walls',
    supports: 'None',
    after: 'Remove any elephant-foot flare from the top edge',
  },
  sla: {
    orientation: 'Tilted 30–45°, top facing up and away from the plate',
    layer: '0.05 mm',
    supports: 'Light, on the side walls only; none on the top or in the stem',
    after: 'Wash and fully cure before testing the fit',
  },
  sls: {
    orientation: 'Any (decided by the print service)',
    layer: 'Service default',
    supports: 'None',
    after: 'Blow powder out of the stem socket',
  },
}

const PROFILE_NAMES = { oem: 'OEM', cherry: 'Cherry', sa: 'SA', dsa: 'DSA', xda: 'XDA', mt3: 'MT3' }
const STEM_NAMES = {
  mx: 'Cherry MX (and compatibles)',
  'choc-v1': 'Kailh Choc V1',
  'choc-v2': 'Kailh Choc V2',
  alps: 'Alps / Matias',
  topre: 'Topre (approximate)',
  custom: 'Custom cross',
  upload: 'Uploaded base',
}

const mm = (v: number) => `${v.toFixed(2)} mm`
/** The PDF's standard font only covers Latin-1; swap common symbols and show anything else as "?". */
export const latin1 = (s: string) =>
  s.replace(/[–—]/g, '-').replace(/≈/g, '~').replace(/[‘’]/g, "'").replace(/[^ -ÿ]/g, '?')
const en = STRINGS.en

function topDescription(config: KeycapConfig): string {
  const { top } = config
  switch (top.form) {
    case 'concave':
      return `Concave (${top.dishShape === 'auto' ? 'profile dish' : top.dishShape}), ${mm(top.dishDepth)} deep`
    case 'convex':
      return `Convex, ${mm(top.domeHeight)} dome`
    case 'angled':
      return `Angled ${top.slopeAngle}°, ${top.slopeDirection} side lower`
    case 'tactile':
      return `Tactile ${top.markerType}, ${mm(top.markerSize)} wide, ${mm(top.markerHeight)} high`
    default:
      return 'Flat'
  }
}

function legendDescription(config: KeycapConfig): string {
  const { legend } = config
  switch (legend.type) {
    case 'text':
      return `"${latin1(legend.text)}" ${legend.textMode}, ${mm(legend.textSize)} size, ${mm(legend.textDepth)} ${legend.textMode === 'raised' ? 'high' : 'deep'}`
    case 'braille':
      return `Braille "${latin1(legend.brailleText)}", dots ${mm(legend.brailleDotDiameter)} / ${mm(legend.brailleDotHeight)} high`
    case 'icon':
      return `Icon "${legend.icon}" ${legend.textMode}, ${mm(legend.textSize)}`
    default:
      return 'None'
  }
}

export function sheetContent(
  config: KeycapConfig,
  printer: PrinterPreset,
  measured: { width: number; depth: number; height: number; volume: number; accentVolume: number },
  checks: Check[],
  fileName: string,
  date = new Date(),
): SheetContent {
  const { size, stem, manufacturing: m } = config
  const hint = PRINT_HINTS[m.technology]
  const material = m.material as Material
  const grams = ((measured.volume + measured.accentVolume) / 1000) * DENSITY[material]
  const spacing = size.stabilisers ? stabiliserSpacing(size.widthU) : null

  return {
    title: 'Keycap print sheet',
    fileName,
    // Local date (toISOString would give yesterday's date in the morning in China)
    date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
    sections: [
      {
        heading: 'Design',
        rows: [
          ['Profile', `${PROFILE_NAMES[size.profile]}${profileHasRows(size.profile) ? ` ${size.row}` : ''}`],
          ['Width', `${size.widthU}u`],
          ['Size (W × D × H)', `${measured.width.toFixed(2)} × ${measured.depth.toFixed(2)} × ${measured.height.toFixed(2)} mm`],
          ['Top', topDescription(config)],
          ['Legend', legendDescription(config)],
          ['Top edge rounding', mm(size.topFillet)],
        ],
      },
      {
        heading: 'Fit',
        rows: [
          ['Switch mount', STEM_NAMES[stem.type]],
          ['Fit tolerance', `${stem.fitTolerance >= 0 ? '+' : ''}${mm(stem.fitTolerance)}`],
          ['Wall thickness', mm(size.wallThickness)],
          ['Stabilisers', spacing === null ? 'None' : `2 × MX-style, ${spacing} mm apart`],
        ],
      },
      {
        heading: 'Print',
        rows: [
          ['Technology', m.technology.toUpperCase()],
          ['Printer', printer.id === 'generic' ? 'Generic' : latin1(printer.name)],
          ['Material', en[`material.${material}`]],
          ['Colour', m.secondColour ? `${m.mainColour} + ${m.secondColour} (two parts)` : m.mainColour],
          ['Orientation', hint.orientation],
          ['Layer height', hint.layer],
          ['Supports', hint.supports],
          ['After printing', hint.after],
          ['Material estimate', `${((measured.volume + measured.accentVolume) / 1000).toFixed(2)} cm³ ≈ ${grams.toFixed(1)} g`],
        ],
      },
    ],
    checks: checks.map((c) => `${c.level === 'warning' ? 'Warning' : 'Note'}: ${fill(en[`check.${c.id}`], c.values)}`),
  }
}

/** Draw the sheet as an A4 PDF. `image` is a JPEG data URL of the 3D view (optional). */
export async function sheetPdf(content: SheetContent, image: string | null): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const left = 18
  const right = 192
  let y = 20

  pdf.setFont('helvetica', 'bold').setFontSize(18).text(content.title, left, y)
  pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(85)
  pdf.text(latin1(`${content.fileName}   ·   ${content.date}`), left, (y += 6))
  pdf.setDrawColor(17).setLineWidth(0.4).line(left, (y += 3), right, y)

  if (image) {
    const { width, height } = pdf.getImageProperties(image)
    const w = 80
    const h = Math.min(60, (height / width) * w)
    pdf.addImage(image, 'JPEG', right - w, y + 4, w, h)
  }

  y += 10
  pdf.setTextColor(17)
  for (const section of content.sections) {
    pdf.setFont('helvetica', 'bold').setFontSize(11).text(section.heading.toUpperCase(), left, y)
    y += 5
    for (const [label, value] of section.rows) {
      // Leave room for the picture beside the first section
      const valueWidth = image && y < 95 ? 50 : 120
      const lines = pdf.splitTextToSize(latin1(value), valueWidth) as string[]
      pdf.setFont('helvetica', 'normal').setFontSize(9).setTextColor(85).text(label, left, y)
      pdf.setTextColor(17).text(lines, left + 42, y)
      y += 4.6 * lines.length
    }
    y += 4
  }

  pdf.setFont('helvetica', 'bold').setFontSize(11).text('PRINT CHECK', left, y)
  y += 5
  pdf.setFont('helvetica', 'normal').setFontSize(9)
  const checks = content.checks.length ? content.checks : ['No problems found for this printer.']
  for (const line of checks) {
    const lines = pdf.splitTextToSize(latin1(line), right - left) as string[]
    pdf.text(lines, left, y)
    y += 4.6 * lines.length
  }

  pdf.setFontSize(8).setTextColor(120).text('Generated by Keycap Configurator · units mm · test-print one key before a set', left, 285)
  return pdf.output('blob')
}
