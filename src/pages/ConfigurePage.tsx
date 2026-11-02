import { lazy, Suspense } from 'react'
import { SizeSection } from '@/components/panel/SizeSection'
import { useT } from '@/i18n/language'

// three.js is large; load it only when the configurator opens
const Viewport = lazy(() => import('@/components/viewport/Viewport'))

export function ConfigurePage() {
  const t = useT()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 lg:h-[calc(100dvh-10.5rem)] lg:flex-row">
      <section aria-labelledby="viewport-title" className="h-[55dvh] lg:order-2 lg:h-auto lg:flex-1">
        <h1 id="viewport-title" className="sr-only">
          {t('page.configure.title')}
        </h1>
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center border border-ink bg-paper">
              <p className="annotation">{t('viewport.loading')}</p>
            </div>
          }
        >
          <Viewport />
        </Suspense>
      </section>

      <aside aria-labelledby="parameters-title" className="border border-ink bg-paper lg:order-1 lg:w-80 lg:overflow-y-auto">
        <h2 id="parameters-title" className="annotation border-b border-ink px-4 py-2">
          {t('configure.parameters')}
        </h2>
        <SizeSection />
        <p className="px-4 py-6 text-sm text-graphite">{t('configure.parametersPending')}</p>
      </aside>
    </div>
  )
}
