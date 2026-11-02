import {
  DEFAULT_CONFIG,
  MAX_BRAILLE_LENGTH,
  MAX_TEXT_LENGTH,
  RANGES,
  type KeycapConfig,
  type NumberRange,
  type Section,
} from './config'
import {
  DISH_SHAPES,
  ICONS,
  isOneOf,
  LEGEND_TYPES,
  MARKER_TYPES,
  MATERIALS,
  PRINTERS,
  PROFILES,
  ROWS,
  SLOPE_DIRECTIONS,
  STEM_TYPES,
  TECHNOLOGIES,
  TECHNOLOGY_DEFAULTS,
  TEXT_MODES,
  TOP_FORMS,
} from './options'

/** Clamp to the range and snap to its step (measured from min). */
export function clampToRange(value: number, r: NumberRange): number {
  const clamped = Math.min(r.max, Math.max(r.min, value))
  const snapped = r.min + Math.round((clamped - r.min) / r.step) * r.step
  // Remove float noise such as 1.2000000000000002
  return Math.min(r.max, Number(snapped.toFixed(6)))
}

const ENUMS: Partial<Record<string, readonly string[]>> = {
  'stem.type': STEM_TYPES,
  'size.profile': PROFILES,
  'size.row': ROWS,
  'top.form': TOP_FORMS,
  'top.dishShape': DISH_SHAPES,
  'top.slopeDirection': SLOPE_DIRECTIONS,
  'top.markerType': MARKER_TYPES,
  'legend.type': LEGEND_TYPES,
  'legend.textMode': TEXT_MODES,
  'legend.icon': ICONS,
  'manufacturing.technology': TECHNOLOGIES,
}

const HEX_COLOUR = /^#[0-9a-f]{6}$/i

/** Cut by characters (code points), not UTF-16 units, so emoji and CJK aren't split. */
const truncate = (s: string, max: number) => Array.from(s).slice(0, max).join('')

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

function sanitizeField(section: Section, key: string, input: unknown, fallback: unknown): unknown {
  const path = `${section}.${key}`
  const range = (RANGES[section] as Record<string, NumberRange | undefined>)[key]

  if (range) {
    if (input === null && fallback === null) return null // nullable number such as heightOverride
    return typeof input === 'number' && Number.isFinite(input) ? clampToRange(input, range) : fallback
  }
  const options = ENUMS[path]
  if (options) return isOneOf(options, input) ? input : fallback
  if (typeof fallback === 'boolean') return typeof input === 'boolean' ? input : fallback

  switch (path) {
    case 'legend.text':
      return typeof input === 'string' ? truncate(input, MAX_TEXT_LENGTH) : fallback
    case 'legend.brailleText':
      return typeof input === 'string' ? truncate(input, MAX_BRAILLE_LENGTH) : fallback
    case 'stem.uploadName':
      return typeof input === 'string' && input.length > 0 ? input.slice(0, 200) : null
    case 'manufacturing.mainColour':
      return typeof input === 'string' && HEX_COLOUR.test(input) ? input.toLowerCase() : fallback
    case 'manufacturing.secondColour':
      return typeof input === 'string' && HEX_COLOUR.test(input) ? input.toLowerCase() : null
    default:
      // printer and material are checked against the technology below
      return typeof input === 'string' ? input : fallback
  }
}

/**
 * Turn any input (saved file, share link, older version) into a valid config.
 * Unknown keys are dropped, missing or invalid values fall back to the defaults,
 * and numbers are clamped into their ranges.
 */
export function sanitizeConfig(input: unknown): KeycapConfig {
  const source = isRecord(input) ? input : {}
  const out = {} as Record<Section, Record<string, unknown>>

  for (const section of Object.keys(DEFAULT_CONFIG) as Section[]) {
    const defaults = DEFAULT_CONFIG[section] as unknown as Record<string, unknown>
    const given = isRecord(source[section]) ? source[section] : {}
    out[section] = {}
    for (const key of Object.keys(defaults)) {
      out[section][key] = sanitizeField(section, key, given[key], defaults[key])
    }
  }

  const config = out as unknown as KeycapConfig
  const m = config.manufacturing
  if (!PRINTERS[m.technology].includes(m.printer) && !m.printer.startsWith('user:')) m.printer = 'generic'
  if (!isOneOf(MATERIALS[m.technology], m.material)) m.material = TECHNOLOGY_DEFAULTS[m.technology].material
  if (config.stem.type !== 'upload') config.stem.uploadName = null

  return config
}
