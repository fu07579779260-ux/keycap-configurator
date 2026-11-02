import type { StringKey } from '@/i18n/strings'
import type { KeycapConfig } from '@/model/config'
import { profileHasRows } from '@/model/options'

const PROFILE_NAMES = { oem: 'OEM', cherry: 'Cherry', sa: 'SA', dsa: 'DSA', xda: 'XDA', mt3: 'MT3' }

/** Short one-line description, e.g. "Cherry R3 · 1u · Concave · Cherry MX". */
export function describeDesign(config: KeycapConfig, t: (key: StringKey) => string): string {
  const { size, top, stem, legend } = config
  const parts = [
    `${PROFILE_NAMES[size.profile]}${profileHasRows(size.profile) ? ` ${size.row}` : ''}`,
    `${size.widthU}u`,
    t(`form.${top.form}`),
    t(`stem.${stem.type}`),
  ]
  if (legend.type === 'text' && legend.text) parts.push(`“${legend.text}”`)
  if (legend.type === 'braille' && legend.brailleText) parts.push(`${t('legend.braille')} ${legend.brailleText}`)
  if (legend.type === 'icon') parts.push(t(`icon.${legend.icon}`))
  return parts.join(' · ')
}
