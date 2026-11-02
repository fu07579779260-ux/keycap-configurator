import { useId } from 'react'
import { FormSketch } from '@/components/layout/FormSketch'
import { PROFILE_SHAPES } from '@/geometry/profiles'
import { useT } from '@/i18n/language'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { DISH_SHAPES, SLOPE_DIRECTIONS, TOP_FORMS, type TopForm } from '@/model/options'
import { cn } from '@/lib/utils'
import { ChoiceGroup, PanelSection, ParamSlider } from './controls'

/** Form choice drawn as five small side-view sketches (real radio buttons underneath). */
function FormPicker({ value, onChange }: { value: TopForm; onChange: (form: TopForm) => void }) {
  const t = useT()
  const name = useId()

  return (
    <fieldset className="space-y-1.5">
      <legend className="text-sm">{t('field.topForm')}</legend>
      <div className="grid grid-cols-5 gap-px border border-ink bg-rule">
        {TOP_FORMS.map((form) => (
          <label
            key={form}
            className={cn(
              'cursor-pointer px-1 pt-1.5 pb-1 text-center',
              'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal has-[:focus-visible]:-outline-offset-2',
              form === value ? 'bg-ink text-paper' : 'bg-card hover:bg-secondary',
            )}
          >
            <input
              type="radio"
              name={name}
              value={form}
              checked={form === value}
              onChange={() => onChange(form)}
              className="sr-only"
            />
            <FormSketch form={form} />
            <span className="block text-[11px] leading-tight">{t(`form.${form}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function TopSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const { top } = config
  const profileDish = PROFILE_SHAPES[config.size.profile].dish

  return (
    <PanelSection title={t('section.top')}>
      <FormPicker value={top.form} onChange={(form) => patch('top', { form })} />

      {top.form === 'concave' && (
        <>
          <ChoiceGroup
            label={t('field.dishShape')}
            value={top.dishShape}
            options={DISH_SHAPES.map((d) => ({
              value: d,
              label: d === 'auto' ? `${t('dish.auto')} (${t(`dish.${profileDish}`)})` : t(`dish.${d}`),
            }))}
            onChange={(dishShape) => patch('top', { dishShape })}
            columns={3}
          />
          <ParamSlider
            label={t('field.dishDepth')}
            value={top.dishDepth}
            range={RANGES.top.dishDepth}
            onChange={(dishDepth) => patch('top', { dishDepth })}
          />
        </>
      )}

      {top.form === 'convex' && (
        <ParamSlider
          label={t('field.domeHeight')}
          value={top.domeHeight}
          range={RANGES.top.domeHeight}
          onChange={(domeHeight) => patch('top', { domeHeight })}
        />
      )}

      {top.form === 'angled' && (
        <>
          <ParamSlider
            label={t('field.slopeAngle')}
            value={top.slopeAngle}
            range={RANGES.top.slopeAngle}
            onChange={(slopeAngle) => patch('top', { slopeAngle })}
          />
          <ChoiceGroup
            label={t('field.slopeDirection')}
            value={top.slopeDirection}
            options={SLOPE_DIRECTIONS.map((d) => ({ value: d, label: t(`direction.${d}`) }))}
            onChange={(slopeDirection) => patch('top', { slopeDirection })}
            hint={t('field.slopeDirectionHint')}
          />
        </>
      )}

      {top.form === 'flat' && <p className="text-xs text-graphite">{t('form.flatHint')}</p>}
      {top.form === 'tactile' && <p className="text-xs text-graphite">{t('form.tactilePending')}</p>}
    </PanelSection>
  )
}
