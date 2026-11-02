import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import { findPreset, makeUserPreset, presetsFor } from '@/model/printers'
import { PRINTERS } from '@/model/options'
import { sanitizeConfig } from '@/model/sanitize'
import { printChecks } from './checks'

const design = (patch: { [S in keyof KeycapConfig]?: Partial<KeycapConfig[S]> }) =>
  sanitizeConfig({
    stem: { ...DEFAULT_CONFIG.stem, ...patch.stem },
    size: { ...DEFAULT_CONFIG.size, ...patch.size },
    top: { ...DEFAULT_CONFIG.top, ...patch.top },
    legend: { ...DEFAULT_CONFIG.legend, ...patch.legend },
    manufacturing: { ...DEFAULT_CONFIG.manufacturing, ...patch.manufacturing },
  })

const ids = (config: KeycapConfig) =>
  printChecks(config, findPreset(config.manufacturing.technology, config.manufacturing.printer)).map((c) => c.id)

describe('printer presets', () => {
  it('lists generic first, then the machines of that technology', () => {
    expect(presetsFor('fdm').map((p) => p.id)).toEqual(['generic', 'bambu-x1', 'bambu-p1s', 'prusa-mk4'])
    expect(presetsFor('sls').map((p) => p.id)).toEqual(['generic'])
  })

  it('matches the printer ids the model accepts', () => {
    for (const tech of ['fdm', 'sla', 'sls'] as const) {
      expect(presetsFor(tech).map((p) => p.id)).toEqual(PRINTERS[tech])
    }
  })

  it('includes user presets of the same technology only', () => {
    const mine = makeUserPreset('School printer', 'fdm', 0.2, 1.4, [])
    expect(mine.id).toBe('user:school-printer')
    const fdm = presetsFor('fdm', [mine])
    expect(fdm[fdm.length - 1]).toEqual(mine)
    expect(presetsFor('sla', [mine]).some((p) => p.id === mine.id)).toBe(false)
  })

  it('makes unique ids and keeps Chinese names', () => {
    const first = makeUserPreset('学校打印机', 'sla', 0.05, 0.8, [])
    expect(first.id).toBe('user:学校打印机')
    expect(makeUserPreset('学校打印机', 'sla', 0.05, 0.8, [first]).id).toBe('user:学校打印机-2')
  })

  it('falls back to generic for an unknown preset', () => {
    expect(findPreset('fdm', 'user:deleted').id).toBe('generic')
  })
})

describe('printChecks', () => {
  it('finds nothing wrong with the default design', () => {
    expect(ids(DEFAULT_CONFIG)).toEqual([])
  })

  it('warns about walls thinner than the printer manages', () => {
    expect(ids(design({ size: { wallThickness: 1.0 }, manufacturing: { technology: 'fdm' } }))).toContain('wall-thin')
    expect(ids(design({ size: { wallThickness: 1.0 }, manufacturing: { technology: 'sla' } }))).not.toContain('wall-thin')
  })

  it('warns about thin text strokes for FDM and suggests a size', () => {
    const config = design({ legend: { type: 'text', text: 'A', textSize: 3 }, manufacturing: { technology: 'fdm' } })
    const check = printChecks(config, findPreset('fdm', 'generic')).find((c) => c.id === 'text-thin')!
    expect(check.level).toBe('warning')
    expect(Number(check.values.size)).toBeGreaterThan(6)
    expect(ids(design({ legend: { type: 'text', text: 'A', textSize: 3 } }))).not.toContain('text-thin')
  })

  it('notes when an engraving is limited by the wall', () => {
    expect(ids(design({ size: { wallThickness: 0.8 }, legend: { type: 'text', text: 'A', textMode: 'engraved', textDepth: 1 } }))).toContain(
      'engrave-limited',
    )
  })

  it('warns when a marker or legend reaches over the edge', () => {
    expect(ids(design({ top: { form: 'tactile', markerType: 'dot', markerSize: 3, markerX: 5 } }))).toContain('marker-edge')
    expect(ids(design({ top: { form: 'tactile', markerType: 'bar', markerSize: 3, markerY: -3 } }))).not.toContain('marker-edge')
    expect(ids(design({ legend: { type: 'text', text: 'Delete', textSize: 4 } }))).toContain('legend-edge')
    expect(ids(design({ legend: { type: 'text', text: 'A', textSize: 4 } }))).not.toContain('legend-edge')
  })

  it('warns when Braille is wider than the top', () => {
    expect(ids(design({ legend: { type: 'braille', brailleText: 'abc' } }))).toContain('braille-wide')
    expect(ids(design({ legend: { type: 'braille', brailleText: 'a' } }))).not.toContain('braille-wide')
    expect(ids(design({ legend: { type: 'braille', brailleText: 'abc' }, size: { widthU: 2 } }))).not.toContain('braille-wide')
  })

  it('flags a negative tolerance and approximate mounts', () => {
    const level = (technology: 'fdm' | 'sla') =>
      printChecks(design({ stem: { fitTolerance: -0.05 }, manufacturing: { technology } }), findPreset(technology, 'generic')).find(
        (c) => c.id === 'tolerance-tight',
      )?.level
    expect(level('fdm')).toBe('warning')
    expect(level('sla')).toBe('note')
    expect(ids(design({ stem: { type: 'alps' } }))).toContain('stem-approx')
  })

  it('notes translucency on an opaque material', () => {
    expect(ids(design({ manufacturing: { translucency: 40, material: 'standard' } }))).toContain('translucent-opaque')
    expect(ids(design({ manufacturing: { translucency: 40, material: 'clear' } }))).not.toContain('translucent-opaque')
  })

  it('notes a second colour with nothing to colour', () => {
    expect(ids(design({ manufacturing: { secondColour: '#1a1a1a' } }))).toContain('second-colour-unused')
    expect(ids(design({ manufacturing: { secondColour: '#1a1a1a' }, legend: { type: 'icon' } }))).not.toContain('second-colour-unused')
    expect(ids(design({ manufacturing: { secondColour: '#1a1a1a' }, top: { form: 'tactile' } }))).not.toContain('second-colour-unused')
  })

  it('warns when the design needs an uploaded base that is not loaded', () => {
    const config = design({ stem: { type: 'upload', uploadName: 'stem.stl' } })
    const printer = findPreset('sla', 'generic')
    expect(printChecks(config, printer).map((c) => c.id)).toContain('upload-missing')
    expect(printChecks(config, printer, { hasUpload: true }).map((c) => c.id)).not.toContain('upload-missing')
    expect(printChecks(DEFAULT_CONFIG, printer).map((c) => c.id)).not.toContain('upload-missing')
  })

  it('lists warnings before notes', () => {
    const levels = printChecks(
      design({ stem: { type: 'topre' }, size: { wallThickness: 0.8 }, manufacturing: { technology: 'fdm' } }),
      findPreset('fdm', 'generic'),
    ).map((c) => c.level)
    expect(levels).toContain('note')
    expect(levels.indexOf('note')).toBeGreaterThan(levels.lastIndexOf('warning'))
  })
})
