import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/export/download'
import { designFileName } from '@/export/filename'
import { meshToStl } from '@/export/stl'
import { loadManifold } from '@/geometry/manifold-loader'
import { buildKeycap } from '@/geometry/solid'
import { keycapExtras } from '@/geometry/text-outline'
import { useT } from '@/i18n/language'
import { useDesign } from '@/model/design-context'
import { PanelSection } from './controls'

type Status = { state: 'idle' } | { state: 'working' } | { state: 'done'; fileName: string; kb: number; triangles: number } | { state: 'error' }

export function ExportSection() {
  const t = useT()
  const { config } = useDesign()
  const [status, setStatus] = useState<Status>({ state: 'idle' })

  async function exportStl() {
    setStatus({ state: 'working' })
    try {
      const wasm = await loadManifold()
      const mesh = buildKeycap(wasm, config, keycapExtras(config))
      const stl = meshToStl(mesh, `Keycap Configurator - ${designFileName(config, 'stl')}`)
      const fileName = designFileName(config, 'stl')
      downloadBlob(new Blob([stl], { type: 'model/stl' }), fileName)
      setStatus({ state: 'done', fileName, kb: Math.round(stl.byteLength / 1024), triangles: mesh.indices.length / 3 })
    } catch (error) {
      console.error('STL export failed', error)
      setStatus({ state: 'error' })
    }
  }

  return (
    <PanelSection title={t('section.export')}>
      <Button className="w-full" onClick={exportStl} disabled={status.state === 'working'}>
        {status.state === 'working' ? t('export.working') : t('export.stl')}
      </Button>
      {/* Announced to screen readers when the export finishes */}
      <p role="status" className="text-xs text-graphite">
        {status.state === 'done' && (
          <>
            <span className="font-mono break-all text-ink">{status.fileName}</span>
            {` · ${status.kb} KB · ${status.triangles.toLocaleString()} ${t('export.triangles')}`}
          </>
        )}
        {status.state === 'error' && <span className="text-destructive">{t('export.failed')}</span>}
        {status.state === 'idle' && t('export.hint')}
      </p>
    </PanelSection>
  )
}
