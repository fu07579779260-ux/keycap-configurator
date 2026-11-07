import { useEffect, useRef } from 'react'
import { useLanguage } from '@/i18n/language'
import { useDesign } from '@/model/design-context'
import { useDisplay } from '@/model/display'
import { describeFocus, describeValue } from './describe-focus'
import { keyName } from './key-names'
import { keyVoiceClaimed } from './key-voice'
import { KEY_TESTER_ATTR, legendSpeech } from './legend-speech'
import { speak, stopSpeaking } from './speech'

/**
 * Voice feedback in the interface language (PLAN.md §5), on by default:
 * 1. physical keys pressed when nothing is focused, or in the key tester;
 * 2. the control that gets keyboard focus or is clicked, and its new value when it changes;
 * 3. the keycap's legend when it changes (and the 3D view describes the key on focus).
 */
export function VoiceAnnouncer() {
  const { voice } = useDisplay()
  const { config } = useDesign()
  const { lang } = useLanguage()
  // Read when speaking, so switching language doesn't restart the listeners (and cancel the switch's own announcement)
  const langRef = useRef(lang)
  langRef.current = lang
  // Changes to the legend itself trigger an announcement, not a language switch
  const legendKey = legendSpeech(config.legend)
  const legendText = useRef('')
  legendText.current = legendSpeech(config.legend, lang)
  const firstLegend = useRef(true)

  useEffect(() => {
    if (!voice) {
      stopSpeaking()
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || keyVoiceClaimed()) return
      const target = event.target as Element | null
      const inTester = target?.closest?.(`[${KEY_TESTER_ATTR}]`)
      const nothingFocused = !target || target === document.body || target === document.documentElement
      if (inTester || nothingFocused) speak(keyName(event, langRef.current))
    }

    // Chrome counts a slider grabbed with the mouse as :focus-visible, so remember recent presses
    let lastPointer = 0
    const onPointerDown = () => {
      lastPointer = Date.now()
    }
    const fromPointer = () => Date.now() - lastPointer < 800

    const onFocus = (event: FocusEvent) => {
      const el = event.target as Element
      // Keyboard focus only: mouse users get the click announcement below instead
      if (fromPointer() || !el.matches?.(':focus-visible') || el.closest(`[${KEY_TESTER_ATTR}]`)) return
      speak(describeFocus(el, langRef.current))
    }

    let clickTimer: ReturnType<typeof setTimeout> | undefined
    const onClick = (event: MouseEvent) => {
      // detail 0: keyboard "clicks" (covered by focus and value announcements) and the click a
      // label forwards to its input (handled below through the label itself)
      if (event.detail === 0) return
      const target = event.target as Element | null
      const label = target?.closest?.('label')
      const el =
        target?.closest?.('button, a[href], input, select, summary') ??
        (label?.htmlFor ? document.getElementById(label.htmlFor) : label?.querySelector('input, select'))
      // The 3D views are dragged, not clicked, so they stay quiet; sliders are read when released (onChange)
      if (!el || el.closest(`[${KEY_TESTER_ATTR}]`) || (el instanceof HTMLInputElement && el.type === 'range')) return
      clearTimeout(clickTimer)
      // Wait for the app to update, so the new state is read ("Wizard, on", "Concave, selected")
      clickTimer = setTimeout(() => speak(describeFocus(el, langRef.current)), 80)
    }

    let valueTimer: ReturnType<typeof setTimeout> | undefined
    const onChange = (event: Event) => {
      const el = event.target as Element
      const keyboard = !fromPointer() && el === document.activeElement && el.matches(':focus-visible')
      // Mouse: read a slider's or drop-down's value when it's let go (the `change` event);
      // radios and checkboxes are read by the click announcement
      const pointerDone =
        event.type === 'change' &&
        ((el instanceof HTMLInputElement && el.type === 'range') || el instanceof HTMLSelectElement)
      if (!keyboard && !pointerDone) return
      clearTimeout(valueTimer)
      // Wait for the slider to settle, so holding an arrow key doesn't stutter
      valueTimer = setTimeout(() => speak(describeValue(el, langRef.current)), 250)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('click', onClick, true)
    document.addEventListener('input', onChange)
    document.addEventListener('change', onChange)
    return () => {
      clearTimeout(valueTimer)
      clearTimeout(clickTimer)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('focusin', onFocus)
      document.removeEventListener('click', onClick, true)
      document.removeEventListener('input', onChange)
      document.removeEventListener('change', onChange)
    }
  }, [voice])

  // Say the legend once typing pauses (not on page load)
  useEffect(() => {
    if (firstLegend.current) {
      firstLegend.current = false
      return
    }
    if (!voice || !legendKey) return
    const timer = setTimeout(() => speak(legendText.current, { interrupt: false }), 800)
    return () => clearTimeout(timer)
  }, [legendKey, voice])

  return null
}
