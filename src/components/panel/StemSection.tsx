import { useT } from '@/i18n/language'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { STEM_TYPES } from '@/model/options'
import { ChoiceGroup, PanelSection, ParamSlider } from './controls'
import { UploadField } from './UploadField'

export function StemSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const { stem } = config

  return (
    <PanelSection title={t('section.stem')}>
      <ChoiceGroup
        label={t('field.stemType')}
        value={stem.type}
        options={STEM_TYPES.map((s) => ({ value: s, label: t(`stem.${s}`) }))}
        onChange={(type) => patch('stem', { type })}
        columns={4}
        hint={t(`stem.hint.${stem.type}`)}
      />

      {stem.type === 'upload' && <UploadField />}

      {stem.type === 'custom' && (
        <>
          <ParamSlider
            label={t('field.crossLength')}
            value={stem.crossLength}
            range={RANGES.stem.crossLength}
            onChange={(crossLength) => patch('stem', { crossLength })}
          />
          <ParamSlider
            label={t('field.crossWidthH')}
            value={stem.crossWidthH}
            range={RANGES.stem.crossWidthH}
            onChange={(crossWidthH) => patch('stem', { crossWidthH })}
          />
          <ParamSlider
            label={t('field.crossWidthV')}
            value={stem.crossWidthV}
            range={RANGES.stem.crossWidthV}
            onChange={(crossWidthV) => patch('stem', { crossWidthV })}
          />
          <ParamSlider
            label={t('field.socketDepth')}
            value={stem.socketDepth}
            range={RANGES.stem.socketDepth}
            onChange={(socketDepth) => patch('stem', { socketDepth })}
          />
          <ParamSlider
            label={t('field.outerDiameter')}
            value={stem.outerDiameter}
            range={RANGES.stem.outerDiameter}
            onChange={(outerDiameter) => patch('stem', { outerDiameter })}
          />
        </>
      )}

      <div className="space-y-1">
        <ParamSlider
          label={t('field.fitTolerance')}
          value={stem.fitTolerance}
          range={RANGES.stem.fitTolerance}
          onChange={(fitTolerance) => patch('stem', { fitTolerance })}
        />
        <p className="text-xs text-graphite">{t('field.fitToleranceHint')}</p>
      </div>

      <ParamSlider
        label={t('field.wallThickness')}
        value={config.size.wallThickness}
        range={RANGES.size.wallThickness}
        onChange={(wallThickness) => patch('size', { wallThickness })}
      />
    </PanelSection>
  )
}
