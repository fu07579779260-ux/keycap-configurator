import { useState, type ReactNode } from 'react'
import { LanguageSwitch } from '@/components/layout/LanguageSwitch'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/language'
import { ToggleField } from '@/components/panel/controls'
import { useDesign } from '@/model/design-context'
import { displayStore, useDisplay } from '@/model/display'
import { userPrinters, useUserPrinters } from '@/model/user-printers'
import { stopAutosave } from '@/persistence/session'
import { clearAllStorage } from '@/persistence/storage'
import { keyName } from '@/voice/key-names'
import { KEY_TESTER_ATTR } from '@/voice/legend-speech'
import { speechSupported } from '@/voice/speech'

/** Press keys here to hear (and see) their names: handy for checking freshly installed keycaps. */
function KeyTester({ enabled }: { enabled: boolean }) {
  const t = useT()
  const [last, setLast] = useState<string | null>(null)
  return (
    <div
      {...{ [KEY_TESTER_ATTR]: '' }}
      tabIndex={0}
      role="application"
      aria-label={t('settings.keyTester')}
      onKeyDown={(e) => {
        // Keep Tab working so keyboard users can leave the box
        if (e.key !== 'Tab') e.preventDefault()
        setLast(keyName(e))
      }}
      className="flex min-h-24 flex-col items-center justify-center gap-1 border border-dashed border-ink bg-card p-4 text-center"
    >
      <span className="annotation">{t('settings.keyTester')}</span>
      <span aria-live="polite" className="font-mono text-2xl">
        {last ?? '—'}
      </span>
      <span className="text-xs text-graphite">{enabled ? t('settings.keyTesterHint') : t('settings.keyTesterSilent')}</span>
    </div>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border border-ink bg-paper p-4">
      <h2 className="annotation">{title}</h2>
      {children}
    </section>
  )
}

export function SettingsPage() {
  const t = useT()
  const { reset } = useDesign()
  const printers = useUserPrinters()
  const display = useDisplay()
  const [resetDone, setResetDone] = useState(false)

  const clearAll = () => {
    if (!window.confirm(t('settings.clearConfirm'))) return
    stopAutosave()
    clearAllStorage()
    // Start again as on a first visit: every store reloads from (now empty) storage
    window.location.reload()
  }

  return (
    <section className="mx-auto max-w-3xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('page.settings.title')}</h1>
        <p className="mt-1 text-graphite">{t('page.settings.summary')}</p>
      </div>

      <Block title={t('lang.label')}>
        <div className="flex">
          <LanguageSwitch />
        </div>
      </Block>

      <Block title={t('settings.accessibility')}>
        <ToggleField label={t('settings.largeText')} checked={display.largeText} onChange={(largeText) => displayStore.set({ largeText })} />
        <ToggleField
          label={t('settings.highContrast')}
          checked={display.highContrast}
          onChange={(highContrast) => displayStore.set({ highContrast })}
        />
        <ToggleField
          label={t('settings.voice')}
          checked={display.voice}
          onChange={(voice) => displayStore.set({ voice })}
          hint={speechSupported() ? t('settings.voiceHint') : t('settings.voiceUnsupported')}
        />
        <KeyTester enabled={display.voice} />
      </Block>

      <Block title={t('settings.printers')}>
        {printers.length === 0 ? (
          <p className="text-sm text-graphite">{t('settings.printersEmpty')}</p>
        ) : (
          <ul className="divide-y divide-rule border border-rule">
            {printers.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="flex-1">
                  {p.name}
                  <span className="ml-2 font-mono text-xs text-graphite">
                    {t(`tech.${p.technology}`)} · +{p.fitTolerance.toFixed(2)} mm
                  </span>
                </span>
                <Button size="sm" variant="ghost" aria-label={`${t('presets.delete')}: ${p.name}`} onClick={() => userPrinters.remove(p.id)}>
                  ✕
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={t('settings.data')}>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-ink"
            onClick={() => {
              reset()
              setResetDone(true)
            }}
          >
            {t('settings.resetDesign')}
          </Button>
          <Button variant="destructive" onClick={clearAll}>
            {t('settings.clearAll')}
          </Button>
        </div>
        <p role="status" className="text-xs text-graphite">
          {resetDone ? t('share.resetDone') : t('settings.dataHint')}
        </p>
      </Block>
    </section>
  )
}
