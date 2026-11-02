import { Button } from '@/components/ui/button'
import { FormSketch } from '@/components/layout/FormSketch'
import { useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { href } from '@/lib/router'
import { TOP_FORMS } from '@/model/options'
import { PagePlaceholder } from './placeholder'

const FLOW: StringKey[] = ['home.flow.1', 'home.flow.2', 'home.flow.3', 'home.flow.4', 'home.flow.5']

export function HomePage() {
  const t = useT()

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
      <p className="annotation">{t('home.kicker')}</p>
      <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-5xl">
        {t('home.title')}
      </h1>
      <p className="mt-4 max-w-xl text-graphite">{t('home.lead')}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <a href={href('/configure')}>{t('home.start')}</a>
        </Button>
        <Button asChild size="lg" variant="outline" className="border-ink bg-transparent">
          <a href={href('/finger-fit')}>{t('home.fingerFit')}</a>
        </Button>
      </div>

      <h2 className="annotation mt-14">{t('home.flow')}</h2>
      <ol className="mt-3 grid border border-ink sm:grid-cols-5">
        {FLOW.map((key, i) => (
          <li
            key={key}
            className="flex items-baseline gap-3 border-rule bg-paper px-4 py-3 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0"
          >
            <span className="font-mono text-xs text-signal">{String(i + 1).padStart(2, '0')}</span>
            <span className="text-sm">{t(key)}</span>
          </li>
        ))}
      </ol>

      <h2 className="annotation mt-14">{t('home.forms')}</h2>
      <ul className="mt-3 grid grid-cols-2 gap-px border border-ink bg-ink sm:grid-cols-5">
        {TOP_FORMS.map((form) => (
          <li key={form} className="bg-paper p-4">
            <FormSketch form={form} />
            <p className="mt-2 text-sm font-medium">{t(`form.${form}`)}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function FingerFitPage() {
  const t = useT()
  return <PagePlaceholder title={t('page.fingerFit.title')} summary={t('page.fingerFit.summary')} />
}

export function PresetsPage() {
  const t = useT()
  return <PagePlaceholder title={t('page.presets.title')} summary={t('page.presets.summary')} />
}

export function SettingsPage() {
  const t = useT()
  return <PagePlaceholder title={t('page.settings.title')} summary={t('page.settings.summary')} />
}
