/** English speech through the browser's built-in speech synthesis (no download, works offline). */

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let englishVoice: SpeechSynthesisVoice | null = null
let anyVoice: SpeechSynthesisVoice | null = null
const listeners = new Set<() => void>()

function pickVoices() {
  const voices = window.speechSynthesis.getVoices()
  englishVoice = voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en')) ?? null
  anyVoice = voices.find((v) => v.default) ?? voices[0] ?? null
  for (const l of listeners) l()
}

if (speechSupported()) {
  pickVoices()
  // Voices load asynchronously in Chrome
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoices)
}

/** Which voices this computer has: none, only non-English ones, or an English one. */
export function voiceStatus(): 'english' | 'other' | 'none' {
  if (englishVoice) return 'english'
  return anyVoice ? 'other' : 'none'
}

/** Re-render when the voice list arrives (it loads after the page in Chrome). */
export function onVoicesChanged(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let pending: ReturnType<typeof setTimeout> | undefined

/**
 * Say something in English. By default it interrupts what's being said, so
 * fast key presses or clicks don't queue up a backlog.
 */
export function speak(text: string, { interrupt = true } = {}) {
  if (!speechSupported() || !text.trim()) return
  const synth = window.speechSynthesis
  const utterance = new SpeechSynthesisUtterance(text)
  if (englishVoice) {
    utterance.voice = englishVoice
    utterance.lang = englishVoice.lang
  } else if (anyVoice) {
    // No English voice installed (common on Chinese Windows): asking for en-US would stay
    // silent, so read the English text with the voice the computer has
    utterance.voice = anyVoice
    utterance.lang = anyVoice.lang
  }
  utterance.rate = 1.05

  clearTimeout(pending)
  if (interrupt && (synth.speaking || synth.pending)) {
    synth.cancel()
    // Chrome sometimes drops an utterance queued in the same moment as cancel()
    pending = setTimeout(() => synth.speak(utterance), 60)
  } else {
    synth.speak(utterance)
  }
}

export function stopSpeaking() {
  clearTimeout(pending)
  if (speechSupported()) window.speechSynthesis.cancel()
}
