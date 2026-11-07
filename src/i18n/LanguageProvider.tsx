import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, loadLanguage, saveLanguage } from './language'
import type { Language } from './strings'
import { setSpeechLanguage } from '@/voice/speech'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(loadLanguage)

  // Keep <html lang> in sync so screen readers switch pronunciation
  // …and the voice feedback speaks the same language as the interface
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
    setSpeechLanguage(lang)
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang: (next: Language) => {
        saveLanguage(next)
        setLangState(next)
      },
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
