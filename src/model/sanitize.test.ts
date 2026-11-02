import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { clampToRange, sanitizeConfig } from './sanitize'

describe('clampToRange', () => {
  const r = { min: 1, max: 10, step: 0.25, unit: 'u' as const }

  it('clamps below and above', () => {
    expect(clampToRange(0, r)).toBe(1)
    expect(clampToRange(99, r)).toBe(10)
  })

  it('snaps to the step', () => {
    expect(clampToRange(1.3, r)).toBe(1.25)
    expect(clampToRange(6.2, r)).toBe(6.25)
  })

  it('has no float noise', () => {
    expect(clampToRange(1.2, { min: 0.8, max: 2.5, step: 0.05, unit: 'mm' })).toBe(1.2)
    expect(clampToRange(-0.07, { min: -0.1, max: 0.3, step: 0.01, unit: 'mm' })).toBe(-0.07)
  })
})

describe('sanitizeConfig', () => {
  it('returns the defaults for empty or junk input', () => {
    expect(sanitizeConfig(undefined)).toEqual(DEFAULT_CONFIG)
    expect(sanitizeConfig('nonsense')).toEqual(DEFAULT_CONFIG)
    expect(sanitizeConfig([1, 2])).toEqual(DEFAULT_CONFIG)
  })

  it('keeps valid values and fills missing ones', () => {
    const c = sanitizeConfig({ size: { widthU: 2, profile: 'sa' } })
    expect(c.size.widthU).toBe(2)
    expect(c.size.profile).toBe('sa')
    expect(c.size.row).toBe(DEFAULT_CONFIG.size.row)
    expect(c.top).toEqual(DEFAULT_CONFIG.top)
  })

  it('clamps numbers and rejects non-numbers', () => {
    const c = sanitizeConfig({ top: { dishDepth: 9, slopeAngle: 'steep', markerX: Infinity } })
    expect(c.top.dishDepth).toBe(2)
    expect(c.top.slopeAngle).toBe(DEFAULT_CONFIG.top.slopeAngle)
    expect(c.top.markerX).toBe(DEFAULT_CONFIG.top.markerX)
  })

  it('rejects unknown enum values', () => {
    const c = sanitizeConfig({ stem: { type: 'mystery' }, top: { form: 'pyramid' } })
    expect(c.stem.type).toBe('mx')
    expect(c.top.form).toBe('concave')
  })

  it('allows a null height override but clamps a numeric one', () => {
    expect(sanitizeConfig({ size: { heightOverride: null } }).size.heightOverride).toBeNull()
    expect(sanitizeConfig({ size: { heightOverride: 30 } }).size.heightOverride).toBe(16)
  })

  it('truncates legend text by characters, including CJK and emoji', () => {
    const c = sanitizeConfig({ legend: { text: '键帽配置器测试多余', brailleText: 'ABCDE' } })
    expect(c.legend.text).toBe('键帽配置器测')
    expect(c.legend.brailleText).toBe('ABC')
    expect(sanitizeConfig({ legend: { text: '😀😀😀😀😀😀😀' } }).legend.text).toBe('😀😀😀😀😀😀')
  })

  it('validates colours', () => {
    const c = sanitizeConfig({ manufacturing: { mainColour: '#FF0000', secondColour: 'red' } })
    expect(c.manufacturing.mainColour).toBe('#ff0000')
    expect(c.manufacturing.secondColour).toBeNull()
  })

  it('resets a printer or material that does not belong to the technology', () => {
    const c = sanitizeConfig({ manufacturing: { technology: 'fdm', printer: 'formlabs-form-4', material: 'tough' } })
    expect(c.manufacturing.printer).toBe('generic')
    expect(c.manufacturing.material).toBe('pla')
  })

  it('keeps user-saved printer presets', () => {
    const c = sanitizeConfig({ manufacturing: { printer: 'user:school-printer' } })
    expect(c.manufacturing.printer).toBe('user:school-printer')
  })

  it('clears the upload name unless the stem type is upload', () => {
    expect(sanitizeConfig({ stem: { type: 'mx', uploadName: 'base.stl' } }).stem.uploadName).toBeNull()
    expect(sanitizeConfig({ stem: { type: 'upload', uploadName: 'base.stl' } }).stem.uploadName).toBe('base.stl')
  })

  it('drops unknown keys', () => {
    const c = sanitizeConfig({ extra: 1, size: { colour: 'blue' } }) as unknown as Record<string, unknown>
    expect(c.extra).toBeUndefined()
    expect((c.size as Record<string, unknown>).colour).toBeUndefined()
  })
})
