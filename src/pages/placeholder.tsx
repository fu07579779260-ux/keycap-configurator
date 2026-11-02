import { useT } from '@/i18n/language'

// Shared shell for pages that are not built yet
export function PagePlaceholder({ title, summary }: { title: string; summary: string }) {
  const t = useT()

  return (
    <section className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-graphite">{summary}</p>
      <p className="annotation mt-8 border border-dashed border-rule bg-paper/80 px-4 py-6">
        {t('page.pending')}
      </p>
    </section>
  )
}
