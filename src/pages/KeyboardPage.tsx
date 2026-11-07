import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SelectField } from '@/components/panel/controls'
import { Button } from '@/components/ui/button'
import { ViewportErrorBoundary } from '@/components/viewport/ViewportErrorBoundary'
import type { KeyboardView } from '@/components/keyboard/KeyboardScene'
import { fill, useT } from '@/i18n/language'
import { endKeyboardEdit, keyboardEditChanged, startKeyboardEdit } from '@/keyboard/edit-session'
import { findKey, LAYOUT_KEYS, LAYOUTS, type LayoutId } from '@/keyboard/layouts'
import { keyboardStore, useKeyboardSettings } from '@/keyboard/keyboard-store'
import { fittingKeys, placeDesign, rowMismatch } from '@/keyboard/placement'
import { href } from '@/lib/router'
import { useDesign } from '@/model/design-context'
import { prefersReducedMotion, useDisplay } from '@/model/display'
import { keyName } from '@/voice/key-names'
import { claimKeyVoice } from '@/voice/key-voice'
import { speak } from '@/voice/speech'

// three.js is large; load it only when this page opens
const KeyboardScene = lazy(() => import('@/components/keyboard/KeyboardScene'))

const VIEWS: KeyboardView[] = ['angled', 'top', 'front']

/** Keys whose browser action (scrolling, reloading, help) would get in the way of trying keys. */
const BLOCKED_DEFAULTS = /^(Space|Arrow\w+|PageUp|PageDown|Home|End|Backspace|Slash|Quote|F\d{1,2})$/

/** Typing in a form field (or a drop-down) is not a key test. */
function isFormField(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.matches('input:not([type=checkbox]):not([type=radio]), textarea, select'))
  )
}

/** Focus on a control: let Space and Enter work it as usual. */
const isControl = (target: EventTarget | null) =>
  target instanceof HTMLElement && target.matches('button, a[href], summary, input, [role=button]')

const nameOf = (code: string) => keyName({ code, key: '' }) || code

