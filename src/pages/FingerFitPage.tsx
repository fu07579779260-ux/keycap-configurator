import { useId, useState } from 'react'
import { PhotoMeasure } from '@/components/fit/PhotoMeasure'
import { ChoiceGroup, ParamSlider } from '@/components/panel/controls'
import { Button } from '@/components/ui/button'
import { applyRecommendation, FINGER_RANGE, recommend } from '@/fit/recommend'
import { scanFingerWidth, scanPoints } from '@/fit/scan'
import { fill, useT } from '@/i18n/language'
import { href } from '@/lib/router'
import { useDesign } from '@/model/design-context'
import type { StringKey } from '@/i18n/strings'

type Method = 'photo' | 'scan' | 'manual'

const PROFILE_NAMES = { oem: 'OEM', cherry: 'Cherry', sa: 'SA', dsa: 'DSA', xda: 'XDA', mt3: 'MT3' }

function ScanMeasure({ onWidth }: { onWidth: (mm: number) => void }) {
  const t = useT()
  const id = useId()
  const [message, setMessage] = useState<StringKey | null>(null)

  const read = async (file: File | undefined) => {
    if (!file) return
    const points = scanPoints(file.name, await file.arrayBuffer())
    const width = points ? scanFingerWidth(points) : null
    if (width === null) {
      setMessage(points ? 'fit.scan.noFinger' : 'fit.scan.unreadable')
      return
    }
    setMessage(width < FINGER_RANGE.min || width > FINGER_RANGE.max ? 'fit.scan.outOfRange' : 'fit.scan.ok')
    onWidth(width)
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-graphite">{t('fit.scan.howTo')}</p>
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center border border-ink bg-card px-3 py-2 text-sm hover:bg-secondary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
      >
        {t('fit.scan.choose')}
        <input id={id} type="file" accept=".stl,.obj,.ply" className="sr-only" onChange={(e) => void read(e.target.files?.[0])} />
      </label>
      {message && (
        <p role="status" className={message === 'fit.scan.ok' ? 'text-xs text-graphite' : 'text-xs text-signal'}>
          {t(message)}
        </p>
      )}
    </div>
  )
}

export function FingerFitPage() {
  const t = useT()
  const { config, load } = useDesign()
  const [method, setMethod] = useState<Method>('photo')
  const [width, setWidth] = useState<number | null>(null)
  const rec = width === null ? null : recommend(width)
  const clamp = (mm: number) => Math.round(Math.min(FINGER_RANGE.max, Math.max(FINGER_RANGE.min, mm)) * 10) / 10

  const apply = () => {
    if (!rec) return
    load(applyRecommendation(config, rec))
    window.location.hash = href('/configure')
  }

  return (
    <section className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('page.fingerFit.title')}</h1>
        <p className="mt-1 text-graphite">{t('page.fingerFit.summary')}</p>
        <p className="mt-2 text-xs text-graphite">{t('fit.privacy')}</p>
      </div>

      <div className="space-y-4 border border-ink bg-paper p-4">
        <ChoiceGroup
          label={t('fit.method')}
          value={method}
          options={(['photo', 'scan', 'manual'] as const).map((m) => ({ value: m, label: t(`fit.method.${m}`) }))}
          onChange={setMethod}
        />
        {method === 'photo' && <PhotoMeasure onWidth={(mm) => setWidth(clamp(mm))} />}
        {method === 'scan' && <ScanMeasure onWidth={(mm) => setWidth(clamp(mm))} />}
        {method === 'manual' && <p className="text-sm text-graphite">{t('fit.manual.howTo')}</p>}

        {/* Always editable, so a measurement can be corrected (and keyboard users can type it in) */}
        <ParamSlider
          label={t('fit.width')}
          note={width === null ? t('fit.widthNone') : undefined}
          value={width ?? 16}
          range={{ min: FINGER_RANGE.min, max: FINGER_RANGE.max, step: 0.1, unit: 'mm' }}
          onChange={setWidth}
        />
      </div>

      {rec && width !== null && (
        <section aria-labelledby="rec-title" className="space-y-3 border border-ink bg-paper p-4">
          <h2 id="rec-title" className="annotation">
            {fill(t('fit.recFor'), { width: width.toFixed(1) })}
          </h2>
          <dl className="grid gap-px border border-ink bg-rule sm:grid-cols-3">
            {[
              [t('field.profile'), PROFILE_NAMES[rec.profile]],
              [t('field.topForm'), `${t('form.concave')} · ${t('dish.auto')}`],
              [t('field.dishDepth'), `${rec.dishDepth.toFixed(2)} mm`],
            ].map(([label, value]) => (
              <div key={label} className="bg-card px-3 py-2">
                <dt className="annotation">{label}</dt>
                <dd className="font-mono">{value}</dd>
              </div>
            ))}
          </dl>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {rec.reasons.map((r) => (
              <li key={r.key}>{fill(t(r.key), r.values)}</li>
            ))}
          </ul>
          <p className="text-xs text-graphite">{t('fit.keepsRest')}</p>
          <Button onClick={apply}>{t('fit.apply')}</Button>
        </section>
      )}
    </section>
  )
}
