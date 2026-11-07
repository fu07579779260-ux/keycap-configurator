import type { Language } from '@/i18n/strings'

/**
 * Spoken name of a pressed key, e.g. "Escape", "Left arrow", "A" (or 退格, 左箭头 in Chinese).
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

/** The same keys in Chinese, as they're usually called. */
const NAMED_ZH: Record<string, string> = {
  Escape: 'Esc 键',
  Enter: '回车',
  NumpadEnter: '小键盘回车',
  Backspace: '退格',
  Tab: 'Tab 键',
  Space: '空格',
  CapsLock: '大写锁定',
  ShiftLeft: '左 Shift',
  ShiftRight: '右 Shift',
  ControlLeft: '左 Ctrl',
  ControlRight: '右 Ctrl',
  AltLeft: '左 Alt',
  AltRight: '右 Alt',
  MetaLeft: '左 Windows 键',
  MetaRight: '右 Windows 键',
  ContextMenu: '菜单键',
  ArrowUp: '上箭头',
  ArrowDown: '下箭头',
  ArrowLeft: '左箭头',
  ArrowRight: '右箭头',
  Insert: '插入',
  Delete: '删除',
  Home: 'Home 键',
  End: 'End 键',
  PageUp: '向上翻页',
  PageDown: '向下翻页',
  PrintScreen: '截屏键',
  ScrollLock: '滚动锁定',
  Pause: '暂停',
  NumLock: '数字锁定',
  Minus: '减号',
  Equal: '等号',
  BracketLeft: '左方括号',
  BracketRight: '右方括号',
  Backslash: '反斜杠',
  Semicolon: '分号',
  Quote: '引号',
  Backquote: '反引号',
  Comma: '逗号',
  Period: '句号',
  Slash: '斜杠',
  IntlBackslash: '反斜杠',
  NumpadAdd: '小键盘加号',
  NumpadSubtract: '小键盘减号',
  NumpadMultiply: '小键盘乘号',
  NumpadDivide: '小键盘除号',
  NumpadDecimal: '小键盘小数点',
  AudioVolumeMute: '静音',
  AudioVolumeUp: '音量加',
  AudioVolumeDown: '音量减',
  MediaPlayPause: '播放暂停',
}

export function keyName(event: { key: string; code: string }, lang: Language = 'en'): string {
  const { code, key } = event
  const named = (lang === 'zh' ? NAMED_ZH : NAMED)[code]
  if (named) return named
  const letter = /^Key([A-Z])$/.exec(code)
  if (letter) return letter[1]
  const digit = /^(?:Digit|Numpad)(\d)$/.exec(code)
  if (digit) return code.startsWith('Numpad') ? `${lang === 'zh' ? '小键盘' : 'Numpad'} ${digit[1]}` : digit[1]
  const fn = /^F(\d{1,2})$/.exec(code)
  if (fn) return `F${fn[1]}`
  // Unknown physical key: fall back to what it types
  if (key === ' ') return lang === 'zh' ? '空格' : 'Space'
  return key.length === 1 ? key.toUpperCase() : key
}
