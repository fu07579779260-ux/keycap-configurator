import { useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { href, ROUTES, type Route } from '@/lib/router'
import { cn } from '@/lib/utils'
import { KeycapMark } from './KeycapMark'
import { LanguageSwitch } from './LanguageSwitch'
import { VoiceToggle } from './VoiceToggle'

const NAV_LABELS: Record<Route, StringKey> = {
  '/': 'nav.home',
  '/configure': 'nav.configure',
  '/compare': 'nav.compare',
  '/finger-fit': 'nav.fingerFit',
  '/presets': 'nav.presets',
  '/settings': 'nav.settings',
}

export function AppHeader({ route }: { route: Route }) {
  const t = useT()

  return (
    <header className="border-b border-ink bg-paper">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <a href={href('/')} className="flex items-center gap-2">
          <KeycapMark className="size-7" />
          <span className="font-semibold tracking-tight">{t('app.title')}</span>
        </a>
        <div className="ml-auto flex items-center gap-2">
          <VoiceToggle />
          <LanguageSwitch />
        </div>
      </div>
      <nav aria-label={t('nav.label')} className="border-t border-rule">
        {/* Scrolls sideways on narrow screens instead of wrapping */}
        <ul className="mx-auto flex max-w-6xl overflow-x-auto px-2">
          {ROUTES.map((r) => (
            <li key={r} className="shrink-0">
              <a
                href={href(r)}
                aria-current={r === route ? 'page' : undefined}
                className={cn(
                  'block border-b-2 px-3 py-2 text-sm',
                  r === route
                    ? 'border-signal font-medium'
                    : 'border-transparent text-graphite hover:text-ink',
                )}
              >
                {t(NAV_LABELS[r])}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
