import { useT } from '@/i18n/language'
import { ROUTES, type Route } from '@/lib/router'

const pad = (n: number) => String(n).padStart(2, '0')

// Styled like the title block in the corner of a technical drawing
export function AppFooter({ route }: { route: Route }) {
  const t = useT()

  const cells = [
    [t('footer.drawing'), 'KC-01'],
    [t('footer.sheet'), `${pad(ROUTES.indexOf(route) + 1)} / ${pad(ROUTES.length)}`],
    [t('footer.units'), 'mm'],
    [t('footer.pitch'), '1u = 19.05'],
  ]

  return (
    <footer className="border-t border-ink bg-paper">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 sm:grid-cols-4">
        {cells.map(([label, value]) => (
          <div key={label} className="border-rule px-4 py-2 odd:border-r sm:not-last:border-r">
            <dt className="annotation">{label}</dt>
            <dd className="font-mono text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </footer>
  )
}
