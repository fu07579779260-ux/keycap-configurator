import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/export/download'
import { designFileName } from '@/export/filename'
import { meshToStl } from '@/export/stl'
import type { MeshData } from '@/geometry/body'
import { loadManifold } from '@/geometry/manifold-loader'
import { buildKeycap, buildKeycapParts } from '@/geometry/solid'
import { keycapExtras } from '@/geometry/text-outline'
import { useT } from '@/i18n/language'
import { useDesign } from '@/model/design-context'
import { PanelSection } from './controls'

/** Whole keycap in one colour, or one part of a two-colour print. */
type Part = 'whole' | 'main' | 'second'

type Status =
  | { state: 'idle' }
  | { state: 'working'; part: Part }
  | { state: 'done'; fileName: string; kb: number; triangles: number }
  | { state: 'empty' }
  | { state: 'error' }

export function ExportSection() {
  const t = useT()
  const { config } = useDesign()
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const twoColour = config.manufacturing.secondColour !== null

  async function exportStl(part: Part) {
    setStatus({ state: 'working', part })
    try {
      const wasm = await loadManifold()
      const extras = keycapExtras(config)
      let mesh: MeshData | null
      if (part === 'whole') {
        mesh = buildKeycap(wasm, config, extras)
      } else {
        const parts = buildKeycapParts(wasm, config, extras)
        mesh = part === 'main' ? parts.body : parts.accent
      }
      if (!mesh) {
        setStatus({ state: 'empty' })
        return
      }
      const base = designFileName(config, 'stl')
      const fileName = part === 'whole' ? base : base.replace(/\.stl$/, `-${part}-colour.stl`)
      const stl = meshToStl(mesh, `Keycap Configurator - ${fileName}`)
      downloadBlob(new Blob([stl], { type: 'model/stl' }), fileName)
      setStatus({ state: 'done', fileName, kb: Math.round(stl.byteLength / 1024), triangles: mesh.indices.length / 3 })
    } catch (error) {
      console.error('STL export failed', error)
      setStatus({ state: 'error' })
    }
  }

  const busy = status.state === 'working'
  const label = (part: Part, key: Parameters<typeof t>[0]) =>
    status.state === 'working' && status.part === part ? t('export.working') : t(key)

  return (
    <PanelSection title={t('section.export')}>
      <Button className="w-full" onClick={() => exportStl('whole')} disabled={busy}>
        {label('whole', 'export.stl')}
      </Button>
      {twoColour && (
        <div className="space-y-2">
          <p className="text-xs text-graphite">{t('export.twoColourHint')}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="border-ink" onClick={() => exportStl('main')} disabled={busy}>
              {label('main', 'export.mainPart')}
            </Button>
            <Button variant="outline" className="border-ink" onClick={() => exportStl('second')} disabled={busy}>
              {label('second', 'export.secondPart')}
            </Button>
          </div>
        </div>
      )}
      {/* Announced to screen readers when the export finishes */}
      <p role="status" className="text-xs text-graphite">
        {status.state === 'done' && (
          <>
            <span className="font-mono break-all text-ink">{status.fileName}</span>
            {` · ${status.kb} KB · ${status.triangles.toLocaleString()} ${t('export.triangles')}`}
          </>
        )}
        {status.state === 'empty' && t('export.nothingToColour')}
        {status.state === 'error' && <span className="text-destructive">{t('export.failed')}</span>}
        {status.state === 'idle' && t('export.hint')}
      </p>
    </PanelSection>
  )
}
