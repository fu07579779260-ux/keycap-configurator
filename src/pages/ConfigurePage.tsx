import { lazy, Suspense } from 'react'
import { KeyboardEditBanner } from '@/components/keyboard/KeyboardEditBanner'
import { ConfigurePanel } from '@/components/panel/ConfigurePanel'
import { ViewportErrorBoundary } from '@/components/viewport/ViewportErrorBoundary'
import { useT } from '@/i18n/language'

// three.js is large; load it only when the configurator opens
const Viewport = lazy(() => import('@/components/viewport/Viewport'))

export function ConfigurePage() {
  const t = useT()

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 lg:h-[calc(100dvh-10.5rem)]">
      <KeyboardEditBanner />
      <div className="flex flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
        <section aria-labelledby="viewport-title" className="h-[55dvh] lg:order-2 lg:h-auto lg:flex-1">
          <h1 id="viewport-title" className="sr-only">
            {t('page.configure.title')}
          </h1>
          <ViewportErrorBoundary message={t('viewport.failed')}>
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center border border-ink bg-paper">
                  <p className="annotation">{t('viewport.loading')}</p>
                </div>
              }
            >
              <Viewport />
            </Suspense>
          </ViewportErrorBoundary>
        </section>

        {/* relative: keeps absolutely positioned sr-only inputs inside the scroll area instead of stretching the page */}
        <aside aria-labelledby="parameters-title" className="relative border border-ink bg-paper lg:order-1 lg:w-80 lg:overflow-hidden">
          <ConfigurePanel />
        </aside>
      </div>
    </div>
  )
}
