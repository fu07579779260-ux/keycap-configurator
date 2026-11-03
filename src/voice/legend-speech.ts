import { STRINGS } from '@/i18n/strings'
import type { LegendConfig } from '@/model/config'

/** Elements marked with this attribute announce every key pressed inside them (the key tester). */
export const KEY_TESTER_ATTR = 'data-key-tester'

/** Spoken description of the legend, e.g. "Legend: Esc" or "Braille: e, s, c". */
export function legendSpeech(legend: LegendConfig): string {
  switch (legend.type) {
    case 'text':
      return legend.text.trim() ? `Legend: ${legend.text}` : ''
    case 'braille':
      return legend.brailleText ? `Braille: ${Array.from(legend.brailleText).join(', ')}` : ''
    case 'icon':
      // Drop the symbol in front of the English name ("⌂ Home" → "Home")
      return `Icon: ${STRINGS.en[`icon.${legend.icon}`].replace(/^[^A-Za-z]+/, '')}`
    default:
      return 'No legend'
  }
}
