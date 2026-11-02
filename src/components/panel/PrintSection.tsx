import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { cn } from '@/lib/utils'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { MATERIALS, TECHNOLOGIES, TECHNOLOGY_DEFAULTS, type Material } from '@/model/options'
import { findPreset, makeUserPreset, presetsFor } from '@/model/printers'
import { userPrinters, useUserPrinters } from '@/model/user-printers'
import { ChoiceGroup, PanelSection, ParamSlider, SelectField, ToggleField } from './controls'

/** Neutral filament colours plus a few accents; any colour can still be picked. */
const SWATCHES: { hex: string; name: StringKey }[] = [
  { hex: '#f2f2f0', name: 'colour.white' },
  { hex: '#1a1a1a', name: 'colour.black' },
  { hex: '#8a8a85', name: 'colour.grey' },
  { hex: '#d9480f', name: 'colour.orange' },
  { hex: '#2f5d8a', name: 'colour.blue' },
  { hex: '#3d7a4f', name: 'colour.green' },
  { hex: '#e8b923', name: 'colour.yellow' },
  { hex: '#b42318', name: 'colour.red' },
]

function ColourField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const t = useT()
  const id = useId()
  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm">{label}</legend>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map(({ hex, name }) => (
          <button
            key={hex}
            type="button"
            aria-label={t(name)}
            title={t(name)}
            aria-pressed={hex === value}
            onClick={() => onChange(hex)}
            className={cn('size-7 border', hex === value ? 'border-signal outline-2 outline-signal' : 'border-ink')}
            style={{ background: hex }}
          />
        ))}
        <label htmlFor={id} className="ml-1 flex items-center gap-1.5 text-xs text-graphite">
          <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-7 border border-ink bg-card" />
          {t('print.customColour')}
        </label>
      </div>
    </fieldset>
  )
}

export function PrintSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const userPresets = useUserPrinters()
  const m = config.manufacturing
  const presets = presetsFor(m.technology, userPresets)
  const current = findPreset(m.technology, m.printer, userPresets)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')

  const choosePrinter = (id: string) => {
    const preset = findPreset(m.technology, id, userPresets)
    patch('manufacturing', { printer: preset.id })
    patch('stem', { fitTolerance: preset.fitTolerance })
  }

  const savePreset = () => {
    const preset = makeUserPreset(name, m.technology, config.stem.fitTolerance, current.minWall, userPresets)
    userPrinters.add(preset)
    patch('manufacturing', { printer: preset.id })
    setNaming(false)
    setName('')
  }

  return (
    <PanelSection title={t('section.print')}>
      <ChoiceGroup
        label={t('field.technology')}
        value={m.technology}
        options={TECHNOLOGIES.map((tech) => ({ value: tech, label: t(`tech.${tech}`) }))}
        onChange={(technology) => patch('manufacturing', { technology })}
        hint={t(`tech.hint.${m.technology}`)}
      />

      <SelectField
        label={t('field.printer')}
        value={current.id}
        options={presets.map((p) => ({
          value: p.id,
          label: `${p.id === 'generic' ? t('printer.generic') : p.name} · ${p.fitTolerance >= 0 ? '+' : ''}${p.fitTolerance.toFixed(2)} mm`,
        }))}
        onChange={choosePrinter}
      />
      {naming ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            savePreset()
          }}
        >
          <input
            autoFocus
            aria-label={t('printer.name')}
            placeholder={t('printer.name')}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 border border-ink bg-card px-2 py-1 text-sm"
          />
          <Button type="submit" size="sm">
            {t('printer.save')}
          </Button>
          <Button type="button" size="sm" variant="outline" className="border-ink" onClick={() => setNaming(false)}>
            {t('printer.cancel')}
          </Button>
        </form>
      ) : (
        <button type="button" onClick={() => setNaming(true)} className="text-xs text-graphite underline underline-offset-2 hover:text-ink">
          {t('printer.saveCurrent')}
        </button>
      )}

      <ChoiceGroup
        label={t('field.material')}
        value={m.material as Material}
        options={MATERIALS[m.technology].map((mat) => ({ value: mat, label: t(`material.${mat}`) }))}
        onChange={(material) => patch('manufacturing', { material })}
        // The model keeps material as a string; sanitising guarantees it is one of this technology's materials
        hint={t(`material.hint.${m.material as Material}`)}
      />

      <ColourField label={t('field.mainColour')} value={m.mainColour} onChange={(mainColour) => patch('manufacturing', { mainColour })} />

      <ToggleField
        label={t('field.twoColours')}
        checked={m.secondColour !== null}
        onChange={(on) => patch('manufacturing', { secondColour: on ? '#1a1a1a' : null })}
        hint={t('field.twoColoursHint')}
      />
      {m.secondColour !== null && (
        <ColourField
          label={t('field.secondColour')}
          value={m.secondColour}
          onChange={(secondColour) => patch('manufacturing', { secondColour })}
        />
      )}

      <ParamSlider
        label={t('field.translucency')}
        value={m.translucency}
        range={RANGES.manufacturing.translucency}
        onChange={(translucency) => patch('manufacturing', { translucency })}
      />

      <p className="text-xs text-graphite">
        {t('print.defaults')} {TECHNOLOGY_DEFAULTS[m.technology].minWall.toFixed(1)} mm ·{' '}
        {t('print.minStroke')} {TECHNOLOGY_DEFAULTS[m.technology].minLegendStroke.toFixed(1)} mm
      </p>
    </PanelSection>
  )
}
