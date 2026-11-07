import { STRINGS, type Language } from '@/i18n/strings'
import type { LegendConfig } from '@/model/config'

/** Elements marked with this attribute announce every key pressed inside them (the key tester). */
export const KEY_TESTER_ATTR = 'data-key-tester'

const WORDS: Record<Language, { legend: string; braille: string; icon: string; none: string; colon: string; sep: string }> = {
  en: { legend: 'Legend', braille: 'Braille', icon: 'Icon', none: 'No legend', colon: ': ', sep: ', ' },
  zh: { legend: '字符', braille: '盲文', icon: '图标', none: '无字符', colon: '：', sep: '，' },
}

/** Spoken description of the legend, e.g. "Legend: Esc" or "Braille: e, s, c" (字符：Esc in Chinese). */
export function legendSpeech(legend: LegendConfig, lang: Language = 'en'): string {
  const w = WORDS[lang]
  switch (legend.type) {
    case 'text':
      return legend.text.trim() ? `${w.legend}${w.colon}${legend.text}` : ''
    case 'braille':
      return legend.brailleText ? `${w.braille}${w.colon}${Array.from(legend.brailleText).join(w.sep)}` : ''
    case 'icon':
      // Drop the symbol in front of the name ("⌂ Home" → "Home")
      return `${w.icon}${w.colon}${STRINGS[lang][`icon.${legend.icon}`].replace(/^[^\p{L}]+/u, '')}`
    default:
      return w.none
  }
}
