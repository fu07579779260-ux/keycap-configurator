import { STRINGS, type StringKey } from '@/i18n/strings'

/**
 * Voice feedback is always in English (PLAN.md §5). When the interface is
 * in Chinese, labels read from the page are turned back into their English
 * strings: whole matches first, then the longest known phrases inside.
 */
const pairs = (Object.keys(STRINGS.zh) as StringKey[])
  .map((key) => [STRINGS.zh[key], STRINGS.en[key]] as const)
  // Skip strings with placeholders and ones identical in both languages
  .filter(([zh, en]) => zh !== en && !zh.includes('{'))
  .sort((a, b) => b[0].length - a[0].length)

const whole = new Map<string, string>([
  ...pairs,
  // Names shown as-is in both languages (the language switch)
  ['中文', 'Chinese'],
])
/** Any Chinese character (every Chinese label contains some). */
const CJK = /\p{Script=Han}/u

export function toEnglish(text: string): string {
  const trimmed = text.trim()
  if (!CJK.test(trimmed)) return trimmed
  const exact = whole.get(trimmed)
  if (exact) return exact
  let out = trimmed
  for (const [zh, en] of pairs) {
    if (!CJK.test(out)) break
    if (out.includes(zh)) out = out.split(zh).join(` ${en} `)
  }
  // Chinese punctuation to English, and anything still untranslatable is left out
  return out
    .replace(/[，、]/g, ', ')
    .replace(/[：]/g, ': ')
    .replace(/[。]/g, '. ')
    .replace(/\p{Script=Han}+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
