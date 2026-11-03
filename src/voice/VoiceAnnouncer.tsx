import { useEffect, useRef } from 'react'
import { useDesign } from '@/model/design-context'
import { useDisplay } from '@/model/display'
import { describeFocus, describeValue } from './describe-focus'
import { keyName } from './key-names'
import { KEY_TESTER_ATTR, legendSpeech } from './legend-speech'
import { speak, stopSpeaking } from './speech'

/**
 * English voice feedback (PLAN.md §5), on by default:
 * 1. physical keys pressed when nothing is focused, or in the key tester;
 * 2. the control that gets keyboard focus, and its new value when it changes;
 * 3. the keycap's legend when it changes (and the 3D view describes the key on focus).
 */
export function VoiceAnnouncer() {
  const { voice } = useDisplay()
  const { config } = useDesign()
  const legendText = legendSpeech(config.legend)
  const firstLegend = useRef(true)

  useEffect(() => {
    if (!voice) {
      stopSpeaking()
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return
      const target = event.target as Element | null
      const inTester = target?.closest?.(`[${KEY_TESTER_ATTR}]`)
      const nothingFocused = !target || target === document.body || target === document.documentElement
      if (inTester || nothingFocused) speak(keyName(event))
    }

    const onFocus = (event: FocusEvent) => {
      const el = event.target as Element
      // Only keyboard focus: a mouse click shouldn't trigger speech
      if (!el.matches?.(':focus-visible') || el.closest(`[${KEY_TESTER_ATTR}]`)) return
      speak(describeFocus(el))
    }

    let valueTimer: ReturnType<typeof setTimeout> | undefined
    const onChange = (event: Event) => {
      const el = event.target as Element
      if (el !== document.activeElement || !el.matches(':focus-visible')) return
      clearTimeout(valueTimer)
      // Wait for the slider to settle, so holding an arrow key doesn't stutter
      valueTimer = setTimeout(() => speak(describeValue(el)), 250)
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocus)
    document.addEventListener('input', onChange)
    document.addEventListener('change', onChange)
    return () => {
      clearTimeout(valueTimer)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocus)
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
    if (!voice || !legendText) return
    const timer = setTimeout(() => speak(legendText, { interrupt: false }), 800)
    return () => clearTimeout(timer)
  }, [legendText, voice])

  return null
}
