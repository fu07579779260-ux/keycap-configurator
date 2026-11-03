/** English speech through the browser's built-in speech synthesis (no download, works offline). */

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let englishVoice: SpeechSynthesisVoice | null = null

function pickVoice() {
  const voices = window.speechSynthesis.getVoices()
  englishVoice = voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en')) ?? null
}

if (speechSupported()) {
  pickVoice()
  // Voices load asynchronously in Chrome
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoice)
}

/**
 * Say something in English. By default it interrupts what's being said, so
 * fast key presses or Tab moves don't queue up a backlog.
 */
export function speak(text: string, { interrupt = true } = {}) {
  if (!speechSupported() || !text.trim()) return
  const synth = window.speechSynthesis
  if (interrupt) synth.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'en-US'
  if (englishVoice) utterance.voice = englishVoice
  utterance.rate = 1.05
  synth.speak(utterance)
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}
