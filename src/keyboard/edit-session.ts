import type { KeycapConfig } from '@/model/config'

/**
 * "Edit this keycap" on the keyboard page starts an edit session, so the
 * configurator can show a way back and confirm that changes are saved, and
 * the keyboard page can confirm the keycap was updated on return.
 * Kept in memory only: a reload simply ends it.
 */
let snapshot: string | null = null

const key = (config: KeycapConfig) => JSON.stringify(config)

export function startKeyboardEdit(config: KeycapConfig) {
  snapshot = key(config)
}

export const inKeyboardEdit = () => snapshot !== null

/** True when the design differs from the one the edit started with. */
export const keyboardEditChanged = (config: KeycapConfig) => snapshot !== null && snapshot !== key(config)

export function endKeyboardEdit() {
  snapshot = null
}
