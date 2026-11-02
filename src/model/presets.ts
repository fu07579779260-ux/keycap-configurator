import type { StringKey } from '@/i18n/strings'
import { DEFAULT_CONFIG, type KeycapConfig } from './config'
import { sanitizeConfig } from './sanitize'

type Patch = { [S in keyof KeycapConfig]?: Partial<KeycapConfig[S]> }

export interface Preset {
  id: string
  name: StringKey
  description: StringKey
  config: KeycapConfig
}

const make = (patch: Patch): KeycapConfig =>
  sanitizeConfig({
    stem: { ...DEFAULT_CONFIG.stem, ...patch.stem },
    size: { ...DEFAULT_CONFIG.size, ...patch.size },
    top: { ...DEFAULT_CONFIG.top, ...patch.top },
    legend: { ...DEFAULT_CONFIG.legend, ...patch.legend },
    manufacturing: { ...DEFAULT_CONFIG.manufacturing, ...patch.manufacturing },
  })

/** Ready-made examples covering the main ideas of the project; each opens in the configurator. */
export const PRESETS: Preset[] = [
  {
    id: 'homing-bar',
    name: 'preset.homing-bar',
    description: 'preset.homing-bar.desc',
    config: make({ top: { form: 'tactile', markerType: 'bar', markerSize: 4, markerY: -3.5 } }),
  },
  {
    id: 'braille-esc',
    name: 'preset.braille-esc',
    description: 'preset.braille-esc.desc',
    config: make({
      size: { profile: 'dsa', widthU: 1.5 },
      top: { form: 'flat' },
      legend: { type: 'braille', brailleText: 'esc' },
    }),
  },
  {
    id: 'xda-concave',
    name: 'preset.xda-concave',
    description: 'preset.xda-concave.desc',
    config: make({ size: { profile: 'xda' }, top: { form: 'concave', dishShape: 'spherical', dishDepth: 1.2 } }),
  },
  {
    id: 'convex-easy-press',
    name: 'preset.convex-easy-press',
    description: 'preset.convex-easy-press.desc',
    config: make({ size: { profile: 'oem', row: 'R3', widthU: 2 }, top: { form: 'convex', domeHeight: 1.6 } }),
  },
  {
    id: 'angled-thumb',
    name: 'preset.angled-thumb',
    description: 'preset.angled-thumb.desc',
    config: make({ size: { profile: 'dsa', widthU: 1.5 }, top: { form: 'angled', slopeAngle: 10, slopeDirection: 'left' } }),
  },
  {
    id: 'two-colour-enter',
    name: 'preset.two-colour-enter',
    description: 'preset.two-colour-enter.desc',
    config: make({
      size: { widthU: 2.25 },
      legend: { type: 'icon', icon: 'enter', textMode: 'engraved', textSize: 6, textDepth: 0.6 },
      manufacturing: { mainColour: '#f2f2f0', secondColour: '#d9480f' },
    }),
  },
  {
    id: 'spacebar',
    name: 'preset.spacebar',
    description: 'preset.spacebar.desc',
    config: make({ size: { widthU: 6.25, row: 'R4' } }),
  },
  {
    id: 'low-profile-choc',
    name: 'preset.low-profile-choc',
    description: 'preset.low-profile-choc.desc',
    config: make({
      stem: { type: 'choc-v1' },
      size: { profile: 'dsa', heightOverride: 4.5, wallThickness: 1.2 },
      top: { form: 'concave', dishShape: 'spherical', dishDepth: 0.5 },
    }),
  },
]
