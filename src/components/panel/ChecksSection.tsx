import { useMemo } from 'react'
import { printChecks } from '@/geometry/checks'
import { fill, useT } from '@/i18n/language'
import { useDesign } from '@/model/design-context'
import { findPreset } from '@/model/printers'
import { useUploadedBase } from '@/model/upload-store'
import { useUserPrinters } from '@/model/user-printers'
import { PanelSection } from './controls'

export function ChecksSection() {
  const t = useT()
  const { config } = useDesign()
  const userPresets = useUserPrinters()
  const upload = useUploadedBase()
  const checks = useMemo(
    () =>
      printChecks(config, findPreset(config.manufacturing.technology, config.manufacturing.printer, userPresets), {
        hasUpload: upload !== null,
      }),
    [config, userPresets, upload],
  )

  return (
    <PanelSection title={t('section.checks')}>
      {checks.length === 0 ? (
        <p className="text-sm">✓ {t('check.allGood')}</p>
      ) : (
        <ul className="space-y-2">
          {checks.map((c) => (
            <li key={c.id} className="flex gap-2 text-sm">
              <span aria-hidden="true" className={c.level === 'warning' ? 'text-signal' : 'text-graphite'}>
                {c.level === 'warning' ? '▲' : '●'}
              </span>
              <span>
                <span className="sr-only">{c.level === 'warning' ? t('check.warning') : t('check.note')}: </span>
                {fill(t(`check.${c.id}`), c.values)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </PanelSection>
  )
}
