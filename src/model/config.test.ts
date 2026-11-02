import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, RANGES, type NumberRange, type Section } from './config'
import { MATERIALS, PRINTERS, profileHasRows, TECHNOLOGY_DEFAULTS } from './options'

describe('defaults', () => {
  it('every default number sits inside its range', () => {
    for (const section of Object.keys(RANGES) as Section[]) {
      const ranges = RANGES[section] as Record<string, NumberRange>
      const values = DEFAULT_CONFIG[section] as unknown as Record<string, number | null>
      for (const [key, r] of Object.entries(ranges)) {
        const v = values[key]
        if (v === null) continue
        expect(v, `${section}.${key}`).toBeGreaterThanOrEqual(r.min)
        expect(v, `${section}.${key}`).toBeLessThanOrEqual(r.max)
      }
    }
  })

  it('every range has min < max and a positive step', () => {
    for (const ranges of Object.values(RANGES)) {
      for (const r of Object.values(ranges as Record<string, NumberRange>)) {
        expect(r.min).toBeLessThan(r.max)
        expect(r.step).toBeGreaterThan(0)
      }
    }
  })

  it('default material, printer and tolerance match the default technology', () => {
    const m = DEFAULT_CONFIG.manufacturing
    expect(MATERIALS[m.technology]).toContain(m.material)
    expect(PRINTERS[m.technology]).toContain(m.printer)
    expect(DEFAULT_CONFIG.stem.fitTolerance).toBe(TECHNOLOGY_DEFAULTS[m.technology].fitTolerance)
  })

  it('technology default materials are in each material list', () => {
    for (const [tech, d] of Object.entries(TECHNOLOGY_DEFAULTS)) {
      expect(MATERIALS[tech as keyof typeof MATERIALS]).toContain(d.material)
    }
  })

  it('only sculpted profiles have rows', () => {
    expect(profileHasRows('cherry')).toBe(true)
    expect(profileHasRows('sa')).toBe(true)
    expect(profileHasRows('dsa')).toBe(false)
    expect(profileHasRows('xda')).toBe(false)
  })
})
