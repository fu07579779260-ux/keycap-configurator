/**
 * The keyboard simulator says key names itself (for every press, wherever
 * focus is). While it's open, the global announcer leaves key presses to it,
 * so nothing is said twice.
 */
let claims = 0

export function claimKeyVoice() {
  claims++
  return () => {
    claims--
  }
}

export const keyVoiceClaimed = () => claims > 0
