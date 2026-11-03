import { describe, expect, it } from 'vitest'
import { STRINGS } from '@/i18n/strings'
import { DEFAULT_CONFIG } from '@/model/config'
import { toEnglish } from './english'
import { keyName } from './key-names'
import { legendSpeech } from './legend-speech'

describe('keyName', () => {
  it('names keys by their physical position, ignoring Shift and layout', () => {
    expect(keyName({ key: 'a', code: 'KeyA' })).toBe('A')
    expect(keyName({ key: 'Q', code: 'KeyQ' })).toBe('Q')
    // AZERTY: the key at the "Q" position types "a" but is the Q keycap position
    expect(keyName({ key: 'a', code: 'KeyQ' })).toBe('Q')
    expect(keyName({ key: '!', code: 'Digit1' })).toBe('1')
  })

  it('reads out special keys in words', () => {
    expect(keyName({ key: 'Escape', code: 'Escape' })).toBe('Escape')
    expect(keyName({ key: ' ', code: 'Space' })).toBe('Space')
    expect(keyName({ key: 'ArrowLeft', code: 'ArrowLeft' })).toBe('Left arrow')
    expect(keyName({ key: 'Shift', code: 'ShiftRight' })).toBe('Right Shift')
    expect(keyName({ key: ',', code: 'Comma' })).toBe('Comma')
    expect(keyName({ key: 'F5', code: 'F5' })).toBe('F5')
    expect(keyName({ key: '7', code: 'Numpad7' })).toBe('Numpad 7')
  })

  it('falls back to the typed character for unknown keys', () => {
    expect(keyName({ key: 'ß', code: 'Unidentified' })).toBe('SS')
    expect(keyName({ key: 'MediaTrackNext', code: 'MediaTrackNext' })).toBe('MediaTrackNext')
  })
})

describe('toEnglish', () => {
  it('leaves English alone', () => {
    expect(toEnglish('Key width')).toBe('Key width')
  })

  it('translates whole Chinese labels back to the English string', () => {
    expect(toEnglish(STRINGS.zh['field.width'])).toBe(STRINGS.en['field.width'])
    expect(toEnglish(STRINGS.zh['step.top'])).toBe(STRINGS.en['step.top'])
    expect(toEnglish('中文')).toBe('Chinese')
  })

  it('translates known phrases inside longer Chinese text and drops the rest', () => {
    const mixed = `${STRINGS.zh['field.height']}（mm）`
    expect(toEnglish(mixed)).toBe(`${STRINGS.en['field.height']} （mm）`.replace(/\s+/g, ' '))
    // Unknown Chinese words never reach the English voice
    expect(toEnglish('未知的词 Cherry')).toBe('Cherry')
  })
})

describe('legendSpeech', () => {
  const legend = (patch: Partial<typeof DEFAULT_CONFIG.legend>) => ({ ...DEFAULT_CONFIG.legend, ...patch })

  it('says what is on the keycap', () => {
    expect(legendSpeech(legend({ type: 'none' }))).toBe('No legend')
    expect(legendSpeech(legend({ type: 'text', text: 'Esc' }))).toBe('Legend: Esc')
    expect(legendSpeech(legend({ type: 'braille', brailleText: 'esc' }))).toBe('Braille: e, s, c')
    expect(legendSpeech(legend({ type: 'icon', icon: 'home' }))).toBe('Icon: Home')
    expect(legendSpeech(legend({ type: 'icon', icon: 'volume-up' }))).toBe('Icon: Volume +')
  })

  it('stays quiet for an empty text legend', () => {
    expect(legendSpeech(legend({ type: 'text', text: '  ' }))).toBe('')
  })
})
