import { PROFILE_SHAPES } from '@/geometry/profiles'
import { isStandardStabiliserWidth, stabiliserSpacing } from '@/geometry/stems'
import { useT } from '@/i18n/language'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { PROFILES, profileHasRows, ROWS, WIDTH_PRESETS, type Profile } from '@/model/options'
import { ChoiceGroup, PanelSection, ParamSlider, ToggleField } from './controls'

const PROFILE_LABELS: Record<Profile, string> = {
  oem: 'OEM',
  cherry: 'Cherry',
  sa: 'SA',
  dsa: 'DSA',
  xda: 'XDA',
  mt3: 'MT3',
}

export function SizeSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const { size } = config
  const hasRows = profileHasRows(size.profile)
  const profileHeight = PROFILE_SHAPES[size.profile].rows[size.row].height
  const spacing = stabiliserSpacing(size.widthU)

  return (
    <PanelSection title={t('section.size')}>
      <ChoiceGroup
        label={t('field.width')}
        value={String(size.widthU)}
        options={WIDTH_PRESETS.map((w) => ({ value: String(w), label: `${w}u` }))}
        onChange={(w) => patch('size', { widthU: Number(w) })}
        columns={5}
      />
      <ParamSlider
        label={t('field.widthExact')}
        value={size.widthU}
        range={RANGES.size.widthU}
        onChange={(widthU) => patch('size', { widthU })}
      />
      {spacing !== null && (
        <ToggleField
          label={t('field.stabilisers')}
          checked={size.stabilisers}
          onChange={(stabilisers) => patch('size', { stabilisers })}
          hint={
            isStandardStabiliserWidth(size.widthU)
              ? `${t('field.stabiliserSpacing')} ${spacing} mm`
              : `${t('field.stabiliserSpacing')} ${spacing} mm · ${t('field.stabiliserNonStandard')}`
          }
        />
      )}
      <ChoiceGroup
        label={t('field.profile')}
        value={size.profile}
        options={PROFILES.map((p) => ({ value: p, label: PROFILE_LABELS[p] }))}
        onChange={(profile) => patch('size', { profile })}
        columns={3}
      />
      <ChoiceGroup
        label={t('field.row')}
        value={size.row}
        options={ROWS.map((r) => ({ value: r, label: r }))}
        onChange={(row) => patch('size', { row })}
        disabled={!hasRows}
        hint={hasRows ? t('field.rowHint') : t('field.rowNone')}
      />
      <ParamSlider
        label={t('field.height')}
        note={size.heightOverride === null ? t('field.fromProfile') : undefined}
        value={size.heightOverride ?? profileHeight}
        range={RANGES.size.heightOverride}
        onChange={(heightOverride) => patch('size', { heightOverride })}
        action={
          size.heightOverride !== null && (
            <button
              type="button"
              onClick={() => patch('size', { heightOverride: null })}
              className="text-xs text-graphite underline underline-offset-2 hover:text-ink"
            >
              {t('field.useProfileHeight')}
            </button>
          )
        }
      />
      <ParamSlider
        label={t('field.topFillet')}
        value={size.topFillet}
        range={RANGES.size.topFillet}
        onChange={(topFillet) => patch('size', { topFillet })}
      />
    </PanelSection>
  )
}
