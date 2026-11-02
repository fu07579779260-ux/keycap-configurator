import type { KeycapConfig } from '@/model/config'
import { uploadStore, type UploadedBase } from '@/model/upload-store'
import type { MeshData } from './body'
import { traceText, type Outline } from './text-outline'
import { autoPlace } from './upload'

/** Inputs buildKeycap can't make from the config alone (browser only). */
export interface KeycapExtras {
  /** Traced legend text. */
  textOutline?: Outline
  /** Uploaded base model, already placed, in keycap coordinates. */
  uploadedBase?: MeshData
}

export function keycapExtras(config: KeycapConfig, upload: UploadedBase | null = uploadStore.get()): KeycapExtras {
  const extras: KeycapExtras = {}
  const { legend, stem } = config
  if (legend.type === 'text' && legend.text.trim()) extras.textOutline = traceText(legend.text, legend.textSize)
  if (stem.type === 'upload' && upload) extras.uploadedBase = stem.uploadAutoPlace ? autoPlace(upload.mesh) : upload.mesh
  return extras
}
