import { DEFAULT_CONFIG, type KeycapConfig, type Section } from './config'
import { TECHNOLOGY_DEFAULTS } from './options'
import { sanitizeConfig } from './sanitize'

export type DesignAction =
  | { [S in Section]: { type: 'patch'; section: S; values: Partial<KeycapConfig[S]> } }[Section]
  | { type: 'load'; config: unknown }
  | { type: 'reset' }

export function designReducer(state: KeycapConfig, action: DesignAction): KeycapConfig {
  switch (action.type) {
    case 'reset':
      return structuredClone(DEFAULT_CONFIG)

    case 'load':
      return sanitizeConfig(action.config)

    case 'patch': {
      const next = {
        ...state,
        [action.section]: { ...state[action.section], ...action.values },
      } as KeycapConfig

      // A new technology brings its own tolerance, material and printer (PLAN.md §5)
      const tech = next.manufacturing.technology
      if (tech !== state.manufacturing.technology) {
        const d = TECHNOLOGY_DEFAULTS[tech]
        next.stem = { ...next.stem, fitTolerance: d.fitTolerance }
        next.manufacturing = { ...next.manufacturing, material: d.material, printer: 'generic' }
      }

      return sanitizeConfig(next)
    }
  }
}
