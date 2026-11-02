import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from './config'
import { sanitizeConfig } from './sanitize'
import {
  buildShareUrl,
  decodeShareParam,
  encodeShareParam,
  parseDesignFile,
  readShareParam,
  toDesignFile,
} from './serialize'

const custom = (): KeycapConfig =>
  sanitizeConfig({
    size: { widthU: 6.25, profile: 'sa', row: 'R1' },
    top: { form: 'tactile', markerType: 'dot' },
    legend: { type: 'text', text: 'Ä键😀' },
    manufacturing: { technology: 'fdm', secondColour: '#d9480f' },
  })

describe('design file', () => {
  it('round-trips a design', () => {
    const result = parseDesignFile(toDesignFile(custom()))
    expect(result).toEqual({ ok: true, config: custom() })
  })

  it('records format, version and time', () => {
    const file = JSON.parse(toDesignFile(DEFAULT_CONFIG, new Date('2026-11-03T00:00:00Z')))
    expect(file.format).toBe('keycap-configurator')
    expect(file.version).toBe(1)
    expect(file.savedAt).toBe('2026-11-03T00:00:00.000Z')
  })

  it('reports broken JSON, wrong files and newer versions', () => {
    expect(parseDesignFile('{oops')).toEqual({ ok: false, error: 'invalid-json' })
    expect(parseDesignFile('{"format":"vase","config":{}}')).toEqual({ ok: false, error: 'not-a-design' })
    expect(parseDesignFile('{"format":"keycap-configurator","version":99,"config":{}}')).toEqual({
      ok: false,
      error: 'newer-version',
    })
  })
})

describe('share link', () => {
  it('round-trips a design including non-ASCII legend text', () => {
    const { param } = encodeShareParam(custom())
    expect(param).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(decodeShareParam(param)).toEqual(custom())
  })

  it('encodes the default design as an empty diff', () => {
    const { param } = encodeShareParam(DEFAULT_CONFIG)
    expect(decodeShareParam(param)).toEqual(DEFAULT_CONFIG)
    expect(param.length).toBeLessThan(5)
  })

  it('drops uploaded model names and says so', () => {
    const config = sanitizeConfig({ stem: { type: 'upload', uploadName: 'base.stl' } })
    const { param, droppedUpload } = encodeShareParam(config)
    expect(droppedUpload).toBe(true)
    expect(decodeShareParam(param)?.stem.uploadName).toBeNull()
    expect(decodeShareParam(param)?.stem.type).toBe('upload')
  })

  it('returns null for an unreadable parameter', () => {
    expect(decodeShareParam('!!!')).toBeNull()
    expect(decodeShareParam('bm90IGpzb24')).toBeNull() // "not json"
  })

  it('builds a URL that the router and reader understand', () => {
    const { url } = buildShareUrl(custom(), 'https://example.github.io/keycap-configurator/#/compare')
    expect(url.startsWith('https://example.github.io/keycap-configurator/#/configure?c=')).toBe(true)
    const param = readShareParam(new URL(url).hash)
    expect(param && decodeShareParam(param)).toEqual(custom())
  })

  it('finds no parameter in a plain route', () => {
    expect(readShareParam('#/configure')).toBeNull()
  })
})
