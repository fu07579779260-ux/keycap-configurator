import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { KEY_PITCH, placeholderSize } from '@/geometry/dimensions'
import { useT } from '@/i18n/language'
import { useDesign } from '@/model/design-context'
import { KeycapPlaceholder } from './KeycapPlaceholder'

// Scene units are millimetres, Y up. Colours match the paper/ink theme tokens.
const PAPER = '#f3f3ef'
const GRID = '#d8d8d1'
const RULE = '#a9a9a1'

const HOME_POSITION = [38, 32, 46] as const

const fmt = (mm: number) => mm.toFixed(2)

/** Puts the camera back at its home position whenever `viewKey` changes. */
function CameraHome({ viewKey }: { viewKey: number }) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    camera.position.set(...HOME_POSITION)
    invalidate()
  }, [viewKey, camera, invalidate])
  return null
}

export default function Viewport() {
  const t = useT()
  const { config } = useDesign()
  // Bumping this remounts the controls, which also clears leftover damping motion
  const [viewKey, setViewKey] = useState(0)
  const { width, depth, height } = placeholderSize(config)
  const dims = `${fmt(width)} × ${fmt(depth)} × ${fmt(height)} mm`

  return (
    <div className="relative h-full min-h-80 border border-ink bg-paper">
      <Canvas
        role="img"
        aria-label={`${t('viewport.label')}: ${dims}`}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: [...HOME_POSITION], fov: 35, near: 0.5, far: 2000 }}
        fallback={<p className="annotation p-4">{t('viewport.noWebgl')}</p>}
      >
        <color attach="background" args={[PAPER]} />
        <hemisphereLight args={['#ffffff', '#c9c9c2', 1.6]} />
        <directionalLight position={[30, 60, 40]} intensity={1.8} />
        <directionalLight position={[-40, 20, -30]} intensity={0.5} />

        <KeycapPlaceholder />

        {/* 1 mm cells, one section per key pitch */}
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={KEY_PITCH}
          cellColor={GRID}
          sectionColor={RULE}
          cellThickness={0.6}
          sectionThickness={1}
          fadeDistance={260}
          fadeStrength={1.5}
        />
        <CameraHome viewKey={viewKey} />
        <OrbitControls
          key={viewKey}
          makeDefault
          target={[0, height / 2, 0]}
          minDistance={20}
          maxDistance={400}
          maxPolarAngle={Math.PI * 0.495}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div>
          <p className="annotation">{t('viewport.dimensions')}</p>
          <p className="font-mono text-sm">{dims}</p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="pointer-events-auto border-ink bg-paper"
          onClick={() => setViewKey((k) => k + 1)}
        >
          {t('viewport.resetView')}
        </Button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-between gap-2 p-3">
        <p className="annotation text-signal">{t('viewport.placeholder')}</p>
        <p className="annotation">{t('viewport.hint')}</p>
      </div>
    </div>
  )
}
