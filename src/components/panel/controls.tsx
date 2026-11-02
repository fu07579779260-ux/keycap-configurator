import { useId, type ReactNode } from 'react'
import type { NumberRange } from '@/model/config'
import { cn } from '@/lib/utils'

const UNIT_LABEL: Record<NumberRange['unit'], string> = { mm: 'mm', deg: '°', u: 'u', '%': '%' }

/** Decimal places that match the step, e.g. 0.05 → 2, 0.25 → 2, 0.1 → 1. */
const decimals = (step: number) => String(step).split('.')[1]?.length ?? 0

interface SliderProps {
  label: string
  value: number
  range: NumberRange
  onChange: (value: number) => void
  /** Shown after the label, e.g. "profile" when the value is automatic. */
  note?: string
  action?: ReactNode
}

/** Range slider with a matching number box. Native inputs keep keyboard and screen reader support. */
export function ParamSlider({ label, value, range, onChange, note, action }: SliderProps) {
  const id = useId()
  const unit = UNIT_LABEL[range.unit]
  const shown = value.toFixed(decimals(range.step))

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-sm">
          {label}
          {note && <span className="annotation ml-2">{note}</span>}
        </label>
        {action}
      </div>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          aria-valuetext={`${shown} ${unit}`}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-6 flex-1 accent-ink"
        />
        <span className="flex items-center border border-ink bg-card">
          <input
            type="number"
            aria-label={`${label} (${unit})`}
            min={range.min}
            max={range.max}
            step={range.step}
            value={shown}
            onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
            className="w-16 bg-transparent px-1.5 py-1 text-right font-mono text-sm"
          />
          <span className="pr-1.5 font-mono text-xs text-graphite">{unit}</span>
        </span>
      </div>
    </div>
  )
}

interface ChoiceProps<T extends string> {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
  hint?: string
  columns?: number
}

/** Segmented single choice built from real radio buttons (arrow keys move between options). */
export function ChoiceGroup<T extends string>({ label, value, options, onChange, disabled, hint, columns }: ChoiceProps<T>) {
  const name = useId()

  return (
    <fieldset disabled={disabled} className="space-y-1.5 disabled:opacity-50">
      <legend className="text-sm">{label}</legend>
      {/* 1px gaps over a rule-coloured background draw the dividers, also when options wrap */}
      <div
        className="grid gap-px border border-ink bg-rule"
        style={{ gridTemplateColumns: `repeat(${columns ?? options.length}, minmax(0, 1fr))` }}
      >
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'relative cursor-pointer px-1 py-1.5 text-center font-mono text-xs',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal has-[:focus-visible]:-outline-offset-2',
              o.value === value ? 'bg-ink text-paper' : 'bg-card hover:bg-secondary',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-graphite">{hint}</p>}
    </fieldset>
  )
}

/** Native drop-down, for lists too long or too wordy for a segmented choice. */
export function SelectField<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full border border-ink bg-card px-2 py-1.5 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** On/off setting drawn as a small switch around a real checkbox. */
export function ToggleField({ label, checked, onChange, hint }: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  hint?: string
}) {
  return (
    <div className="space-y-1">
      <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
        {label}
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className={cn(
            'relative h-5 w-9 shrink-0 border border-ink transition-colors',
            'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-signal',
            checked ? 'bg-ink' : 'bg-card',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 size-3.5 transition-[left]',
              checked ? 'left-[1.1rem] bg-paper' : 'left-0.5 bg-ink',
            )}
          />
        </span>
      </label>
      {hint && <p className="text-xs text-graphite">{hint}</p>}
    </div>
  )
}

/** Titled block inside the parameter panel. */
export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-b border-ink">
      <h3 className="annotation border-b border-rule px-4 py-2">{title}</h3>
      <div className="space-y-5 px-4 py-4">{children}</div>
    </section>
  )
}
