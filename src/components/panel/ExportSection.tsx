import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { downloadBlob } from '@/export/download'
import {
  everythingFiles,
  formSetFiles,
  pdfFile,
  pngFile,
  rhinoFile,
  stlFile,
  zipFiles,
  type ExportFile,
} from '@/export/exporters'
import { designFileName, formSetFileName } from '@/export/filename'
import { useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { useDesign } from '@/model/design-context'
import { findPreset } from '@/model/printers'
import { useUserPrinters } from '@/model/user-printers'
import { PanelSection } from './controls'

type Job = 'stl' | 'main' | 'second' | '3dm' | 'png' | 'pdf' | 'all' | 'set'

type Status =
  | { state: 'idle' }
  | { state: 'working'; job: Job }
  | { state: 'done'; fileName: string; kb: number }
  | { state: 'empty'; reason: StringKey }
  | { state: 'error' }

export function ExportSection() {
  const t = useT()
  const { config } = useDesign()
  const userPresets = useUserPrinters()
  const printer = findPreset(config.manufacturing.technology, config.manufacturing.printer, userPresets)
  const [status, setStatus] = useState<Status>({ state: 'idle' })
  const twoColour = config.manufacturing.secondColour !== null

  async function run(job: Job) {
    setStatus({ state: 'working', job })
    try {
      const file = await makeFile(job)
      if (!file) {
        setStatus({ state: 'empty', reason: job === 'png' ? 'export.noView' : 'export.nothingToColour' })
        return
      }
      downloadBlob(file.blob, file.name)
      setStatus({ state: 'done', fileName: file.name, kb: Math.max(1, Math.round(file.blob.size / 1024)) })
    } catch (error) {
      console.error('Export failed', error)
      setStatus({ state: 'error' })
    }
  }

  function makeFile(job: Job): Promise<ExportFile | null> {
    switch (job) {
      case 'stl':
        return stlFile(config, 'whole')
      case 'main':
      case 'second':
        return stlFile(config, job)
      case '3dm':
        return rhinoFile(config)
      case 'png':
        return pngFile(config)
      case 'pdf':
        return pdfFile(config, printer)
      case 'all':
        return everythingFiles(config, printer).then((files) => zipFiles(files, designFileName(config, 'zip')))
      case 'set':
        return formSetFiles(config).then((files) => zipFiles(files, formSetFileName(config)))
    }
  }

  const busy = status.state === 'working'
  const button = (job: Job, key: StringKey, variant: 'default' | 'outline' = 'outline') => (
    <Button
      variant={variant}
      className={variant === 'outline' ? 'border-ink' : undefined}
      onClick={() => run(job)}
      disabled={busy}
    >
      {status.state === 'working' && status.job === job ? t('export.working') : t(key)}
    </Button>
  )

  return (
    <PanelSection title={t('section.export')}>
      <div className="grid">{button('stl', 'export.stl', 'default')}</div>

      {twoColour && (
        <div className="space-y-2">
          <p className="text-xs text-graphite">{t('export.twoColourHint')}</p>
          <div className="grid grid-cols-2 gap-2">
            {button('main', 'export.mainPart')}
            {button('second', 'export.secondPart')}
          </div>
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-sm">{t('export.otherFormats')}</p>
        <div className="grid grid-cols-3 gap-2">
          {button('3dm', 'export.3dm')}
          {button('png', 'export.png')}
          {button('pdf', 'export.pdf')}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-sm">{t('export.zip')}</p>
        <div className="grid gap-2">
          {button('all', 'export.all')}
          {button('set', 'export.set')}
        </div>
      </div>

      {/* Announced to screen readers when the export finishes */}
      <p role="status" className="text-xs text-graphite">
        {status.state === 'done' && (
          <>
            <span className="font-mono break-all text-ink">{status.fileName}</span>
            {` · ${status.kb} KB`}
          </>
        )}
        {status.state === 'empty' && t(status.reason)}
        {status.state === 'error' && <span className="text-destructive">{t('export.failed')}</span>}
        {status.state === 'idle' && t('export.hint')}
      </p>
    </PanelSection>
  )
}
