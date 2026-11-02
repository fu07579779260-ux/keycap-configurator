import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Hex colour tokens from a CSS block such as ":root {" … "}". */
function tokens(css: string, selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`)
  if (start < 0) throw new Error(`No ${selector} block`)
  const body = css.slice(start, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(([, name, hex]) => [name, hex.toLowerCase()]))
}

/** WCAG relative luminance and contrast ratio. */
function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const css = readFileSync('src/index.css', 'utf8')
const base = tokens(css, ':root')
const themes = {
  normal: base,
  'high contrast': { ...base, ...tokens(css, ':root[data-contrast="high"]') },
}

describe.each(Object.entries(themes))('%s theme', (_, t) => {
  // Text and the backgrounds it appears on (WCAG AA: 4.5:1 for normal text)
  const textPairs: [string, string, string][] = [
    ['ink on paper', t.ink, t.paper],
    ['ink on card', t.ink, t.card],
    ['ink on secondary (hover, done steps)', t.ink, t.secondary],
    ['graphite on paper', t.graphite, t.paper],
    ['graphite on card', t.graphite, t.card],
    ['graphite on secondary', t.graphite, t.secondary],
    ['signal text on paper', t.signal, t.paper],
    ['signal text on card', t.signal, t.card],
    ['paper on ink (selected buttons)', t.paper, t.ink],
    ['white on destructive', '#ffffff', t.destructive],
  ]

  it.each(textPairs)('%s ≥ 4.5:1', (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5)
  })

  // Focus ring and control borders (WCAG non-text contrast: 3:1)
  it('focus ring and borders ≥ 3:1', () => {
    expect(contrast(t.signal, t.paper)).toBeGreaterThanOrEqual(3)
    expect(contrast(t.ink, t.paper)).toBeGreaterThanOrEqual(3)
  })
})

it('high contrast is at least as strong as normal for body text', () => {
  expect(contrast(themes['high contrast'].ink, themes['high contrast'].paper)).toBeGreaterThanOrEqual(contrast(base.ink, base.paper))
  expect(contrast(themes['high contrast'].graphite, themes['high contrast'].paper)).toBeGreaterThan(contrast(base.graphite, base.paper))
})
