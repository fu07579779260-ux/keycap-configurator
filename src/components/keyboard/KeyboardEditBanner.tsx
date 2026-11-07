import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/language'
import { inKeyboardEdit, keyboardEditChanged } from '@/keyboard/edit-session'
import { href } from '@/lib/router'
import { useDesign } from '@/model/design-context'

/** Shown in the configurator when the user came from the keyboard simulator: saved state and a way back. */
export function KeyboardEditBanner() {
  const t = useT()
  const { config } = useDesign()
  if (!inKeyboardEdit()) return null
  const changed = keyboardEditChanged(config)

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border border-ink bg-card px-3 py-2">
      <p role="status" className="text-sm">
        {changed ? (
          <>
            <span aria-hidden className="mr-1.5 font-semibold text-signal">✓</span>
            {t('keyboard.editSaved')}
          </>
        ) : (
          t('keyboard.editing')
        )}
      </p>
      <Button asChild size="sm" variant={changed ? 'default' : 'outline'} className="border-ink">
        <a href={href('/keyboard')}>← {t('keyboard.backToKeyboard')}</a>
      </Button>
    </div>
  )
}
