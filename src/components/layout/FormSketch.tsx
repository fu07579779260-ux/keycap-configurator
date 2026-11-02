// Side-elevation sketch of each top form, used on the home page
export type TopForm = 'flat' | 'concave' | 'convex' | 'angled' | 'tactile'

const TOP: Record<TopForm, string> = {
  flat: 'M10 14 H54',
  concave: 'M10 14 Q32 24 54 14',
  convex: 'M10 16 Q32 4 54 16',
  angled: 'M10 20 L54 10',
  tactile: 'M10 14 H28 V10 H36 V14 H54',
}

export function FormSketch({ form }: { form: TopForm }) {
  return (
    <svg viewBox="0 0 64 48" fill="none" aria-hidden="true" className="w-full">
      {/* walls and base */}
      <path d="M10 14 L6 40 H58 L54 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      {/* top surface */}
      <path d={TOP[form]} stroke="var(--signal)" strokeWidth="2" strokeLinejoin="round" />
      {/* stem */}
      <path d="M28 40 V45 M36 40 V45" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}
