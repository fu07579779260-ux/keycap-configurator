import { useId } from 'react'
import { bodyParams } from '@/geometry/body'
import { brailleCells, brailleWidth } from '@/geometry/braille'
import { useT } from '@/i18n/language'
import { MAX_BRAILLE_LENGTH, MAX_TEXT_LENGTH, RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { ICONS, LEGEND_TYPES, TEXT_MODES } from '@/model/options'
import { ChoiceGroup, PanelSection, ParamSlider } from './controls'

/** Unicode Braille pattern for a cell (dots 1–6 → bits 0–5), for an on-screen preview. */
const brailleChar = (dots: number[]) => String.fromCodePoint(0x2800 + dots.reduce((bits, d) => bits | (1 << (d - 1)), 0))

function TextField({ label, value, maxLength, onChange, hint }: {
  label: string
  value: string
  maxLength: number
  onChange: (value: string) => void
  hint?: string
}) {
  const id = useId()
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      <input
        id={id}
        value={value}
        // maxLength counts UTF-16 units; the model trims by character as well
        maxLength={maxLength * 2}
        onChange={(e) => onChange(Array.from(e.target.value).slice(0, maxLength).join(''))}
        className="w-full border border-ink bg-card px-2 py-1.5 font-mono text-sm"
        autoComplete="off"
        spellCheck={false}
      />
      {hint && <p className="text-xs text-graphite">{hint}</p>}
    </div>
  )
}

export function LegendSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const { legend } = config
  const topWidth = bodyParams(config).topWidth
  const brailleTooWide = brailleWidth(legend.brailleText, legend.brailleDotSpacing) + legend.brailleDotDiameter > topWidth

  return (
    <PanelSection title={t('section.legend')}>
      <ChoiceGroup
        label={t('field.legendType')}
        value={legend.type}
        options={LEGEND_TYPES.map((l) => ({ value: l, label: t(`legend.${l}`) }))}
        onChange={(type) => patch('legend', { type })}
      />

      {legend.type === 'text' && (
        <TextField
          label={t('field.legendText')}
          value={legend.text}
          maxLength={MAX_TEXT_LENGTH}
          onChange={(text) => patch('legend', { text })}
          hint={t('legend.textHint')}
        />
      )}

      {legend.type === 'braille' && (
        <>
          <TextField
            label={t('field.brailleText')}
            value={legend.brailleText}
            maxLength={MAX_BRAILLE_LENGTH}
            onChange={(brailleText) => patch('legend', { brailleText })}
            hint={t('legend.brailleHint')}
          />
          <p className="flex items-baseline gap-2 text-sm">
            <span className="annotation">{t('legend.braillePreview')}</span>
            <span aria-hidden="true" className="text-2xl leading-none tracking-widest">
              {brailleCells(legend.brailleText).map(brailleChar).join('') || '—'}
            </span>
          </p>
          {brailleTooWide && <p className="text-xs text-signal">{t('legend.brailleTooWide')}</p>}
          <ParamSlider
            label={t('field.brailleDotDiameter')}
            value={legend.brailleDotDiameter}
            range={RANGES.legend.brailleDotDiameter}
            onChange={(brailleDotDiameter) => patch('legend', { brailleDotDiameter })}
          />
          <ParamSlider
            label={t('field.brailleDotHeight')}
            value={legend.brailleDotHeight}
            range={RANGES.legend.brailleDotHeight}
            onChange={(brailleDotHeight) => patch('legend', { brailleDotHeight })}
          />
          <ParamSlider
            label={t('field.brailleDotSpacing')}
            value={legend.brailleDotSpacing}
            range={RANGES.legend.brailleDotSpacing}
            onChange={(brailleDotSpacing) => patch('legend', { brailleDotSpacing })}
          />
        </>
      )}

      {legend.type === 'icon' && (
        <ChoiceGroup
          label={t('field.icon')}
          value={legend.icon}
          options={ICONS.map((i) => ({ value: i, label: t(`icon.${i}`) }))}
          onChange={(icon) => patch('legend', { icon })}
          columns={2}
        />
      )}

      {(legend.type === 'text' || legend.type === 'icon') && (
        <>
          <ChoiceGroup
            label={t('field.textMode')}
            value={legend.textMode}
            options={TEXT_MODES.map((m) => ({ value: m, label: t(`textMode.${m}`) }))}
            onChange={(textMode) => patch('legend', { textMode })}
          />
          <ParamSlider
            label={t('field.textSize')}
            value={legend.textSize}
            range={RANGES.legend.textSize}
            onChange={(textSize) => patch('legend', { textSize })}
          />
          <ParamSlider
            label={legend.textMode === 'raised' ? t('field.textHeight') : t('field.textDepth')}
            value={legend.textDepth}
            range={RANGES.legend.textDepth}
            onChange={(textDepth) => patch('legend', { textDepth })}
          />
        </>
      )}

      {legend.type !== 'none' && (
        <>
          <ParamSlider
            label={t('field.markerX')}
            value={legend.offsetX}
            range={RANGES.legend.offsetX}
            onChange={(offsetX) => patch('legend', { offsetX })}
          />
          <ParamSlider
            label={t('field.markerY')}
            value={legend.offsetY}
            range={RANGES.legend.offsetY}
            onChange={(offsetY) => patch('legend', { offsetY })}
          />
        </>
      )}
    </PanelSection>
  )
}
