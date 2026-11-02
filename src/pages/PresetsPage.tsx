import { describeDesign } from '@/components/compare/describe'
import { Button } from '@/components/ui/button'
import { useLanguage, useT } from '@/i18n/language'
import { href } from '@/lib/router'
import type { KeycapConfig } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { PRESETS } from '@/model/presets'
import { savedDesigns, useSavedDesigns } from '@/persistence/saved-designs'

export function PresetsPage() {
  const t = useT()
  const { lang } = useLanguage()
  const { load } = useDesign()
  const saved = useSavedDesigns()

  const open = (config: KeycapConfig) => {
    load(config)
    window.location.hash = href('/configure')
  }

  return (
    <section className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('page.presets.title')}</h1>
        <p className="mt-1 text-graphite">{t('page.presets.summary')}</p>
      </div>

      <section aria-labelledby="builtin-title" className="space-y-3">
        <h2 id="builtin-title" className="annotation">
          {t('presets.builtin')}
        </h2>
        <ul className="grid gap-px border border-ink bg-ink sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <li key={p.id} className="flex flex-col gap-2 bg-paper p-4">
              <h3 className="font-medium">{t(p.name)}</h3>
              <p className="flex-1 text-sm text-graphite">{t(p.description)}</p>
              <p className="font-mono text-[11px] text-graphite">{describeDesign(p.config, t)}</p>
              <Button size="sm" className="self-start" onClick={() => open(p.config)}>
                {t('presets.open')}
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="mine-title" className="space-y-3">
        <h2 id="mine-title" className="annotation">
          {t('presets.mine')}
        </h2>
        {saved.length === 0 ? (
          <p className="border border-dashed border-rule bg-paper/80 px-4 py-6 text-sm text-graphite">{t('presets.mineEmpty')}</p>
        ) : (
          <ul className="divide-y divide-rule border border-ink bg-paper">
            {saved.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{d.name}</span>
                  <span className="block font-mono text-[11px] text-graphite">
                    {new Date(d.savedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-GB')} · {describeDesign(d.config, t)}
                  </span>
                </span>
                <Button size="sm" onClick={() => open(d.config)}>
                  {t('presets.open')}
                </Button>
                <Button size="sm" variant="ghost" aria-label={`${t('presets.delete')}: ${d.name}`} onClick={() => savedDesigns.remove(d.id)}>
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
