import type { ComponentType } from 'react'
import { AppFooter } from '@/components/layout/AppFooter'
import { AppHeader } from '@/components/layout/AppHeader'
import { useT } from '@/i18n/language'
import { useRoute, type Route } from '@/lib/router'
import { ComparePage } from '@/pages/ComparePage'
import { ConfigurePage } from '@/pages/ConfigurePage'
import { FingerFitPage, HomePage } from '@/pages/pages'
import { PresetsPage } from '@/pages/PresetsPage'
import { SettingsPage } from '@/pages/SettingsPage'

const PAGES: Record<Route, ComponentType> = {
  '/': HomePage,
  '/configure': ConfigurePage,
  '/compare': ComparePage,
  '/finger-fit': FingerFitPage,
  '/presets': PresetsPage,
  '/settings': SettingsPage,
}

export default function App() {
  const route = useRoute()
  const t = useT()
  const Page = PAGES[route]

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        onClick={(e) => {
          // Plain #main would be read as a route by the hash router
          e.preventDefault()
          document.getElementById('main')?.focus()
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-ink focus:px-3 focus:py-2 focus:text-paper"
      >
        {t('app.skip')}
      </a>
      <AppHeader route={route} />
      <main id="main" tabIndex={-1} className="drawing-grid flex-1 outline-none">
        <Page />
      </main>
      <AppFooter route={route} />
    </div>
  )
}
