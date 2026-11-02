import type { KeycapConfig } from '@/model/config'
import { profileHasRows } from '@/model/options'

/** Descriptive, filesystem-safe name, e.g. "keycap-cherry-r3-1u-concave-mx.stl". */
export function designFileName(config: KeycapConfig, extension: string): string {
  const { size, top, stem } = config
  const parts = [
    'keycap',
    size.profile,
    profileHasRows(size.profile) ? size.row.toLowerCase() : null,
    `${size.widthU}u`,
    top.form,
    stem.type,
  ]
  return `${parts.filter(Boolean).join('-').replace(/[^a-z0-9.-]/gi, '')}.${extension}`
}

/** Name for the five-forms set, e.g. "keycap-cherry-r3-1u-five-forms-mx.zip". */
export function formSetFileName(config: KeycapConfig): string {
  return designFileName(config, 'zip').replace(`-${config.top.form}-`, '-five-forms-')
}
