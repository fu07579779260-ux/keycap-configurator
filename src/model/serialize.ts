import { DEFAULT_CONFIG, type KeycapConfig, type Section } from './config'
import { sanitizeConfig } from './sanitize'

export const FILE_FORMAT = 'keycap-configurator'
export const FILE_VERSION = 1

// ---------- JSON design file ----------

export function toDesignFile(config: KeycapConfig, savedAt = new Date()): string {
  return JSON.stringify(
    { format: FILE_FORMAT, version: FILE_VERSION, savedAt: savedAt.toISOString(), config },
    null,
    2,
  )
}

export type ParseResult =
  | { ok: true; config: KeycapConfig }
  | { ok: false; error: 'invalid-json' | 'not-a-design' | 'newer-version' }

export function parseDesignFile(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalid-json' }
  }
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'not-a-design' }
  const file = data as { format?: unknown; version?: unknown; config?: unknown }
  if (file.format !== FILE_FORMAT || typeof file.config !== 'object') return { ok: false, error: 'not-a-design' }
  if (typeof file.version === 'number' && file.version > FILE_VERSION) return { ok: false, error: 'newer-version' }
  return { ok: true, config: sanitizeConfig(file.config) }
}

// ---------- Share link ----------

/** Keep only the fields that differ from the defaults. */
function diffFromDefaults(config: KeycapConfig) {
  const diff: Partial<Record<Section, Record<string, unknown>>> = {}
  for (const section of Object.keys(DEFAULT_CONFIG) as Section[]) {
    const defaults = DEFAULT_CONFIG[section] as unknown as Record<string, unknown>
    const values = config[section] as unknown as Record<string, unknown>
    for (const key of Object.keys(defaults)) {
      if (values[key] !== defaults[key]) (diff[section] ??= {})[key] = values[key]
    }
  }
  return diff
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(param: string): string {
  const base64 = param.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4))
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

/**
 * Encode a design for the `c` URL parameter. Uploaded base models can't travel
 * in a link, so their name is dropped and `droppedUpload` tells the UI to warn.
 */
export function encodeShareParam(config: KeycapConfig): { param: string; droppedUpload: boolean } {
  const droppedUpload = config.stem.uploadName !== null
  const shareable = { ...config, stem: { ...config.stem, uploadName: null } }
  return { param: toBase64Url(JSON.stringify(diffFromDefaults(shareable))), droppedUpload }
}

/** Decode a `c` parameter; returns null when it is unreadable. */
export function decodeShareParam(param: string): KeycapConfig | null {
  try {
    return sanitizeConfig(JSON.parse(fromBase64Url(param)))
  } catch {
    return null
  }
}

/** Full share URL, e.g. https://…/keycap-configurator/#/configure?c=… */
export function buildShareUrl(config: KeycapConfig, pageUrl: string) {
  const { param, droppedUpload } = encodeShareParam(config)
  const base = pageUrl.split('#')[0]
  return { url: `${base}#/configure?c=${param}`, droppedUpload }
}

/** Read the `c` parameter from a location hash such as "#/configure?c=…". */
export function readShareParam(hash: string): string | null {
  const query = hash.split('?')[1]
  return query ? new URLSearchParams(query).get('c') : null
}
