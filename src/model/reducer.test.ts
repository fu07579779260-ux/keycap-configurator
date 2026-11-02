import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from './config'
import { designReducer } from './reducer'

const start = () => structuredClone(DEFAULT_CONFIG)

describe('designReducer', () => {
  it('patches one section and leaves the rest alone', () => {
    const next = designReducer(start(), { type: 'patch', section: 'top', values: { form: 'angled', slopeAngle: 10 } })
    expect(next.top.form).toBe('angled')
    expect(next.top.slopeAngle).toBe(10)
    expect(next.size).toEqual(DEFAULT_CONFIG.size)
  })

  it('clamps patched values', () => {
    const next = designReducer(start(), { type: 'patch', section: 'size', values: { widthU: 12 } })
    expect(next.size.widthU).toBe(10)
  })

  it('applies technology defaults when the technology changes', () => {
    const state = designReducer(start(), { type: 'patch', section: 'stem', values: { fitTolerance: 0.2 } })
    const next = designReducer(state, { type: 'patch', section: 'manufacturing', values: { technology: 'fdm' } })
    expect(next.stem.fitTolerance).toBe(0.15)
    expect(next.manufacturing.material).toBe('pla')
    expect(next.manufacturing.printer).toBe('generic')
  })

  it('keeps a user tolerance when the technology stays the same', () => {
    const state = designReducer(start(), { type: 'patch', section: 'stem', values: { fitTolerance: 0.2 } })
    const next = designReducer(state, { type: 'patch', section: 'manufacturing', values: { material: 'tough' } })
    expect(next.stem.fitTolerance).toBe(0.2)
    expect(next.manufacturing.material).toBe('tough')
  })

  it('loads and sanitises an outside config', () => {
    const next = designReducer(start(), { type: 'load', config: { size: { profile: 'xda', widthU: 0 } } })
    expect(next.size.profile).toBe('xda')
    expect(next.size.widthU).toBe(1)
  })

  it('resets to a fresh copy of the defaults', () => {
    const changed = designReducer(start(), { type: 'patch', section: 'top', values: { form: 'flat' } })
    const reset = designReducer(changed, { type: 'reset' })
    expect(reset).toEqual(DEFAULT_CONFIG)
    expect(reset).not.toBe(DEFAULT_CONFIG)
  })
})
