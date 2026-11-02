/**
 * Browser storage for this app. Every key starts with "keycap." so
 * "Clear all local data" can find them all. Reads and writes never throw:
 * storage can be blocked (private mode, site data off), and then things
 * simply aren't remembered.
 */
export const PREFIX = 'keycap.'

export function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(PREFIX + key)
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    // Full or blocked: keep working without remembering
  }
}

/** Remove every key this app stored in this browser. */
export function clearAllStorage() {
  try {
    for (const key of Object.keys(localStorage)) if (key.startsWith(PREFIX)) localStorage.removeItem(key)
  } catch {
    // Nothing stored, nothing to clear
  }
}
