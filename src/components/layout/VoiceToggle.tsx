import { useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { displayStore, useDisplay } from '@/model/display'
import { speak, speechSupported } from '@/voice/speech'

/** Always-visible switch for the voice feedback (spoken in the interface language). */
export function VoiceToggle() {
  const t = useT()
  const { voice } = useDisplay()
  if (!speechSupported()) return null

  return (
    <button
      type="button"
      aria-pressed={voice}
      onClick={() => {
        displayStore.set({ voice: !voice })
        // Confirm out loud when it's switched on
        if (!voice) speak(t('voice.onSpoken'))
      }}
      className={cn('flex min-h-7 items-center gap-1.5 border border-ink px-2.5 font-mono text-xs', voice ? 'bg-ink text-paper' : 'hover:bg-secondary')}
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M2 6h3l4-3v10L5 10H2z" fill="currentColor" stroke="none" />
        {voice ? <path d="M11 5.5a3.5 3.5 0 0 1 0 5M12.8 3.5a6.5 6.5 0 0 1 0 9" /> : <path d="M11 6l4 4M15 6l-4 4" />}
      </svg>
      {t('voice.label')}
    </button>
  )
}
