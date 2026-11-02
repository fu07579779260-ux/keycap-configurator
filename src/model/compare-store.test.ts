import { beforeEach, describe, expect, it } from 'vitest'
import { compareList, MAX_COMPARE } from './compare-store'
import { DEFAULT_CONFIG } from './config'

describe('compareList', () => {
  beforeEach(() => compareList.clear())

  it('adds independent copies', () => {
    const config = structuredClone(DEFAULT_CONFIG)
    compareList.add(config)
    config.size.widthU = 2
    expect(compareList.get()[0].config.size.widthU).toBe(1)
  })

  it('stops at the maximum', () => {
    for (let i = 0; i < MAX_COMPARE; i++) expect(compareList.add(DEFAULT_CONFIG)).toBe(true)
    expect(compareList.add(DEFAULT_CONFIG)).toBe(false)
    expect(compareList.get()).toHaveLength(MAX_COMPARE)
  })

  it('fills in the five top forms, replacing the list', () => {
    compareList.add(DEFAULT_CONFIG)
    compareList.fiveForms(DEFAULT_CONFIG)
    expect(compareList.get().map((i) => i.config.top.form)).toEqual(['flat', 'concave', 'convex', 'angled', 'tactile'])
    expect(new Set(compareList.get().map((i) => i.id)).size).toBe(5)
  })

  it('removes and reorders', () => {
    compareList.fiveForms(DEFAULT_CONFIG)
    const [first, second] = compareList.get()
    compareList.move(first.id, 1)
    expect(compareList.get()[0].id).toBe(second.id)
    compareList.move(first.id, 1)
    compareList.remove(second.id)
    expect(compareList.get().map((i) => i.config.top.form)).toEqual(['convex', 'flat', 'angled', 'tactile'])
    // Moving past either end does nothing
    compareList.move(compareList.get()[0].id, -1)
    expect(compareList.get()[0].config.top.form).toBe('convex')
  })
})
