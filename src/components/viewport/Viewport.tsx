import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { bodyParams, buildBody } from '@/geometry/body'
import { KEY_PITCH, meshSize } from '@/geometry/dimensions'
import { stemLayout } from '@/geometry/stems'
import { useT } from '@/i18n/language'
import { useDesign } from '@/model/design-context'
import { KeycapBody } from './KeycapBody'
import { STEM_PREVIEW_HEIGHT, StemPosts } from './StemPosts'

// Scene units are millimetres, Y up. Colours match the paper/ink theme tokens.
const PAPER = '#f3f3ef'
const GRID = '#d8d8d1'
const RULE = '#a9a9a1'

/** Viewing direction from the target; the distance scales with the key's size. */
const HOME_DIRECTION = [38, 32, 46].map((v, _, a) => v / Math.hypot(...a)) as [number, number, number]
/** Camera distance for a 1u key, and per mm of width for long keys (the view is wider than tall). */
const BASE_DISTANCE = 68
const DISTANCE_PER_MM_WIDTH = 2

const fmt = (mm: number) => mm.toFixed(2)

/** Moves the camera to its home position whenever `homeKey` changes. */
function CameraHome({ homeKey, distance, targetY }: { homeKey: string; distance: number; targetY: number }) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const [x, y, z] = HOME_DIRECTION
    camera.position.set(x * distance, targetY + y * distance, z * distance)
    invalidate()
    // Only re-home on purpose (reset button, new width), not on every small change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeKey, camera, invalidate])
  return null
}

export default function Viewport() {
  const t = useT()
  const { config } = useDesign()
  // Bumping this remounts the controls, which also clears leftover damping motion
  const [viewKey, setViewKey] = useState(0)
  const mesh = useMemo(() => buildBody(bodyParams(config)), [config])
  const stems = useMemo(() => stemLayout(config), [config])
  const { width, depth, height } = meshSize(mesh.positions)
  const dims = `${fmt(width)} × ${fmt(depth)} × ${fmt(height)} mm`

  const distance = Math.max(BASE_DISTANCE, DISTANCE_PER_MM_WIDTH * width)
  const targetY = STEM_PREVIEW_HEIGHT + height / 2
  // A new width needs a new framing; other edits keep the user's view
  const homeKey = `${viewKey}:${config.size.widthU}`

  return (
    <div className="relative h-full min-h-80 border border-ink bg-paper">
      <Canvas
        role="img"
        aria-label={`${t('viewport.label')}: ${dims}`}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: HOME_DIRECTION.map((v) => v * distance) as [number, number, number], fov: 35, near: 0.5, far: 4000 }}
        fallback={<p className="annotation p-4">{t('viewport.noWebgl')}</p>}
      >
        <color attach="background" args={[PAPER]} />
        <hemisphereLight args={['#ffffff', '#c9c9c2', 1.6]} />
        <directionalLight position={[30, 60, 40]} intensity={1.8} />
        <directionalLight position={[-40, 20, -30]} intensity={0.5} />

        {/* The keycap is lifted onto its stems so they stay visible */}
        <group position={[0, STEM_PREVIEW_HEIGHT, 0]}>
          <KeycapBody
            mesh={mesh}
            colour={config.manufacturing.mainColour}
            translucency={config.manufacturing.translucency}
          />
        </group>
        <StemPosts main={stems.main} stabilisers={stems.stabilisers} />

        {/* 1 mm cells, one section per key pitch */}
        <Grid
          infiniteGrid
          cellSize={1}
          sectionSize={KEY_PITCH}
          cellColor={GRID}
          sectionColor={RULE}
          cellThickness={0.6}
          sectionThickness={1}
          fadeDistance={Math.max(260, distance * 2.5)}
          fadeStrength={1.5}
        />
        <CameraHome homeKey={homeKey} distance={distance} targetY={targetY} />
        <OrbitControls
          key={homeKey}
          makeDefault
          target={[0, targetY, 0]}
          minDistance={20}
          maxDistance={distance * 3}
          maxPolarAngle={Math.PI * 0.495}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
        <div>
          <p className="annotation">{t('viewport.dimensions')}</p>
          <p className="font-mono text-sm">{dims}</p>
          {stems.spacing !== null && (
            <p className="annotation mt-1 text-signal">
              {t('viewport.stabiliserSpacing')} {fmt(stems.spacing)} mm
            </p>
          )}
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
