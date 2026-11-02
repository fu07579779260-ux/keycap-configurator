import { useEffect, useRef, useState, type ComponentType } from 'react'
import { Button } from '@/components/ui/button'
import { fill, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { cn } from '@/lib/utils'
import { ChecksSection } from './ChecksSection'
import { ExportSection } from './ExportSection'
import { LegendSection } from './LegendSection'
import { PrintSection } from './PrintSection'
import { ShareSection } from './ShareSection'
import { SizeSection } from './SizeSection'
import { StemSection } from './StemSection'
import { TopSection } from './TopSection'

type Mode = 'wizard' | 'expert'

/** Wizard steps (PLAN.md §7): each shows one or more panel sections. */
const STEPS: { title: StringKey; intro: StringKey; sections: ComponentType[] }[] = [
  { title: 'step.stem', intro: 'step.stem.intro', sections: [StemSection] },
  { title: 'step.size', intro: 'step.size.intro', sections: [SizeSection] },
  { title: 'step.top', intro: 'step.top.intro', sections: [TopSection] },
  { title: 'step.legend', intro: 'step.legend.intro', sections: [LegendSection] },
  { title: 'step.print', intro: 'step.print.intro', sections: [PrintSection, ChecksSection] },
  { title: 'step.export', intro: 'step.export.intro', sections: [ChecksSection, ExportSection, ShareSection] },
]

/** Expert mode: everything at once, in the order people usually tweak things. */
const EXPERT: ComponentType[] = [
  TopSection,
  LegendSection,
  SizeSection,
  StemSection,
  PrintSection,
  ChecksSection,
  ExportSection,
  ShareSection,
]

const MODE_KEY = 'keycap.mode'

function loadMode(): Mode {
  try {
    return localStorage.getItem(MODE_KEY) === 'expert' ? 'expert' : 'wizard'
  } catch {
    return 'wizard'
  }
}

function saveMode(mode: Mode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Not remembered; the default (wizard) comes back next visit
  }
}

export function ConfigurePanel() {
  const t = useT()
  const [mode, setMode] = useState<Mode>(loadMode)
  const [step, setStep] = useState(0)
  const stepHeading = useRef<HTMLHeadingElement>(null)
  const scrollArea = useRef<HTMLDivElement>(null)
  // Skip moving focus on the first render; only after the user changes step
  const changedStep = useRef(false)

  useEffect(() => {
    if (!changedStep.current) return
    // Keyboard and screen-reader users land on the new step's title; the panel starts at the top
    stepHeading.current?.focus()
    scrollArea.current?.scrollTo({ top: 0 })
  }, [step])

  const goTo = (n: number) => {
    changedStep.current = true
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)))
  }

  const chooseMode = (next: Mode) => {
    setMode(next)
    saveMode(next)
  }

  const current = STEPS[step]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-ink px-4 py-2">
        <h2 id="parameters-title" className="annotation">
          {t('configure.parameters')}
        </h2>
        <div role="group" aria-label={t('mode.label')} className="flex border border-ink">
          {(['wizard', 'expert'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => chooseMode(m)}
              className={cn('px-2 py-0.5 font-mono text-[11px]', mode === m ? 'bg-ink text-paper' : 'hover:bg-secondary')}
            >
              {t(`mode.${m}`)}
            </button>
          ))}
        </div>
      </div>

      {mode === 'wizard' ? (
        <>
          <nav aria-label={t('step.nav')} className="border-b border-ink">
            <ol className="grid grid-cols-6 gap-px bg-rule">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={i === step ? 'step' : undefined}
                    aria-label={`${i + 1}. ${t(s.title)}`}
                    title={t(s.title)}
                    className={cn(
                      'w-full py-1.5 font-mono text-xs',
                      i === step ? 'bg-ink text-paper' : i < step ? 'bg-secondary' : 'bg-card hover:bg-secondary',
                    )}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                </li>
              ))}
            </ol>
          </nav>
          <div ref={scrollArea} className="flex-1 overflow-y-auto">
            <h3 ref={stepHeading} tabIndex={-1} className="px-4 pt-4 text-lg font-semibold outline-none">
              <span className="annotation block text-signal">
                {fill(t('step.counter'), { n: String(step + 1), total: String(STEPS.length) })}
              </span>
              {/* Pause between "Step 2 of 6" and the title when read aloud */}
              <span className="sr-only">: </span>
              {t(current.title)}
            </h3>
            <p className="px-4 pt-1 text-sm text-graphite">{t(current.intro)}</p>
            {current.sections.map((Section, i) => (
              <Section key={i} />
            ))}
          </div>
          <div className="flex gap-2 border-t border-ink p-3">
            <Button variant="outline" className="flex-1 border-ink" onClick={() => goTo(step - 1)} disabled={step === 0}>
              ← {t('step.back')}
            </Button>
            {step < STEPS.length - 1 ? (
              <Button className="flex-1" onClick={() => goTo(step + 1)}>
                {t(STEPS[step + 1].title)} →
              </Button>
            ) : (
              <Button className="flex-1" onClick={() => chooseMode('expert')}>
                {t('step.toExpert')}
              </Button>
            )}
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {EXPERT.map((Section, i) => (
            <Section key={i} />
          ))}
        </div>
      )}
    </div>
  )
}
