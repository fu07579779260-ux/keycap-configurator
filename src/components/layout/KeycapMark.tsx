// Logo: a keycap in side elevation, drawn as line art
export function KeycapMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" className={className}>
      <path d="M4 26 L7 8 Q16 11 25 8 L28 26 Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M13 26 V30 M19 26 V30" stroke="currentColor" strokeWidth="1.75" />
      <path d="M2 26 H30" stroke="var(--signal)" strokeWidth="1.75" />
    </svg>
  )
}
