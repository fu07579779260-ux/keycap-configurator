import { TECHNOLOGY_DEFAULTS, type Technology } from './options'

/** What a printer preset changes: the fit tolerance and the thinnest wall it prints reliably. */
export interface PrinterPreset {
  id: string
  /** Shown as is (brand names aren't translated). Built-in generic presets use the "generic" label key. */
  name: string
  technology: Technology
  fitTolerance: number
  minWall: number
}

/**
 * Built-in machines. Tolerances are starting points from typical results on
 * these printers; the test print (docs/test-print.md) is what really decides.
 */
const MACHINES: PrinterPreset[] = [
  { id: 'bambu-x1', name: 'Bambu Lab X1', technology: 'fdm', fitTolerance: 0.12, minWall: 1.2 },
  { id: 'bambu-p1s', name: 'Bambu Lab P1S', technology: 'fdm', fitTolerance: 0.12, minWall: 1.2 },
  { id: 'prusa-mk4', name: 'Prusa MK4', technology: 'fdm', fitTolerance: 0.15, minWall: 1.2 },
  { id: 'formlabs-form-3', name: 'Formlabs Form 3', technology: 'sla', fitTolerance: 0.05, minWall: 0.8 },
  { id: 'formlabs-form-4', name: 'Formlabs Form 4', technology: 'sla', fitTolerance: 0.04, minWall: 0.8 },
  { id: 'elegoo-resin', name: 'Elegoo (resin)', technology: 'sla', fitTolerance: 0.06, minWall: 0.8 },
]

const generic = (technology: Technology): PrinterPreset => ({
  id: 'generic',
  name: 'generic',
  technology,
  fitTolerance: TECHNOLOGY_DEFAULTS[technology].fitTolerance,
  minWall: TECHNOLOGY_DEFAULTS[technology].minWall,
})

/** Presets offered for a technology: generic first, then machines, then the user's own. */
export function presetsFor(technology: Technology, userPresets: PrinterPreset[] = []): PrinterPreset[] {
  return [
    generic(technology),
    ...MACHINES.filter((m) => m.technology === technology),
    ...userPresets.filter((u) => u.technology === technology),
  ]
}

/** The preset a design refers to; falls back to generic when it's unknown (e.g. a deleted user preset). */
export function findPreset(technology: Technology, id: string, userPresets: PrinterPreset[] = []): PrinterPreset {
  return presetsFor(technology, userPresets).find((p) => p.id === id) ?? generic(technology)
}

// ---------- User-saved presets (this browser only) ----------

const STORAGE_KEY = 'keycap.printers'

export function loadUserPresets(): PrinterPreset[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    if (!Array.isArray(data)) return []
    return data.filter(
      (p): p is PrinterPreset =>
        typeof p?.id === 'string' &&
        p.id.startsWith('user:') &&
        typeof p.name === 'string' &&
        ['fdm', 'sla', 'sls'].includes(p.technology) &&
        Number.isFinite(p.fitTolerance) &&
        Number.isFinite(p.minWall),
    )
  } catch {
    return []
  }
}

export function saveUserPresets(presets: PrinterPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch {
    // Storage blocked: the preset lasts for this visit only
  }
}

/** A new user preset with a unique id. */
export function makeUserPreset(name: string, technology: Technology, fitTolerance: number, minWall: number, taken: PrinterPreset[]): PrinterPreset {
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9一-鿿]+/g, '-').replace(/^-|-$/g, '') || 'printer'
  let id = `user:${slug}`
  for (let n = 2; taken.some((p) => p.id === id); n++) id = `user:${slug}-${n}`
  return { id, name: name.trim() || 'My printer', technology, fitTolerance, minWall }
}
