import type { Language } from '@/i18n/strings'
import { toEnglish } from './english'

/**
 * Speech through the browser's built-in speech synthesis (no download, works
 * offline), in the interface language: English or Chinese.
 */

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window

let englishVoice: SpeechSynthesisVoice | null = null
let chineseVoice: SpeechSynthesisVoice | null = null
let anyVoice: SpeechSynthesisVoice | null = null
let language: Language = 'en'
const listeners = new Set<() => void>()

function pickVoices() {
  const voices = window.speechSynthesis.getVoices()
  englishVoice = voices.find((v) => v.lang === 'en-US') ?? voices.find((v) => v.lang.startsWith('en')) ?? null
  // Mandarin first (zh-CN), then any other Chinese voice (zh-TW, zh-HK)
  chineseVoice =
    voices.find((v) => /^zh[-_]CN/i.test(v.lang)) ?? voices.find((v) => /^(zh|cmn)/i.test(v.lang)) ?? null
  anyVoice = voices.find((v) => v.default) ?? voices[0] ?? null
  for (const l of listeners) l()
}

if (speechSupported()) {
  pickVoices()
  // Voices load asynchronously in Chrome
  window.speechSynthesis.addEventListener?.('voiceschanged', pickVoices)
}

/** Speak in this language from now on (follows the interface language switch). */
export function setSpeechLanguage(next: Language) {
  language = next
  for (const l of listeners) l()
}

/**
 * Whether this computer has a voice for the interface language:
 * 'match', or the fallback in use ('noEnglish': English read with another
 * voice; 'noChinese': Chinese interface spoken in English), or 'none'.
 */
export function voiceStatus(): 'match' | 'noEnglish' | 'noChinese' | 'none' {
  if (!anyVoice) return 'none'
  if (language === 'zh') return chineseVoice ? 'match' : 'noChinese'
  return englishVoice ? 'match' : 'noEnglish'
}

/** Re-render when the voice list arrives (it loads after the page in Chrome) or the language changes. */
export function onVoicesChanged(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** The voice and the words to use: Chinese text needs a Chinese voice, otherwise it's said in English. */
function voiceFor(text: string): { voice: SpeechSynthesisVoice | null; text: string } {
  if (language === 'zh' && chineseVoice) return { voice: chineseVoice, text }
  // English, or no Chinese voice installed: say the English version. Without an English voice
  // either (common on Chinese Windows), asking for en-US would stay silent, so use any voice
  return { voice: englishVoice ?? anyVoice, text: language === 'zh' ? toEnglish(text) : text }
}

let pending: ReturnType<typeof setTimeout> | undefined

/**
 * Say something in the interface language. By default it interrupts what's
 * being said, so fast key presses or clicks don't queue up a backlog.
 */
export function speak(text: string, { interrupt = true } = {}) {
  if (!speechSupported() || !text.trim()) return
  const synth = window.speechSynthesis
  const chosen = voiceFor(text)
  if (!chosen.text.trim()) return
  const utterance = new SpeechSynthesisUtterance(chosen.text)
  if (chosen.voice) {
    utterance.voice = chosen.voice
    utterance.lang = chosen.voice.lang
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
