/**
 * Spoken English name of a pressed key, e.g. "Escape", "Left arrow", "A".
 * Uses the physical key (code) for letters and digits so the name matches
 * the keycap, whatever the keyboard layout or Shift state.
 */
const NAMED: Record<string, string> = {
  Escape: 'Escape',
  Enter: 'Enter',
  NumpadEnter: 'Enter',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Space: 'Space',
  CapsLock: 'Caps Lock',
  ShiftLeft: 'Left Shift',
  ShiftRight: 'Right Shift',
  ControlLeft: 'Left Control',
  ControlRight: 'Right Control',
  AltLeft: 'Left Alt',
  AltRight: 'Right Alt',
  MetaLeft: 'Left Windows',
  MetaRight: 'Right Windows',
  ContextMenu: 'Menu',
  ArrowUp: 'Up arrow',
  ArrowDown: 'Down arrow',
  ArrowLeft: 'Left arrow',
  ArrowRight: 'Right arrow',
  Insert: 'Insert',
  Delete: 'Delete',
  Home: 'Home',
  End: 'End',
  PageUp: 'Page Up',
  PageDown: 'Page Down',
  PrintScreen: 'Print Screen',
  ScrollLock: 'Scroll Lock',
  Pause: 'Pause',
  NumLock: 'Num Lock',
  Minus: 'Minus',
  Equal: 'Equals',
  BracketLeft: 'Left bracket',
  BracketRight: 'Right bracket',
  Backslash: 'Backslash',
  Semicolon: 'Semicolon',
  Quote: 'Quote',
  Backquote: 'Backtick',
  Comma: 'Comma',
  Period: 'Period',
  Slash: 'Slash',
  IntlBackslash: 'Backslash',
  NumpadAdd: 'Numpad plus',
  NumpadSubtract: 'Numpad minus',
  NumpadMultiply: 'Numpad times',
  NumpadDivide: 'Numpad divide',
  NumpadDecimal: 'Numpad point',
  AudioVolumeMute: 'Mute',
  AudioVolumeUp: 'Volume up',
  AudioVolumeDown: 'Volume down',
  MediaPlayPause: 'Play pause',
}

export function keyName(event: { key: string; code: string }): string {
  const { code, key } = event
  if (NAMED[code]) return NAMED[code]
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)
  if (digit) return code.startsWith('Numpad') ? `Numpad ${digit[1]}` : digit[1]
  const fn = /^F(\d{1,2})$/.exec(code)
  if (fn) return `F${fn[1]}`
  // Unknown physical key: fall back to what it types
  if (key === ' ') return 'Space'
  return key.length === 1 ? key.toUpperCase() : key
}
