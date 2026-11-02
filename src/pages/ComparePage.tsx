import { lazy, Suspense, useState } from 'react'
import { describeDesign } from '@/components/compare/describe'
import { Button } from '@/components/ui/button'
import { ViewportErrorBoundary } from '@/components/viewport/ViewportErrorBoundary'
import { downloadBlob } from '@/export/download'
import { compareSetFiles, zipFiles } from '@/export/exporters'
import { fill, useT } from '@/i18n/language'
import { href } from '@/lib/router'
import { compareList, MAX_COMPARE, useCompareList } from '@/model/compare-store'
import { useDesign } from '@/model/design-context'

// three.js is large; load it only when this page opens
const CompareViewport = lazy(() => import('@/components/compare/CompareViewport'))

export function ComparePage() {
  const t = useT()
  const { config, load } = useDesign()
  const items = useCompareList()
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  const add = () => setStatus(compareList.add(config) ? '' : fill(t('compare.full'), { max: String(MAX_COMPARE) }))

  const downloadSet = async () => {
    setBusy(true)
    try {
      const zip = await zipFiles(await compareSetFiles(items.map((i) => i.config)), 'keycap-compare-set.zip')
      downloadBlob(zip.blob, zip.name)
      setStatus(`${zip.name} · ${Math.round(zip.blob.size / 1024)} KB`)
    } catch (error) {
      console.error('Set export failed', error)
      setStatus(t('export.failed'))
    } finally {
      setBusy(false)
    }
  }

  const edit = (id: number) => {
    const item = items.find((i) => i.id === id)
    if (!item) return
    load(item.config)
    window.location.hash = href('/configure')
  }

  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('page.compare.title')}</h1>
        <p className="mt-1 text-graphite">{t('page.compare.summary')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={add}>{t('compare.addCurrent')}</Button>
        <Button variant="outline" className="border-ink" onClick={() => compareList.fiveForms(config)}>
          {t('compare.fiveForms')}
        </Button>
        <Button variant="outline" className="border-ink" onClick={downloadSet} disabled={items.length === 0 || busy}>
          {busy ? t('export.working') : t('compare.downloadSet')}
        </Button>
        <Button variant="ghost" onClick={() => compareList.clear()} disabled={items.length === 0}>
          {t('compare.clear')}
        </Button>
      </div>
      <p role="status" className="text-xs text-graphite">
        {status}
      </p>

      {items.length === 0 ? (
        <div className="border border-dashed border-rule bg-paper/80 px-6 py-12 text-center">
          <p>{t('compare.empty')}</p>
          <p className="mt-1 text-sm text-graphite">{t('compare.emptyHint')}</p>
        </div>
      ) : (
        <>
          <div className="h-[50dvh]">
            <ViewportErrorBoundary message={t('viewport.failed')}>
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center border border-ink bg-paper">
                    <p className="annotation">{t('viewport.loading')}</p>
                  </div>
                }
              >
                <CompareViewport items={items} />
              </Suspense>
            </ViewportErrorBoundary>
          </div>

          <ol className="divide-y divide-rule border border-ink bg-paper">
            {items.map((item, i) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2">
                <span className="font-mono text-sm text-signal">{String(i + 1).padStart(2, '0')}</span>
                <span className="min-w-0 flex-1 text-sm">{describeDesign(item.config, t)}</span>
                <span className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${t('compare.moveLeft')} ${i + 1}`}
                    disabled={i === 0}
                    onClick={() => compareList.move(item.id, -1)}
                  >
                    ←
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${t('compare.moveRight')} ${i + 1}`}
                    disabled={i === items.length - 1}
                    onClick={() => compareList.move(item.id, 1)}
                  >
                    →
                  </Button>
                  <Button size="sm" variant="outline" className="border-ink" onClick={() => edit(item.id)}>
                    {t('compare.edit')}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${t('compare.remove')} ${i + 1}`}
                    onClick={() => compareList.remove(item.id)}
                  >
                    ✕
                  </Button>
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
