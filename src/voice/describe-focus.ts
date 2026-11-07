import type { Language } from '@/i18n/strings'
import { toEnglish } from './english'

/** Words added around a control's name, in each language. */
const WORDS: Record<Language, Record<string, string>> = {
  en: {
    sep: ', ',
    selected: 'selected',
    on: 'on',
    off: 'off',
    chooseFile: 'choose file',
    empty: 'empty',
    link: 'link',
    currentPage: 'current page',
    unavailable: 'unavailable',
    button: 'button',
  },
  zh: {
    sep: '，',
    selected: '已选中',
    on: '开',
    off: '关',
    chooseFile: '选择文件',
    empty: '空',
    link: '链接',
    currentPage: '当前页面',
    unavailable: '不可用',
    button: '按钮',
  },
}

/** Units as they should be read out. */
const UNITS: [RegExp, string][] = [
  [/\s*\(mm\)$/, ''],
  [/\s*\(°\)$/, ''],
  [/\s*\(u\)$/, ''],
  [/\s*\(%\)$/, ''],
]
const spokenUnit = (text: string, lang: Language) =>
  lang === 'zh'
    ? text
        .replace(/(\d)\s*mm\b/g, '$1 毫米')
        .replace(/(\d)\s*°/g, '$1 度')
        .replace(/(\d+(?:\.\d+)?)\s*%/g, '百分之 $1')
        .replace(/(\d)u\b/g, '$1 u')
    : text
        .replace(/(\d)\s*mm\b/g, '$1 millimetres')
        .replace(/(\d)\s*°/g, '$1 degrees')
        .replace(/(\d)\s*%/g, '$1 percent')
        .replace(/(\d)u\b/g, '$1 u')

/** Accessible name, roughly as a screen reader would compute it. */
export function accessibleName(el: Element): string {
  const aria = el.getAttribute('aria-label')
  if (aria) return aria
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const text = labelledBy
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? '')
      .join(' ')
    if (text.trim()) return text
  }
  if (el.id) {
    const label = document.querySelector(`label[for="${CSS.escape(el.id)}"]`)
    if (label?.textContent?.trim()) return label.textContent
  }
  const wrapping = el.closest('label')
  if (wrapping?.textContent?.trim()) return wrapping.textContent
  return el.getAttribute('title') ?? el.textContent ?? ''
}

/** Page text tidied for speech; in English, any Chinese labels are turned back into English. */
const clean = (s: string, lang: Language) => {
  const text = s.replace(/\s+/g, ' ').trim()
  return lang === 'zh' ? text : toEnglish(text)
}

/** What to say when a control gets keyboard focus. Empty when there's nothing useful. */
export function describeFocus(el: Element, lang: Language = 'en'): string {
  const w = WORDS[lang]
  const name = clean(accessibleName(el), lang)
  const legend = el.closest('fieldset')?.querySelector('legend')?.textContent
  const group = legend ? `${clean(legend, lang)}${lang === 'zh' ? '：' : ': '}` : ''

  if (el instanceof HTMLInputElement) {
    switch (el.type) {
      case 'range':
        return spokenUnit(`${name}${w.sep}${el.getAttribute('aria-valuetext') ?? el.value}`, lang)
      case 'number': {
        const unit = /\((mm|°|u|%)\)$/.exec(el.getAttribute('aria-label') ?? '')?.[1] ?? ''
        const label = UNITS.reduce((s, [re]) => s.replace(re, ''), name)
        return spokenUnit(`${label}${w.sep}${el.value}${unit === 'mm' ? ' mm' : unit}`, lang)
      }
      case 'radio':
        return `${group}${name}${el.checked ? w.sep + w.selected : ''}`
      case 'checkbox':
        return `${name}${w.sep}${el.checked ? w.on : w.off}`
      case 'file':
        return `${name}${w.sep}${w.chooseFile}`
      default:
        return `${name}${w.sep}${el.value ? clean(el.value, lang) : w.empty}`
    }
  }
  if (el instanceof HTMLSelectElement) return `${name}${w.sep}${clean(el.selectedOptions[0]?.textContent ?? '', lang)}`
  if (el instanceof HTMLCanvasElement) return spokenUnit(name, lang)
  if (el instanceof HTMLAnchorElement) {
    return `${name}${w.sep}${w.link}${el.getAttribute('aria-current') === 'page' ? w.sep + w.currentPage : ''}`
  }
  if (el instanceof HTMLButtonElement) {
    const pressed = el.getAttribute('aria-pressed')
    const state = pressed === 'true' ? w.sep + w.on : pressed === 'false' ? w.sep + w.off : ''
    return `${name}${state}${el.disabled ? w.sep + w.unavailable : ''}${w.sep}${w.button}`
  }
  return name
}

/** What to say when a focused slider or number box changes value. */
export function describeValue(el: Element, lang: Language = 'en'): string {
  const w = WORDS[lang]
  if (el instanceof HTMLInputElement && (el.type === 'range' || el.type === 'number')) {
    if (el.type === 'range') return spokenUnit(el.getAttribute('aria-valuetext') ?? el.value, lang)
    const unit = /\((mm|°|u|%)\)$/.exec(el.getAttribute('aria-label') ?? '')?.[1] ?? ''
    return spokenUnit(`${el.value}${unit === 'mm' ? ' mm' : unit}`, lang)
  }
  if (el instanceof HTMLInputElement && el.type === 'radio') return `${clean(accessibleName(el), lang)}${w.sep}${w.selected}`
  if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.checked ? w.on : w.off
  if (el instanceof HTMLSelectElement) return clean(el.selectedOptions[0]?.textContent ?? '', lang)
  return ''
}
