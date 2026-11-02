import { useLanguage, useT } from '@/i18n/language'
import type { Language } from '@/i18n/strings'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Language; label: string; lang: string }[] = [
  { value: 'en', label: 'EN', lang: 'en' },
  { value: 'zh', label: '中文', lang: 'zh-CN' },
]

export function LanguageSwitch() {
  const { lang, setLang } = useLanguage()
  const t = useT()

  return (
    <div role="group" aria-label={t('lang.label')} className="flex border border-ink">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.lang}
          aria-pressed={lang === o.value}
          onClick={() => setLang(o.value)}
          className={cn(
            'min-w-11 px-2.5 py-1 font-mono text-xs',
            lang === o.value ? 'bg-ink text-paper' : 'hover:bg-secondary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
