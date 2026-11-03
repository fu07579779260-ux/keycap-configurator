import { toEnglish } from './english'

/** Units as they should be read out. */
const UNITS: [RegExp, string][] = [
  [/\s*\(mm\)$/, ''],
  [/\s*\(°\)$/, ''],
  [/\s*\(u\)$/, ''],
  [/\s*\(%\)$/, ''],
]
const spokenUnit = (text: string) =>
  text
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

const clean = (s: string) => toEnglish(s.replace(/\s+/g, ' ').trim())

/** What to say when a control gets keyboard focus. Empty when there's nothing useful. */
export function describeFocus(el: Element): string {
  const name = clean(accessibleName(el))
  const legend = el.closest('fieldset')?.querySelector('legend')?.textContent
  const group = legend ? `${clean(legend)}: ` : ''

  if (el instanceof HTMLInputElement) {
    switch (el.type) {
      case 'range':
        return spokenUnit(`${name}, ${el.getAttribute('aria-valuetext') ?? el.value}`)
      case 'number': {
        const unit = /\((mm|°|u|%)\)$/.exec(el.getAttribute('aria-label') ?? '')?.[1] ?? ''
        const label = UNITS.reduce((s, [re]) => s.replace(re, ''), name)
        return spokenUnit(`${label}, ${el.value}${unit === 'mm' ? ' mm' : unit}`)
      }
      case 'radio':
        return `${group}${name}${el.checked ? ', selected' : ''}`
      case 'checkbox':
        return `${name}, ${el.checked ? 'on' : 'off'}`
      case 'file':
        return `${name}, choose file`
      default:
        return `${name}, ${el.value ? clean(el.value) : 'empty'}`
    }
  }
  if (el instanceof HTMLSelectElement) return `${name}, ${clean(el.selectedOptions[0]?.textContent ?? '')}`
  if (el instanceof HTMLCanvasElement) return spokenUnit(name)
  if (el instanceof HTMLAnchorElement) return `${name}, link${el.getAttribute('aria-current') === 'page' ? ', current page' : ''}`
  if (el instanceof HTMLButtonElement) {
    const pressed = el.getAttribute('aria-pressed')
    const state = pressed === 'true' ? ', on' : pressed === 'false' ? ', off' : ''
    return `${name}${state}${el.disabled ? ', unavailable' : ''}, button`
  }
  return name
}

/** What to say when a focused slider or number box changes value. */
export function describeValue(el: Element): string {
  if (el instanceof HTMLInputElement && (el.type === 'range' || el.type === 'number')) {
    if (el.type === 'range') return spokenUnit(el.getAttribute('aria-valuetext') ?? el.value)
    const unit = /\((mm|°|u|%)\)$/.exec(el.getAttribute('aria-label') ?? '')?.[1] ?? ''
    return spokenUnit(`${el.value}${unit === 'mm' ? ' mm' : unit}`)
  }
  if (el instanceof HTMLInputElement && el.type === 'radio') return `${clean(accessibleName(el))}, selected`
  if (el instanceof HTMLInputElement && el.type === 'checkbox') return el.checked ? 'on' : 'off'
  if (el instanceof HTMLSelectElement) return clean(el.selectedOptions[0]?.textContent ?? '')
  return ''
}
