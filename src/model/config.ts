import {
  TECHNOLOGY_DEFAULTS,
  type DishShape,
  type Icon,
  type LegendType,
  type MarkerType,
  type Profile,
  type Row,
  type SlopeDirection,
  type StemType,
  type Technology,
  type TextMode,
  type TopForm,
} from './options'

// Lengths in mm, angles in degrees, width in u (1u = 19.05 mm pitch).

export interface StemConfig {
  type: StemType
  crossLength: number
  crossWidthH: number
  crossWidthV: number
  socketDepth: number
  outerDiameter: number
  fitTolerance: number
  /** File name of an uploaded base model; the geometry itself is kept outside the config. */
  uploadName: string | null
}

export interface SizeConfig {
  widthU: number
  profile: Profile
  /** Ignored for profiles without rows (DSA, XDA). */
  row: Row
  /** null = use the profile's height */
  heightOverride: number | null
  wallThickness: number
  topFillet: number
  stabilisers: boolean
}

export interface TopConfig {
  form: TopForm
  dishShape: DishShape
  dishDepth: number
  domeHeight: number
  slopeAngle: number
  slopeDirection: SlopeDirection
  markerType: MarkerType
  markerSize: number
  markerHeight: number
  markerX: number
  markerY: number
}

export interface LegendConfig {
  type: LegendType
  text: string
  textMode: TextMode
  textSize: number
  textDepth: number
  brailleText: string
  brailleDotDiameter: number
  brailleDotHeight: number
  brailleDotSpacing: number
  icon: Icon
  offsetX: number
  offsetY: number
}

export interface ManufacturingConfig {
  technology: Technology
  printer: string
  material: string
  mainColour: string
  /** Colour of the legend/marker part; null = single colour */
  secondColour: string | null
  translucency: number
}

export interface KeycapConfig {
  stem: StemConfig
  size: SizeConfig
  top: TopConfig
  legend: LegendConfig
  manufacturing: ManufacturingConfig
}

export type Section = keyof KeycapConfig

export interface NumberRange {
  min: number
  max: number
  step: number
  unit: 'mm' | 'deg' | 'u' | '%'
}

type NumericKeys<T> = { [K in keyof T]: T[K] extends number ? K : T[K] extends number | null ? K : never }[keyof T]

/** Allowed range of every numeric parameter (PLAN.md §4). */
export const RANGES: { [S in Section]: Record<NumericKeys<KeycapConfig[S]>, NumberRange> } = {
  stem: {
    crossLength: { min: 3.8, max: 4.4, step: 0.01, unit: 'mm' },
    crossWidthH: { min: 1.0, max: 1.5, step: 0.01, unit: 'mm' },
    crossWidthV: { min: 1.0, max: 1.5, step: 0.01, unit: 'mm' },
    socketDepth: { min: 3.0, max: 4.5, step: 0.1, unit: 'mm' },
    outerDiameter: { min: 5.0, max: 6.0, step: 0.05, unit: 'mm' },
    fitTolerance: { min: -0.1, max: 0.3, step: 0.01, unit: 'mm' },
  },
  size: {
    widthU: { min: 1, max: 10, step: 0.25, unit: 'u' },
    heightOverride: { min: 4, max: 16, step: 0.1, unit: 'mm' },
    wallThickness: { min: 0.8, max: 2.5, step: 0.05, unit: 'mm' },
    topFillet: { min: 0.2, max: 2.0, step: 0.05, unit: 'mm' },
  },
  top: {
    dishDepth: { min: 0, max: 2, step: 0.05, unit: 'mm' },
    domeHeight: { min: 0, max: 2, step: 0.05, unit: 'mm' },
    slopeAngle: { min: 0, max: 15, step: 0.5, unit: 'deg' },
    markerSize: { min: 0.5, max: 6, step: 0.1, unit: 'mm' },
    markerHeight: { min: 0.3, max: 1.0, step: 0.05, unit: 'mm' },
    markerX: { min: -6, max: 6, step: 0.1, unit: 'mm' },
    markerY: { min: -6, max: 6, step: 0.1, unit: 'mm' },
  },
  legend: {
    textSize: { min: 2, max: 8, step: 0.1, unit: 'mm' },
    textDepth: { min: 0.3, max: 1.0, step: 0.05, unit: 'mm' },
    brailleDotDiameter: { min: 1.2, max: 1.8, step: 0.05, unit: 'mm' },
    brailleDotHeight: { min: 0.4, max: 0.8, step: 0.05, unit: 'mm' },
    brailleDotSpacing: { min: 2.3, max: 2.7, step: 0.05, unit: 'mm' },
    offsetX: { min: -6, max: 6, step: 0.1, unit: 'mm' },
    offsetY: { min: -6, max: 6, step: 0.1, unit: 'mm' },
  },
  manufacturing: {
    translucency: { min: 0, max: 90, step: 1, unit: '%' },
  },
}

export const MAX_TEXT_LENGTH = 6
export const MAX_BRAILLE_LENGTH = 3

export const DEFAULT_CONFIG: KeycapConfig = {
  stem: {
    type: 'mx',
    crossLength: 4.1,
    crossWidthH: 1.31,
    crossWidthV: 1.17,
    socketDepth: 3.8,
    outerDiameter: 5.5,
    fitTolerance: TECHNOLOGY_DEFAULTS.sla.fitTolerance,
    uploadName: null,
  },
  size: {
    widthU: 1,
    profile: 'cherry',
    row: 'R3',
    heightOverride: null,
    wallThickness: 1.5,
    topFillet: 0.8,
    stabilisers: true,
  },
  top: {
    form: 'concave',
    dishShape: 'auto',
    dishDepth: 1.0,
    domeHeight: 0.8,
    slopeAngle: 6,
    slopeDirection: 'front',
    markerType: 'bar',
    markerSize: 3.0,
    markerHeight: 0.5,
    markerX: 0,
    markerY: -3.0,
  },
  legend: {
    type: 'none',
    text: '',
    textMode: 'engraved',
    textSize: 4.0,
    textDepth: 0.5,
    brailleText: '',
    brailleDotDiameter: 1.5,
    brailleDotHeight: 0.5,
    brailleDotSpacing: 2.5,
    icon: 'home',
    offsetX: 0,
    offsetY: 0,
  },
  manufacturing: {
    technology: 'sla',
    printer: 'generic',
    material: TECHNOLOGY_DEFAULTS.sla.material,
    mainColour: '#f2f2f0',
    secondColour: null,
    translucency: 0,
  },
}
