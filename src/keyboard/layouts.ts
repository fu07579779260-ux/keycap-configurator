import type { Row } from '@/model/options'

/**
 * Keyboard layouts for the simulator (ANSI). Positions and sizes are in
 * key units (1u = 19.05 mm): x to the right, y towards the typist, measured
 * from the top-left corner of the key. `code` is the physical key
 * (KeyboardEvent.code), so presses match whatever the system's language.
 */
export interface KeyPosition {
  code: string
  x: number
  y: number
  /** Width and depth in u (h = 2 for the tall numpad keys). */
  w: number
  h: number
  /** Sculpted-profile row; the number and function rows are R1, the bottom two rows R4. */
  row: Row
}

export const LAYOUTS = ['60', 'tkl', 'full'] as const
export type LayoutId = (typeof LAYOUTS)[number]

type Spec = [code: string, w?: number]

/** Lay out one row of keys left to right from `x`, each 1u unless given. */
function row(y: number, rowName: Row, x: number, keys: Spec[]): KeyPosition[] {
  let cursor = x
  return keys.map(([code, w = 1]) => {
    const key = { code, x: cursor, y, w, h: 1, row: rowName }
    cursor += w
    return key
  })
}

const letters = (s: string): Spec[] => [...s].map((c) => [`Key${c}`])
const digits: Spec[] = [...'1234567890'].map((d) => [`Digit${d}`])

/** The alphanumeric block: 15u wide, 5 rows, starting at row `y`. */
function mainBlock(y: number): KeyPosition[] {
  return [
    ...row(y, 'R1', 0, [['Backquote'], ...digits, ['Minus'], ['Equal'], ['Backspace', 2]]),
    ...row(y + 1, 'R2', 0, [['Tab', 1.5], ...letters('QWERTYUIOP'), ['BracketLeft'], ['BracketRight'], ['Backslash', 1.5]]),
    ...row(y + 2, 'R3', 0, [['CapsLock', 1.75], ...letters('ASDFGHJKL'), ['Semicolon'], ['Quote'], ['Enter', 2.25]]),
    ...row(y + 3, 'R4', 0, [['ShiftLeft', 2.25], ...letters('ZXCVBNM'), ['Comma'], ['Period'], ['Slash'], ['ShiftRight', 2.75]]),
    ...row(y + 4, 'R4', 0, [
      ['ControlLeft', 1.25],
      ['MetaLeft', 1.25],
      ['AltLeft', 1.25],
      ['Space', 6.25],
      ['AltRight', 1.25],
      ['MetaRight', 1.25],
      ['ContextMenu', 1.25],
      ['ControlRight', 1.25],
    ]),
  ]
}

/** Function row, half a key above the number row. */
const functionRow: KeyPosition[] = [
  ...row(0, 'R1', 0, [['Escape']]),
  ...row(0, 'R1', 2, [['F1'], ['F2'], ['F3'], ['F4']]),
  ...row(0, 'R1', 6.5, [['F5'], ['F6'], ['F7'], ['F8']]),
  ...row(0, 'R1', 11, [['F9'], ['F10'], ['F11'], ['F12']]),
  ...row(0, 'R1', 15.25, [['PrintScreen'], ['ScrollLock'], ['Pause']]),
]

/** Navigation keys and arrows to the right of the main block. */
function navCluster(y: number): KeyPosition[] {
  return [
    ...row(y, 'R1', 15.25, [['Insert'], ['Home'], ['PageUp']]),
    ...row(y + 1, 'R2', 15.25, [['Delete'], ['End'], ['PageDown']]),
    ...row(y + 3, 'R4', 16.25, [['ArrowUp']]),
    ...row(y + 4, 'R4', 15.25, [['ArrowLeft'], ['ArrowDown'], ['ArrowRight']]),
  ]
}

/** Numpad; + and Enter are 2u tall (flat rows, since a tall key can't follow one row's tilt). */
function numpad(y: number): KeyPosition[] {
  const x = 18.5
  const tall = (code: string, ky: number): KeyPosition => ({ code, x: x + 3, y: ky, w: 1, h: 2, row: 'R3' })
  return [
    ...row(y, 'R1', x, [['NumLock'], ['NumpadDivide'], ['NumpadMultiply'], ['NumpadSubtract']]),
    ...row(y + 1, 'R2', x, [['Numpad7'], ['Numpad8'], ['Numpad9']]),
    tall('NumpadAdd', y + 1),
    ...row(y + 2, 'R3', x, [['Numpad4'], ['Numpad5'], ['Numpad6']]),
    ...row(y + 3, 'R4', x, [['Numpad1'], ['Numpad2'], ['Numpad3']]),
    tall('NumpadEnter', y + 3),
    ...row(y + 4, 'R4', x, [['Numpad0', 2], ['NumpadDecimal']]),
  ]
}

const MAIN_Y = 1.5

export const LAYOUT_KEYS: Record<LayoutId, KeyPosition[]> = {
  '60': mainBlock(0),
  tkl: [...functionRow, ...mainBlock(MAIN_Y), ...navCluster(MAIN_Y)],
  full: [...functionRow, ...mainBlock(MAIN_Y), ...navCluster(MAIN_Y), ...numpad(MAIN_Y)],
}

/** Overall size of a layout in u. */
export function layoutSize(keys: KeyPosition[]) {
  return {
    width: Math.max(...keys.map((k) => k.x + k.w)),
    depth: Math.max(...keys.map((k) => k.y + k.h)),
  }
}

export function findKey(keys: KeyPosition[], code: string) {
  return keys.find((k) => k.code === code)
}
