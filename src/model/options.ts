// Enumerated choices from PLAN.md §4. Order is the display order.

export const STEM_TYPES = ['mx', 'choc-v1', 'choc-v2', 'alps', 'topre', 'custom', 'upload'] as const
export type StemType = (typeof STEM_TYPES)[number]

export const PROFILES = ['oem', 'cherry', 'sa', 'dsa', 'xda', 'mt3'] as const
export type Profile = (typeof PROFILES)[number]

/** Sculpted profiles have a different shape per row (R1–R4). */
export const SCULPTED_PROFILES: readonly Profile[] = ['oem', 'cherry', 'sa', 'mt3']
export const profileHasRows = (p: Profile) => SCULPTED_PROFILES.includes(p)

export const ROWS = ['R1', 'R2', 'R3', 'R4'] as const
export type Row = (typeof ROWS)[number]

/** Width presets shown as quick picks; any 0.25u step from 1 to 10 is allowed. */
export const WIDTH_PRESETS = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.75, 6.25, 7] as const

export const TOP_FORMS = ['flat', 'concave', 'convex', 'angled', 'tactile'] as const
export type TopForm = (typeof TOP_FORMS)[number]

/** 'auto' uses the profile's own dish (spherical for SA/DSA/XDA, cylindrical otherwise). */
export const DISH_SHAPES = ['auto', 'cylindrical', 'spherical'] as const
export type DishShape = (typeof DISH_SHAPES)[number]

export const SLOPE_DIRECTIONS = ['front', 'back', 'left', 'right'] as const
export type SlopeDirection = (typeof SLOPE_DIRECTIONS)[number]

export const MARKER_TYPES = ['dot', 'bar', 'ring', 'texture'] as const
export type MarkerType = (typeof MARKER_TYPES)[number]

export const LEGEND_TYPES = ['none', 'text', 'braille', 'icon'] as const
export type LegendType = (typeof LEGEND_TYPES)[number]

export const TEXT_MODES = ['raised', 'engraved'] as const
export type TextMode = (typeof TEXT_MODES)[number]

export const ICONS = [
  'home', 'esc', 'enter', 'backspace', 'tab', 'shift', 'space',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
  'mute', 'volume-up', 'volume-down',
] as const
export type Icon = (typeof ICONS)[number]

export const TECHNOLOGIES = ['fdm', 'sla', 'sls'] as const
export type Technology = (typeof TECHNOLOGIES)[number]

export const MATERIALS: Record<Technology, readonly string[]> = {
  fdm: ['pla', 'petg', 'tpu'],
  sla: ['standard', 'tough', 'clear'],
  sls: ['pa12'],
}

/** Built-in printer presets per technology. User-saved presets use ids starting with "user:". */
export const PRINTERS: Record<Technology, readonly string[]> = {
  fdm: ['generic', 'bambu-x1', 'bambu-p1s', 'prusa-mk4'],
  sla: ['generic', 'formlabs-form-3', 'formlabs-form-4', 'elegoo-resin'],
  sls: ['generic'],
}

/** Values applied when the technology changes (PLAN.md §5); the user can override them afterwards. */
export const TECHNOLOGY_DEFAULTS: Record<
  Technology,
  { fitTolerance: number; material: string; minWall: number; minLegendStroke: number; minFeature: number }
> = {
  fdm: { fitTolerance: 0.15, material: 'pla', minWall: 1.2, minLegendStroke: 0.8, minFeature: 0.4 },
  sla: { fitTolerance: 0.05, material: 'standard', minWall: 0.8, minLegendStroke: 0.3, minFeature: 0.3 },
  sls: { fitTolerance: 0.1, material: 'pa12', minWall: 1.0, minLegendStroke: 0.5, minFeature: 0.5 },
}

export const isOneOf = <T extends string>(list: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (list as readonly string[]).includes(value)
