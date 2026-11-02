import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_CONFIG } from '@/model/config'
import { PRESETS } from '@/model/presets'
import { sanitizeConfig } from '@/model/sanitize'
import { buildShareUrl } from '@/model/serialize'
import { STRINGS } from '@/i18n/strings'

/** Minimal in-memory localStorage (Node has none). */
function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
    _data: data,
  }
}

beforeEach(() => {
  const store = memoryStorage()
  // Object.keys() on the stub must return the stored keys, like the browser's Storage
  vi.stubGlobal(
    'localStorage',
    new Proxy(store, {
      ownKeys: () => [...store._data.keys()],
      getOwnPropertyDescriptor: (_, k) => (store._data.has(String(k)) ? { enumerable: true, configurable: true, value: store._data.get(String(k)) } : undefined),
    }),
  )
  vi.resetModules()
})

describe('storage', () => {
  it('reads back what it wrote, under the keycap. prefix', async () => {
    const { readJson, writeJson } = await import('./storage')
    writeJson('x', { a: 1 })
    expect(localStorage.getItem('keycap.x')).toBe('{"a":1}')
    expect(readJson('x')).toEqual({ a: 1 })
    expect(readJson('missing')).toBeNull()
  })

  it('clears only this app\'s keys', async () => {
    const { clearAllStorage, writeJson } = await import('./storage')
    writeJson('design', {})
    localStorage.setItem('keycap.language', 'zh')
    localStorage.setItem('other-app', 'keep')
    clearAllStorage()
    expect(localStorage.getItem('keycap.design')).toBeNull()
    expect(localStorage.getItem('keycap.language')).toBeNull()
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
})

describe('session', () => {
  it('saves and restores the design, sanitised', async () => {
    const { loadSession, saveSession } = await import('./session')
    expect(loadSession()).toBeNull()
    saveSession(sanitizeConfig({ size: { widthU: 2 } }))
    expect(loadSession()?.size.widthU).toBe(2)
  })

  it('stops saving once autosave is stopped', async () => {
    const { loadSession, saveSession, stopAutosave } = await import('./session')
    stopAutosave()
    saveSession(DEFAULT_CONFIG)
    expect(loadSession()).toBeNull()
  })

  it('reads a design from a share link hash', async () => {
    const { designFromHash } = await import('./session')
    const config = sanitizeConfig({ top: { form: 'angled' } })
    const { url } = buildShareUrl(config, 'http://localhost/')
    expect(designFromHash(new URL(url).hash)).toEqual(config)
    expect(designFromHash('#/configure')).toBeNull()
  })
})

describe('saved designs', () => {
  it('adds newest first, names untitled ones, and survives a reload', async () => {
    const first = await import('./saved-designs')
    first.savedDesigns.add('Mine', DEFAULT_CONFIG, new Date('2026-11-01'))
    first.savedDesigns.add('  ', DEFAULT_CONFIG, new Date('2026-11-02'))
    expect(first.savedDesigns.get().map((d) => d.name)).toEqual(['Untitled keycap', 'Mine'])

    vi.resetModules()
    const reloaded = await import('./saved-designs')
    expect(reloaded.savedDesigns.get()).toHaveLength(2)
    reloaded.savedDesigns.remove(reloaded.savedDesigns.get()[0].id)
    expect(reloaded.savedDesigns.get().map((d) => d.name)).toEqual(['Mine'])
  })

  it('keeps an independent copy of the design', async () => {
    const { savedDesigns } = await import('./saved-designs')
    const config = structuredClone(DEFAULT_CONFIG)
    savedDesigns.add('Copy', config)
    config.size.widthU = 3
    expect(savedDesigns.get()[0].config.size.widthU).toBe(1)
  })
})

describe('compare list persistence', () => {
  it('comes back after a reload', async () => {
    const first = await import('@/model/compare-store')
    first.compareList.fiveForms(DEFAULT_CONFIG)
    vi.resetModules()
    const reloaded = await import('@/model/compare-store')
    expect(reloaded.compareList.get().map((i) => i.config.top.form)).toEqual(['flat', 'concave', 'convex', 'angled', 'tactile'])
  })
})

describe('built-in presets', () => {
  it('are valid designs with unique ids and translated names', () => {
    expect(new Set(PRESETS.map((p) => p.id)).size).toBe(PRESETS.length)
    for (const p of PRESETS) {
      expect(sanitizeConfig(p.config), p.id).toEqual(p.config)
      for (const lang of ['en', 'zh'] as const) {
        expect(STRINGS[lang][p.name], `${p.id} ${lang}`).toBeTruthy()
        expect(STRINGS[lang][p.description], `${p.id} ${lang}`).toBeTruthy()
      }
    }
  })

  it('actually differ from the default design', () => {
    for (const p of PRESETS) expect(p.config, p.id).not.toEqual(DEFAULT_CONFIG)
  })
})
