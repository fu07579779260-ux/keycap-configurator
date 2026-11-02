import { Grid, OrbitControls } from '@react-three/drei'
import { Canvas, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { KEY_PITCH, meshSize } from '@/geometry/dimensions'
import { stemLayout } from '@/geometry/stems'
import { useT } from '@/i18n/language'
import { useDesign } from '@/model/design-context'
import type { Material } from '@/model/options'
import { KeycapBody } from './KeycapBody'
import { useKeycapMesh } from './use-keycap-mesh'

// Scene units are millimetres, Y up. Colours match the paper/ink theme tokens.
const PAPER = '#f3f3ef'
const GRID = '#d8d8d1'
const RULE = '#a9a9a1'

type ViewMode = 'top' | 'under'

/** Viewing directions from the target; the distance scales with the key's size. */
const unit = (v: number[]) => v.map((c) => c / Math.hypot(...v)) as [number, number, number]
const DIRECTIONS: Record<ViewMode, [number, number, number]> = {
  top: unit([38, 32, 46]),
  under: unit([20, -40, 30]),
}
/** Camera distance for a 1u key, and per mm of width for long keys (the view is wider than tall). */
const BASE_DISTANCE = 68
const DISTANCE_PER_MM_WIDTH = 2

const fmt = (mm: number) => mm.toFixed(2)

/** Moves the camera to the chosen view whenever `homeKey` changes. */
function CameraHome({ homeKey, mode, distance, targetY }: {
  homeKey: string
  mode: ViewMode
  distance: number
  targetY: number
}) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    const [x, y, z] = DIRECTIONS[mode]
    camera.position.set(x * distance, targetY + y * distance, z * distance)
    invalidate()
    // Only re-home on purpose (view buttons, new width), not on every small change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeKey, camera, invalidate])
  return null
}

export default function Viewport() {
  const t = useT()
  const { config } = useDesign()
  // Bumping the counter remounts the controls, which also clears leftover damping motion
  const [view, setView] = useState<{ mode: ViewMode; n: number }>({ mode: 'top', n: 0 })
  const { body, accent, hollow } = useKeycapMesh(config)
  const stems = useMemo(() => stemLayout(config), [config])
  // Measure both parts together: a raised accent stands above the body
  const { width, depth, height } = accent ? meshSize(body.positions, accent.positions) : meshSize(body.positions)
  const dims = `${fmt(width)} × ${fmt(depth)} × ${fmt(height)} mm`

  const distance = Math.max(BASE_DISTANCE, DISTANCE_PER_MM_WIDTH * width)
  const targetY = height / 2
  // A new width needs a new framing; other edits keep the user's view
  const homeKey = `${view.mode}:${view.n}:${config.size.widthU}`
  const showView = (mode: ViewMode) => setView((v) => ({ mode, n: v.n + 1 }))

  return (
    <div className="relative h-full min-h-80 border border-ink bg-paper">
      <Canvas
        role="img"
        aria-label={`${t('viewport.label')}: ${dims}`}
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ position: DIRECTIONS.top.map((v) => v * distance) as [number, number, number], fov: 35, near: 0.5, far: 4000 }}
        fallback={<p className="annotation p-4">{t('viewport.noWebgl')}</p>}
      >
        <color attach="background" args={[PAPER]} />
        <hemisphereLight args={['#ffffff', '#c9c9c2', 1.6]} />
        <directionalLight position={[30, 60, 40]} intensity={1.8} />
        <directionalLight position={[-40, -30, -30]} intensity={0.6} />

        <KeycapBody
          mesh={body}
          colour={config.manufacturing.mainColour}
          material={config.manufacturing.material as Material}
          translucency={config.manufacturing.translucency}
        />
        {accent && config.manufacturing.secondColour && (
          <KeycapBody
            mesh={accent}
            colour={config.manufacturing.secondColour}
            material={config.manufacturing.material as Material}
            translucency={0}
            outline={false}
          />
        )}

        {/* 1 mm cells, one section per key pitch; hidden from below so it doesn't cover the stems */}
        {view.mode === 'top' && (
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
        )}
        <CameraHome homeKey={homeKey} mode={view.mode} distance={distance} targetY={targetY} />
        <OrbitControls
          key={homeKey}
          makeDefault
          target={[0, targetY, 0]}
          minDistance={20}
          maxDistance={distance * 3}
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
        <div className="pointer-events-auto flex gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-pressed={view.mode === 'under'}
            className="border-ink bg-paper aria-pressed:bg-ink aria-pressed:text-paper"
            onClick={() => showView('under')}
          >
            {t('viewport.underside')}
          </Button>
          <Button size="sm" variant="outline" className="border-ink bg-paper" onClick={() => showView('top')}>
            {t('viewport.resetView')}
          </Button>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-between gap-2 p-3">
        <p className="annotation text-signal">{hollow ? t('viewport.printable') : t('viewport.building')}</p>
        <p className="annotation">{t('viewport.hint')}</p>
      </div>
    </div>
  )
}
