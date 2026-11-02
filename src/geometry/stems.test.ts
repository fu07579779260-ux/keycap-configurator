import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '@/model/config'
import { sanitizeConfig } from '@/model/sanitize'
import { footprint } from './dimensions'
import { isStandardStabiliserWidth, stabiliserSpacing, stemLayout } from './stems'

describe('stabiliserSpacing', () => {
  it('needs no stabilisers below 2u', () => {
    expect(stabiliserSpacing(1)).toBeNull()
    expect(stabiliserSpacing(1.75)).toBeNull()
  })

  it('matches the standard spacings', () => {
    expect(stabiliserSpacing(2)).toBe(23.8)
    expect(stabiliserSpacing(2.25)).toBe(23.8)
    expect(stabiliserSpacing(2.75)).toBe(23.8)
    expect(stabiliserSpacing(3)).toBe(38.1)
    expect(stabiliserSpacing(6)).toBe(95.25)
    expect(stabiliserSpacing(6.25)).toBe(100)
    expect(stabiliserSpacing(7)).toBe(114.3)
  })

  it('always fits inside the keycap', () => {
    for (let w = 2; w <= 10; w += 0.25) {
      const s = stabiliserSpacing(w)!
      expect(s / 2 + 3, `${w}u`).toBeLessThan(footprint(w).width / 2)
    }
  })

  it('flags non-standard widths', () => {
    expect(isStandardStabiliserWidth(2.25)).toBe(true)
    expect(isStandardStabiliserWidth(4.5)).toBe(false)
    expect(isStandardStabiliserWidth(6.25)).toBe(true)
  })
})

describe('stemLayout', () => {
  it('has only the main stem for 1u', () => {
    expect(stemLayout(DEFAULT_CONFIG)).toEqual({ main: [0, 0], stabilisers: [], spacing: null })
  })

  it('places stabilisers symmetrically on a 6.25u space bar', () => {
    const layout = stemLayout(sanitizeConfig({ size: { widthU: 6.25 } }))
    expect(layout.stabilisers).toEqual([[-50, 0], [50, 0]])
  })

  it('leaves stabilisers out when switched off', () => {
    const layout = stemLayout(sanitizeConfig({ size: { widthU: 2, stabilisers: false } }))
    expect(layout.stabilisers).toEqual([])
  })
})
