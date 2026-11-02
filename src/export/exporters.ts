import type { ManifoldToplevel } from 'manifold-3d'
import type { MeshData } from '@/geometry/body'
import { printChecks } from '@/geometry/checks'
import { meshSize, meshVolume } from '@/geometry/dimensions'
import { loadManifold } from '@/geometry/manifold-loader'
import { buildKeycap, buildKeycapParts } from '@/geometry/solid'
import { keycapExtras } from '@/geometry/text-outline'
import type { KeycapConfig } from '@/model/config'
import { TOP_FORMS } from '@/model/options'
import type { PrinterPreset } from '@/model/printers'
import { toDesignFile } from '@/model/serialize'
import { captureJpegDataUrl, capturePng } from './capture'
import { designFileName } from './filename'
import { loadRhino } from './load-rhino'
import { sheetContent, sheetPdf } from './print-sheet'
import { write3dm, type RhinoPart } from './rhino'
import { meshToStl } from './stl'

/** A finished file, ready to download or to put in a ZIP. */
export interface ExportFile {
  name: string
  blob: Blob
}

const stlBlob = (mesh: MeshData, name: string) =>
  new Blob([meshToStl(mesh, `Keycap Configurator - ${name}`)], { type: 'model/stl' })

/** The meshes for a design: whole keycap, plus colour parts when a second colour is on. */
function meshesFor(wasm: ManifoldToplevel, config: KeycapConfig) {
  const extras = keycapExtras(config)
  const whole = buildKeycap(wasm, config, extras)
  const parts = config.manufacturing.secondColour ? buildKeycapParts(wasm, config, extras) : null
  return { whole, parts }
}

export async function stlFile(config: KeycapConfig, part: 'whole' | 'main' | 'second'): Promise<ExportFile | null> {
  const wasm = await loadManifold()
  const extras = keycapExtras(config)
  const base = designFileName(config, 'stl')
  if (part === 'whole') return { name: base, blob: stlBlob(buildKeycap(wasm, config, extras), base) }
  const parts = buildKeycapParts(wasm, config, extras)
  const mesh = part === 'main' ? parts.body : parts.accent
  if (!mesh) return null
  const name = base.replace(/\.stl$/, `-${part}-colour.stl`)
  return { name, blob: stlBlob(mesh, name) }
}

export async function rhinoFile(config: KeycapConfig): Promise<ExportFile> {
  const [wasm, rhino] = await Promise.all([loadManifold(), loadRhino()])
  const { whole, parts } = meshesFor(wasm, config)
  const m = config.manufacturing
  const layers: RhinoPart[] =
    parts?.accent && m.secondColour
      ? [
          { mesh: parts.body, name: 'Keycap', colour: m.mainColour },
          { mesh: parts.accent, name: 'Legend + marker', colour: m.secondColour },
        ]
      : [{ mesh: whole, name: 'Keycap', colour: m.mainColour }]
  const name = designFileName(config, '3dm')
  const bytes = write3dm(rhino, layers, name.replace(/\.3dm$/, ''))
  return { name, blob: new Blob([bytes as BlobPart], { type: 'application/octet-stream' }) }
}

export async function pngFile(config: KeycapConfig): Promise<ExportFile | null> {
  const blob = await capturePng()
  return blob ? { name: designFileName(config, 'png'), blob } : null
}

export async function pdfFile(config: KeycapConfig, printer: PrinterPreset): Promise<ExportFile> {
  const wasm = await loadManifold()
  const { whole, parts } = meshesFor(wasm, config)
  const size = parts?.accent ? meshSize(parts.body.positions, parts.accent.positions) : meshSize(whole.positions)
  const name = designFileName(config, 'pdf')
  const content = sheetContent(
    config,
    printer,
    {
      ...size,
      // For two colours, report the parts separately (the engraving inlay adds material)
      volume: meshVolume((parts?.body ?? whole).positions, (parts?.body ?? whole).indices),
      accentVolume: parts?.accent ? meshVolume(parts.accent.positions, parts.accent.indices) : 0,
    },
    printChecks(config, printer),
    designFileName(config, 'stl'),
  )
  return { name, blob: await sheetPdf(content, captureJpegDataUrl()) }
}

/** Everything for this key: STL (and colour parts), 3DM, PNG, PDF and the design file. */
export async function everythingFiles(config: KeycapConfig, printer: PrinterPreset): Promise<ExportFile[]> {
  const files: (ExportFile | null)[] = [
    await stlFile(config, 'whole'),
    ...(config.manufacturing.secondColour ? [await stlFile(config, 'main'), await stlFile(config, 'second')] : []),
    await rhinoFile(config),
    await pngFile(config),
    await pdfFile(config, printer),
    { name: designFileName(config, 'json'), blob: new Blob([toDesignFile(config)], { type: 'application/json' }) },
  ]
  return files.filter((f): f is ExportFile => f !== null)
}

/** The same key in all five top forms, one STL each, for a comparison print. */
export async function formSetFiles(config: KeycapConfig): Promise<ExportFile[]> {
  const wasm = await loadManifold()
  return TOP_FORMS.map((form) => {
    const variant: KeycapConfig = { ...config, top: { ...config.top, form } }
    const name = designFileName(variant, 'stl')
    return { name, blob: stlBlob(buildKeycap(wasm, variant, keycapExtras(variant)), name) }
  })
}

/** The keycaps on the Compare page, one STL each, numbered in their order. */
export async function compareSetFiles(configs: KeycapConfig[]): Promise<ExportFile[]> {
  const wasm = await loadManifold()
  return configs.map((config, i) => {
    const name = `${String(i + 1).padStart(2, '0')}-${designFileName(config, 'stl')}`
    return { name, blob: stlBlob(buildKeycap(wasm, config, keycapExtras(config)), name) }
  })
}

/** Pack files into one ZIP. */
export async function zipFiles(files: ExportFile[], name: string): Promise<ExportFile> {
  const { default: JSZip } = await import('jszip')
  const zip = new JSZip()
  for (const f of files) zip.file(f.name, f.blob)
  return { name, blob: await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }) }
}