export function KeyboardPage() {
  const t = useT()
  const { config, patch } = useDesign()
  const { voice } = useDisplay()
  const settings = useKeyboardSettings()
  const keys = LAYOUT_KEYS[settings.layout]
  const placed = placeDesign(keys, config.size.widthU, settings.position)
  const fits = useMemo(() => fittingKeys(keys, config.size.widthU), [keys, config.size.widthU])

  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set())
  const [last, setLast] = useState<{ code: string; onLayout: boolean } | null>(null)
  const [placing, setPlacing] = useState(false)
  const [view, setView] = useState<{ mode: KeyboardView; n: number }>({ mode: 'angled', n: 0 })
  // Back from "Edit this keycap": confirm the keyboard shows the edited keycap, then end the edit
  const [updated] = useState(() => keyboardEditChanged(config))
  useEffect(() => endKeyboardEdit(), [])
  const reducedMotion = prefersReducedMotion()
  const voiceOn = useRef(voice)
  voiceOn.current = voice
  const keysRef = useRef(keys)
  keysRef.current = keys

  const press = useCallback((code: string, say = true) => {
    setPressed((p) => (p.has(code) ? p : new Set(p).add(code)))
    setLast({ code, onLayout: Boolean(findKey(keysRef.current, code)) })
    if (say && voiceOn.current) speak(nameOf(code))
  }, [])
  const release = useCallback((code: string) => {
    setPressed((p) => {
      if (!p.has(code)) return p
      const next = new Set(p)
      next.delete(code)
      return next
    })
  }, [])

  // Physical keyboard → simulator
  useEffect(() => {
    const unclaim = claimKeyVoice()
    const onDown = (e: KeyboardEvent) => {
      if (isFormField(e.target) || !e.code) return
      if (e.code === 'Escape' && placing) {
        setPlacing(false)
        return
      }
      // Keep Tab, Esc and the controls' own Space/Enter working
      const control = isControl(e.target) && (e.code === 'Space' || e.code === 'Enter' || e.code === 'NumpadEnter')
      const onCanvas = e.target instanceof HTMLCanvasElement
      if (!control && !onCanvas && !e.ctrlKey && !e.metaKey && !e.altKey && BLOCKED_DEFAULTS.test(e.code)) e.preventDefault()
      press(e.code, !e.repeat)
    }
    const onUp = (e: KeyboardEvent) => release(e.code)
    // Keys let go while the window was in the background never send keyup
    const releaseAll = () => setPressed(new Set())
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    window.addEventListener('blur', releaseAll)
    return () => {
      unclaim()
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', releaseAll)
    }
  }, [press, release, placing])

  // A mouse press ends wherever the button is let go
  useEffect(() => {
    const up = () => setPressed((p) => (p.size === 0 ? p : new Set()))
    window.addEventListener('pointerup', up)
    return () => window.removeEventListener('pointerup', up)
  }, [])

  const place = (code: string) => {
    keyboardStore.set({ position: code })
    setPlacing(false)
  }

  const mismatch = placed ? rowMismatch(config, placed) : null
  const placingSet = useMemo(() => (placing ? new Set(fits.map((k) => k.code)) : null), [placing, fits])
  const width = String(config.size.widthU)
  const label = placed ? fill(t('keyboard.label'), { key: nameOf(placed.code) }) : t('keyboard.labelBeside')

  return (
    <section className="mx-auto max-w-6xl space-y-4 px-4 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('page.keyboard.title')}</h1>
        <p className="mt-1 text-graphite">{t('page.keyboard.summary')}</p>
      </div>

      <div className="grid gap-3 border border-ink bg-paper p-4 sm:grid-cols-[repeat(2,minmax(0,14rem))_1fr] sm:items-end">
        <SelectField<LayoutId>
          label={t('keyboard.layout')}
          value={settings.layout}
          options={LAYOUTS.map((id) => ({ value: id, label: t(`keyboard.layout.${id}`) }))}
          onChange={(layout) => {
            setPlacing(false)
            keyboardStore.set({ layout })
          }}
        />
        {placed && (
          <SelectField
            label={t('keyboard.position')}
            value={placed.code}
            options={fits.map((k) => ({ value: k.code, label: nameOf(k.code) }))}
            onChange={place}
          />
        )}
        <div className="flex flex-wrap gap-2 sm:col-start-3 sm:justify-end">
          {placed && fits.length > 1 && (
            <Button
              variant="outline"
              aria-pressed={placing}
              className="border-ink aria-pressed:bg-ink aria-pressed:text-paper"
              onClick={() => setPlacing((p) => !p)}
            >
              {placing ? t('keyboard.pickCancel') : t('keyboard.pick')}
            </Button>
          )}
          <Button asChild>
            <a href={href('/configure')} onClick={() => startKeyboardEdit(config)}>
              {t('keyboard.edit')}
            </a>
          </Button>
        </div>
        <div role="status" className="space-y-2 text-sm sm:col-span-3 empty:hidden">
          {updated && (
            <p>
              <span aria-hidden className="mr-1.5 font-semibold text-signal">✓</span>
              {t('keyboard.updated')}
            </p>
          )}
          {placing && <p>{fill(t('keyboard.pickHint'), { width })}</p>}
          {!placed && <p className="text-signal">{fill(t('keyboard.noFit'), { width })}</p>}
          {mismatch && (
            <p className="flex flex-wrap items-center gap-2 text-signal">
              {fill(t('keyboard.rowMismatch'), { row: mismatch, design: config.size.row })}
              <Button size="sm" variant="outline" className="border-ink" onClick={() => patch('size', { row: mismatch })}>
                {fill(t('keyboard.useRow'), { row: mismatch })}
              </Button>
            </p>
          )}
        </div>
      </div>

      <div className="relative h-[62dvh] min-h-96 border border-ink bg-paper">
        <ViewportErrorBoundary message={t('viewport.failed')}>
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center">
                <p className="annotation">{t('viewport.loading')}</p>
              </div>
            }
          >
            <KeyboardScene
              keys={keys}
              config={config}
              placed={placed}
              pressed={pressed}
              placing={placingSet}
              reducedMotion={reducedMotion}
              view={view}
              label={label}
              noWebgl={t('viewport.noWebgl')}
              onPress={press}
              onRelease={release}
              onPlace={place}
              onResetView={() => setView((v) => ({ mode: 'angled', n: v.n + 1 }))}
            />
          </Suspense>
        </ViewportErrorBoundary>

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          <div className="bg-paper/85 px-2 py-1">
            <p className="annotation">{t('keyboard.lastKey')}</p>
            <p aria-live="polite" className="font-mono text-xl">
              {last ? nameOf(last.code) : t('keyboard.pressHint')}
              {last && !last.onLayout && <span className="ml-2 text-xs text-graphite">({t('keyboard.notOnLayout')})</span>}
            </p>
          </div>
          <div role="group" aria-label={t('keyboard.view')} className="pointer-events-auto flex flex-wrap justify-end gap-2">
            {VIEWS.map((mode) => (
              <Button
                key={mode}
                size="sm"
                variant="outline"
                aria-pressed={view.mode === mode}
                className="border-ink bg-paper aria-pressed:bg-ink aria-pressed:text-paper"
                onClick={() => setView((v) => ({ mode, n: v.n + 1 }))}
              >
                {t(`keyboard.view.${mode}`)}
              </Button>
            ))}
            <Button
              size="sm"
              variant="outline"
              className="border-ink bg-paper"
              onClick={() => setView((v) => ({ mode: 'angled', n: v.n + 1 }))}
            >
              {t('viewport.resetView')}
            </Button>
          </div>
        </div>
        <p id="keyboard-keys" className="annotation pointer-events-none absolute inset-x-0 bottom-0 p-3">
          {t('keyboard.hint')}
        </p>
      </div>
    </section>
  )
}
