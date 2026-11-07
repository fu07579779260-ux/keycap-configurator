import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import { findKey, LAYOUT_KEYS, LAYOUTS, layoutSize } from './layouts'
import { fittingKeys, isSculpted, placeDesign, rowMismatch } from './placement'

const withSize = (size: Partial<KeycapConfig['size']>): KeycapConfig => ({
  ...DEFAULT_CONFIG,
  size: { ...DEFAULT_CONFIG.size, ...size },
})

describe('keyboard layouts', () => {
  it.each(LAYOUTS)('%s: no two keys overlap and every code is unique', (id) => {
    const keys = LAYOUT_KEYS[id]
    expect(new Set(keys.map((k) => k.code)).size).toBe(keys.length)
    for (let i = 0; i < keys.length; i++) {
      for (let j = i + 1; j < keys.length; j++) {
        const a = keys[i]
        const b = keys[j]
        const overlap = a.x < b.x + b.w - 1e-6 && b.x < a.x + a.w - 1e-6 && a.y < b.y + b.h - 1e-6 && b.y < a.y + a.h - 1e-6
        expect(overlap, `${a.code} overlaps ${b.code}`).toBe(false)
      }
    }
  })

  it('has the usual key counts and sizes', () => {
    expect(LAYOUT_KEYS['60']).toHaveLength(61)
    expect(LAYOUT_KEYS.tkl).toHaveLength(87)
    expect(LAYOUT_KEYS.full).toHaveLength(104)
    expect(layoutSize(LAYOUT_KEYS['60'])).toEqual({ width: 15, depth: 5 })
    expect(layoutSize(LAYOUT_KEYS.tkl)).toEqual({ width: 18.25, depth: 6.5 })
    expect(layoutSize(LAYOUT_KEYS.full)).toEqual({ width: 22.5, depth: 6.5 })
  })

  it('every alphanumeric row is 15u wide', () => {
    const keys = LAYOUT_KEYS['60']
    for (let y = 0; y < 5; y++) {
      const width = keys.filter((k) => k.y === y).reduce((sum, k) => sum + k.w, 0)
      expect(width).toBe(15)
    }
  })

  it('maps physical key codes to the right keys and rows', () => {
    const keys = LAYOUT_KEYS.full
    expect(findKey(keys, 'KeyJ')).toMatchObject({ w: 1, row: 'R3' })
    expect(findKey(keys, 'Digit1')).toMatchObject({ row: 'R1' })
    expect(findKey(keys, 'KeyQ')).toMatchObject({ row: 'R2' })
    expect(findKey(keys, 'KeyZ')).toMatchObject({ row: 'R4' })
    expect(findKey(keys, 'Space')).toMatchObject({ w: 6.25, row: 'R4' })
    expect(findKey(keys, 'ShiftRight')).toMatchObject({ w: 2.75 })
    expect(findKey(keys, 'NumpadAdd')).toMatchObject({ h: 2 })
    expect(findKey(LAYOUT_KEYS['60'], 'F1')).toBeUndefined()
    expect(findKey(LAYOUT_KEYS.tkl, 'Numpad5')).toBeUndefined()
  })
})

describe('placing the design', () => {
  const keys = LAYOUT_KEYS.tkl

  it('only offers positions of the same width', () => {
    expect(fittingKeys(keys, 6.25).map((k) => k.code)).toEqual(['Space'])
    expect(fittingKeys(LAYOUT_KEYS.full, 2).map((k) => k.code)).toEqual(['Backspace', 'Numpad0'])
    expect(fittingKeys(keys, 1).every((k) => k.w === 1 && k.h === 1)).toBe(true)
  })

  it('starts on a sensible key and keeps a chosen one that fits', () => {
    expect(placeDesign(keys, 1, null)?.code).toBe('KeyJ')
    expect(placeDesign(keys, 2.25, null)?.code).toBe('Enter')
    expect(placeDesign(keys, 6.25, null)?.code).toBe('Space')
    expect(placeDesign(keys, 1, 'Escape')?.code).toBe('Escape')
    // A chosen key that no longer fits (the width changed) falls back to the default
    expect(placeDesign(keys, 1, 'Space')?.code).toBe('KeyJ')
    expect(placeDesign(keys, 3, null)).toBeNull()
  })

  it('flags a row mismatch only on sculpted profiles', () => {
    const escape = findKey(keys, 'Escape')!
    expect(isSculpted('oem')).toBe(true)
    expect(isSculpted('dsa')).toBe(false)
    expect(rowMismatch(withSize({ profile: 'cherry', row: 'R3' }), escape)).toBe('R1')
    expect(rowMismatch(withSize({ profile: 'cherry', row: 'R1' }), escape)).toBeNull()
    expect(rowMismatch(withSize({ profile: 'dsa', row: 'R3' }), escape)).toBeNull()
  })
})
