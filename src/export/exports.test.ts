import Module from 'manifold-3d'
import rhino3dm, { type Mesh, type RhinoModule } from 'rhino3dm'
import { beforeAll, describe, expect, it } from 'vitest'
import { bodyParams, buildBody } from '@/geometry/body'
import { buildKeycapParts } from '@/geometry/solid'
import { printChecks } from '@/geometry/checks'
import { DEFAULT_CONFIG } from '@/model/config'
import { findPreset } from '@/model/printers'
import { sanitizeConfig } from '@/model/sanitize'
import { zipFiles } from './exporters'
import { DENSITY, latin1, sheetContent, sheetPdf } from './print-sheet'
import { RHINO_FILE_VERSION, write3dm } from './rhino'

let rhino: RhinoModule
beforeAll(async () => {
  rhino = await rhino3dm()
})

describe('write3dm', () => {
  const mesh = buildBody(bodyParams(DEFAULT_CONFIG))

  it('writes a Rhino 7 file in millimetres that reads back', () => {
    const doc = rhino.File3dm.fromByteArray(write3dm(rhino, [{ mesh, name: 'Keycap', colour: '#f2f2f0' }]))
    expect(Math.floor(doc.archiveVersion / 10)).toBe(RHINO_FILE_VERSION)
    expect(doc.settings().modelUnitSystem).toBe(rhino.UnitSystem.Millimeters)
    ;(doc as unknown as { delete(): void }).delete()
  })

  it('puts each colour part on its own coloured layer', async () => {
    const wasm = await Module()
    wasm.setup()
    const config = sanitizeConfig({
      top: { form: 'tactile' },
      manufacturing: { mainColour: '#f2f2f0', secondColour: '#d9480f' },
    })
    const { body, accent } = buildKeycapParts(wasm, config)
    const doc = rhino.File3dm.fromByteArray(
      write3dm(rhino, [
        { mesh: body, name: 'Keycap', colour: '#f2f2f0' },
        { mesh: accent!, name: 'Legend + marker', colour: '#d9480f' },
      ]),
    )
    const layers = doc.layers()
    expect(layers.count).toBe(2)
    expect(layers.get(1).name).toBe('Legend + marker')
    expect(layers.get(1).color).toEqual({ r: 217, g: 72, b: 15, a: 255 })
    const objects = doc.objects()
    expect(objects.count).toBe(2)
    const first = objects.get(0).geometry() as Mesh
    expect(first.vertices().count).toBe(body.positions.length / 3)
    ;(doc as unknown as { delete(): void }).delete()
  })
})

describe('print sheet', () => {
  const printer = findPreset('fdm', 'generic')
  const config = sanitizeConfig({
    size: { profile: 'sa', row: 'R1', widthU: 2 },
    legend: { type: 'text', text: '键A', textMode: 'raised' },
    manufacturing: { technology: 'fdm', material: 'petg' },
  })
  const measured = { width: 37.05, depth: 18, height: 16.2, volume: 2000, accentVolume: 0 }
  const content = sheetContent(config, printer, measured, printChecks(config, printer), 'key.stl', new Date(2026, 10, 3, 7, 30))
  const row = (heading: string, label: string) => content.sections.find((s) => s.heading === heading)!.rows.find(([l]) => l === label)![1]

  it('describes the design, fit and print settings', () => {
    expect(row('Design', 'Profile')).toBe('SA R1')
    expect(row('Design', 'Size (W × D × H)')).toBe('37.05 × 18.00 × 16.20 mm')
    expect(row('Fit', 'Stabilisers')).toBe('2 × MX-style, 23.8 mm apart')
    expect(row('Print', 'Orientation')).toMatch(/Top face down/)
    expect(content.date).toBe('2026-11-03')
  })

  it('estimates material from volume and density', () => {
    expect(row('Print', 'Material estimate')).toBe(`2.00 cm³ ≈ ${(2 * DENSITY.petg).toFixed(1)} g`)
  })

  it('replaces characters the PDF font cannot draw', () => {
    // Chinese can't be drawn with the PDF's font, so it shows as "?"
    expect(row('Design', 'Legend')).toMatch(/^"\?A" raised/)
    expect(latin1('"键A" 30–45° ≈ 2 cm³')).toBe('"?A" 30-45° ~ 2 cm³')
  })

  it('lists the print checks in English', () => {
    expect(content.checks.some((c) => c.startsWith('Warning: Legend lines'))).toBe(true)
  })

  it('renders a PDF', async () => {
    const pdf = await sheetPdf(content, null)
    const head = new TextDecoder().decode(new Uint8Array(await pdf.arrayBuffer()).slice(0, 5))
    expect(head).toBe('%PDF-')
    expect(pdf.size).toBeGreaterThan(2000)
  })
})

describe('zipFiles', () => {
  it('packs files under their names', async () => {
    const zip = await zipFiles(
      [
        { name: 'a.stl', blob: new Blob(['solid a']) },
        { name: 'b.json', blob: new Blob(['{}']) },
      ],
      'set.zip',
    )
    const { default: JSZip } = await import('jszip')
    const read = await JSZip.loadAsync(await zip.blob.arrayBuffer())
    expect(Object.keys(read.files).sort()).toEqual(['a.stl', 'b.json'])
    expect(await read.file('a.stl')!.async('string')).toBe('solid a')
    expect(zip.name).toBe('set.zip')
  })
})
