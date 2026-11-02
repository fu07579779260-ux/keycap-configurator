import { Grid, Html, OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useRef, useState, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { KeycapBody } from '@/components/viewport/KeycapBody'
import { useKeycapMesh } from '@/components/viewport/use-keycap-mesh'
import { footprint, KEY_PITCH } from '@/geometry/dimensions'
import { useT } from '@/i18n/language'
import type { CompareItem } from '@/model/compare-store'
import type { KeycapConfig } from '@/model/config'
import type { Material } from '@/model/options'

const PAPER = '#f3f3ef'
/** Space between neighbouring keys in the row, in mm. */
const GAP = 8

/** One keycap of the row, built like the configurator's preview. */
function CompareKey({ config, x, label, labels }: {
  config: KeycapConfig
  x: number
  label: string
  labels: RefObject<HTMLDivElement | null>
}) {
  const { body, accent } = useKeycapMesh(config)
  const m = config.manufacturing
  return (
    <group position={[x, 0, 0]}>
      <KeycapBody mesh={body} colour={m.mainColour} material={m.material as Material} translucency={m.translucency} />
      {accent && m.secondColour && (
        <KeycapBody mesh={accent} colour={m.secondColour} material={m.material as Material} translucency={0} outline={false} />
      )}
      {/* Number in front of the key, matching the list below the view */}
      <Html position={[0, 0, footprint(config.size.widthU).depth / 2 + 5]} center portal={labels as RefObject<HTMLElement>}>
        <span className="annotation pointer-events-none bg-paper px-1 text-ink">{label}</span>
      </Html>
    </group>
  )
}

export default function CompareViewport({ items }: { items: CompareItem[] }) {
  const t = useT()
  const [viewKey, setViewKey] = useState(0)
  // Labels go into this overlay; without it, the first label can mount before the canvas container exists
  const labels = useRef<HTMLDivElement>(null)

  // Lay the keys out left to right, centred on the origin
  const widths = items.map((i) => footprint(i.config.size.widthU).width)
  const total = widths.reduce((a, w) => a + w, 0) + GAP * Math.max(0, items.length - 1)
  let cursor = -total / 2
  const xs = widths.map((w) => {
    const x = cursor + w / 2
    cursor += w + GAP
    return x
  })

  // Far enough to see the whole row in a wide view
  const distance = Math.max(70, total * 1.1)

  return (
    <div className="relative h-full min-h-72 border border-ink bg-paper">
      <Canvas
        key={viewKey}
        role="img"
        aria-label={t('compare.viewLabel')}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [0, distance * 0.55, distance * 0.75], fov: 35, near: 0.5, far: 5000 }}
        fallback={<p className="annotation p-4">{t('viewport.noWebgl')}</p>}
      >
        <color attach="background" args={[PAPER]} />
        <hemisphereLight args={['#ffffff', '#c9c9c2', 1.6]} />
        <directionalLight position={[30, 60, 40]} intensity={1.8} />
        <directionalLight position={[-40, 20, -30]} intensity={0.5} />
        {items.map((item, i) => (
          <CompareKey key={item.id} config={item.config} x={xs[i]} label={String(i + 1).padStart(2, '0')} labels={labels} />
        ))}
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={KEY_PITCH}
          cellColor="#d8d8d1"
          sectionColor="#a9a9a1"
          cellThickness={0.6}
          sectionThickness={1}
          fadeDistance={Math.max(260, distance * 3)}
          fadeStrength={1.5}
        />
        <OrbitControls makeDefault target={[0, 4, 0]} minDistance={20} maxDistance={distance * 3} maxPolarAngle={Math.PI * 0.495} />
      </Canvas>
      <div ref={labels} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden" />
      <div className="pointer-events-none absolute top-0 right-0 p-3">
        <Button size="sm" variant="outline" className="pointer-events-auto border-ink bg-paper" onClick={() => setViewKey((k) => k + 1)}>
          {t('viewport.resetView')}
        </Button>
      </div>
    </div>
  )
}
