import { Grid, Instance, Instances, OrbitControls, RoundedBox } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { BufferAttribute, BufferGeometry, type Object3D } from 'three'
import { KeyboardOrbit } from '@/components/viewport/KeyboardOrbit'
import { KeycapBody } from '@/components/viewport/KeycapBody'
import { useKeycapMesh } from '@/components/viewport/use-keycap-mesh'
import { bodyParams, buildBody } from '@/geometry/body'
import { KEY_PITCH } from '@/geometry/dimensions'
import { DEFAULT_CONFIG, type KeycapConfig } from '@/model/config'
import type { Material, Profile } from '@/model/options'
import { layoutSize, type KeyPosition } from '@/keyboard/layouts'

// Scene units are millimetres, Y up; the typist sits towards +Z.
const PAPER = '#f3f3ef'
const GRID = '#d8d8d1'
const RULE = '#a9a9a1'
const SIGNAL = '#c2410c'
const KEY_COLOUR = '#b9b8b1'
const DIM_COLOUR = '#7a7a73'
const TARGET_COLOUR = '#f2c7ae'
const CASE_COLOUR = '#2b2b2b'
const HOUSING_COLOUR = '#4a4a46'

/** Heights: the plate is the case's top face; keycaps stand on the switches above it. */
const CASE_HEIGHT = 14
const CASE_MARGIN = 9
const HOUSING_HEIGHT = 5
const CAP_BASE = 6.5
/** Key travel when pressed, in mm. */
export const TRAVEL = 4

export type KeyboardView = 'angled' | 'top' | 'front'
const DIRECTIONS: Record<KeyboardView, [number, number, number]> = {
  angled: [0, 0.95, 0.75],
  top: [0, 1, 0.02],
  front: [0, 0.32, 1],
}

interface Props {
  keys: KeyPosition[]
  config: KeycapConfig
  /** Where the design sits; null = it fits nowhere and stands in front of the keyboard. */
  placed: KeyPosition | null
  pressed: ReadonlySet<string>
  /** Choosing a position: only these codes can be picked, the rest are dimmed. */
  placing: ReadonlySet<string> | null
  reducedMotion: boolean
  view: { mode: KeyboardView; n: number }
  label: string
  onPress: (code: string) => void
  onRelease: (code: string) => void
  onPlace: (code: string) => void
  onResetView: () => void
}

/** One plain keycap shape (the design's profile, default top), rotated into the Y-up scene. */
function defaultCapGeometry(profile: Profile, key: KeyPosition) {
  const config: KeycapConfig = {
    ...DEFAULT_CONFIG,
    size: { ...DEFAULT_CONFIG.size, profile, widthU: Math.max(key.w, key.h), row: key.row, heightOverride: null },
  }
  const mesh = buildBody(bodyParams(config))
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(mesh.positions, 3))
  g.setIndex(new BufferAttribute(mesh.indices, 1))
  g.rotateX(-Math.PI / 2)
  // Tall numpad keys are wide keys turned sideways
  if (key.h > key.w) g.rotateY(Math.PI / 2)
  g.computeVertexNormals()
  return g
}

const shapeKey = (k: KeyPosition) => `${k.w}x${k.h}:${k.row}`

/**
 * Moves each registered key towards its target height every frame, and keeps
 * rendering only while something is still moving (the canvas renders on demand).
 */
function useKeyTravel(pressed: ReadonlySet<string>, reducedMotion: boolean) {
  const objects = useRef(new Map<string, Object3D>())
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => invalidate(), [pressed, invalidate])

  useFrame((_, delta) => {
    let moving = false
    for (const [code, obj] of objects.current) {
      // Reduced motion: keys light up but don't move
      const target = CAP_BASE - (pressed.has(code) && !reducedMotion ? TRAVEL : 0)
      const diff = target - obj.position.y
      if (Math.abs(diff) < 0.01) {
        obj.position.y = target
        continue
      }
      obj.position.y += diff * Math.min(1, delta * 30)
      moving = true
    }
    if (moving) invalidate()
  })

  return (code: string) => (obj: Object3D | null) => {
    if (obj) objects.current.set(code, obj)
    else objects.current.delete(code)
  }
}

/** The user's own keycap, built exactly as in the configurator. */
function DesignKey({ config, pressed, position, register }: {
  config: KeycapConfig
  pressed: boolean
  position: [number, number, number]
  register: (obj: Object3D | null) => void
}) {
  const { body, accent } = useKeycapMesh(config)
  const m = config.manufacturing
  return (
    <group ref={register} position={position}>
      <KeycapBody
        mesh={body}
        colour={pressed ? SIGNAL : m.mainColour}
        material={m.material as Material}
        translucency={m.translucency}
      />
      {accent && m.secondColour && (
        <KeycapBody mesh={accent} colour={m.secondColour} material={m.material as Material} translucency={0} outline={false} />
      )}
    </group>
  )
}

function CameraHome({ view, size }: { view: Props['view']; size: { width: number; depth: number } }) {
  const camera = useThree((s) => s.camera)
  const aspect = useThree((s) => s.size.width / Math.max(1, s.size.height))
  const invalidate = useThree((s) => s.invalidate)
  useLayoutEffect(() => {
    // Far enough for the whole keyboard to fit the view's width and height (35° field of view)
    const half = Math.tan((35 / 2) * (Math.PI / 180))
    const distance = Math.max((size.width / 2 + 30) / (half * aspect), (size.depth / 2 + 60) / half)
    const [x, y, z] = DIRECTIONS[view.mode]
    const len = Math.hypot(x, y, z)
    camera.position.set((x / len) * distance, (y / len) * distance, (z / len) * distance)
    camera.lookAt(0, 0, 0)
    invalidate()
    // Re-frame on purpose (view buttons, new layout), not on every resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, size.width, size.depth])
  return null
}

function Scene(props: Props) {
  const { keys, config, placed, pressed, placing, reducedMotion, view } = props
  const register = useKeyTravel(pressed, reducedMotion)
  const profile = config.size.profile

  const size = useMemo(() => {
    const u = layoutSize(keys)
    return { width: u.width * KEY_PITCH, depth: u.depth * KEY_PITCH }
  }, [keys])
  const centre = (k: KeyPosition): [number, number] => [
    (k.x + k.w / 2) * KEY_PITCH - size.width / 2,
    (k.y + k.h / 2) * KEY_PITCH - size.depth / 2,
  ]

  // Each distinct default keycap is built once and drawn as instances
  const groups = useMemo(() => {
    const map = new Map<string, { geometry: BufferGeometry; keys: KeyPosition[] }>()
    for (const k of keys) {
      if (k.code === placed?.code) continue
      const id = shapeKey(k)
      const group = map.get(id) ?? { geometry: defaultCapGeometry(profile, k), keys: [] }
      group.keys.push(k)
      map.set(id, group)
    }
    return [...map.values()]
  }, [keys, placed?.code, profile])
  useEffect(() => () => groups.forEach((g) => g.geometry.dispose()), [groups])

  const colourOf = (code: string) => {
    if (pressed.has(code)) return SIGNAL
    if (placing) return placing.has(code) ? TARGET_COLOUR : DIM_COLOUR
    return KEY_COLOUR
  }

  const pointer = (code: string) => ({
    onPointerDown: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation()
      if (placing) {
        if (placing.has(code)) props.onPlace(code)
        return
      }
      props.onPress(code)
    },
    onPointerUp: () => props.onRelease(code),
    onPointerOut: () => props.onRelease(code),
    onPointerOver: () => {
      document.body.style.cursor = !placing || placing.has(code) ? 'pointer' : 'not-allowed'
    },
    onPointerLeave: () => {
      document.body.style.cursor = ''
    },
  })
  useEffect(() => () => void (document.body.style.cursor = ''), [])

  const designPosition: [number, number, number] = placed
    ? [centre(placed)[0], CAP_BASE, centre(placed)[1]]
    : // Fits nowhere: on the table in front of the keyboard
      [0, -CASE_HEIGHT, size.depth / 2 + CASE_MARGIN + KEY_PITCH * 1.2]

  return (
    <>
      <color attach="background" args={[PAPER]} />
      <hemisphereLight args={['#ffffff', '#c9c9c2', 1.6]} />
      <directionalLight position={[60, 200, 140]} intensity={1.8} />
      <directionalLight position={[-120, 80, -80]} intensity={0.5} />

      {/* Case; its top face is the plate */}
      <RoundedBox
        args={[size.width + CASE_MARGIN * 2, CASE_HEIGHT, size.depth + CASE_MARGIN * 2]}
        radius={4}
        smoothness={4}
        position={[0, -CASE_HEIGHT / 2, 0]}
      >
        <meshStandardMaterial color={CASE_COLOUR} roughness={0.7} />
      </RoundedBox>

      {/* Switch housings */}
      <Instances limit={keys.length} key={`housings-${keys.length}`}>
        <boxGeometry args={[14, HOUSING_HEIGHT, 14]} />
        <meshStandardMaterial color={HOUSING_COLOUR} roughness={0.8} />
        {keys.map((k) => {
          const [x, z] = centre(k)
          return <Instance key={k.code} position={[x, HOUSING_HEIGHT / 2, z]} />
        })}
      </Instances>

      {groups.map((g) => (
        <Instances key={`${shapeKey(g.keys[0])}-${g.keys.length}-${profile}`} limit={g.keys.length}>
          <primitive object={g.geometry} attach="geometry" />
          <meshStandardMaterial color="white" roughness={0.55} />
          {g.keys.map((k) => {
            const [x, z] = centre(k)
            return (
              <Instance
                key={k.code}
                ref={register(k.code)}
                position={[x, CAP_BASE, z]}
                color={colourOf(k.code)}
                {...pointer(k.code)}
              />
            )
          })}
        </Instances>
      ))}

      <DesignKey
        key={placed ? 'placed' : 'beside'}
        config={config}
        pressed={placed ? pressed.has(placed.code) : false}
        position={designPosition}
        register={placed ? register(placed.code) : () => {}}
      />

      <Grid
        infiniteGrid
        position={[0, -CASE_HEIGHT - 0.01, 0]}
        cellSize={KEY_PITCH / 4}
        sectionSize={KEY_PITCH}
        cellColor={GRID}
        sectionColor={RULE}
        cellThickness={0.5}
        sectionThickness={0.9}
        fadeDistance={size.width * 2.5}
        fadeStrength={1.5}
      />

      <CameraHome view={view} size={size} />
      <KeyboardOrbit onReset={props.onResetView} label={props.label} describedBy="keyboard-keys" />
      <OrbitControls
        key={`${view.mode}:${view.n}:${size.width}`}
        makeDefault
        enableDamping={!reducedMotion}
        target={[0, 0, 0]}
        minDistance={60}
        maxDistance={size.width * 3}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  )
}

export default function KeyboardScene(props: Props & { noWebgl: string }) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 300, 250], fov: 35, near: 1, far: 6000 }}
      fallback={<p className="annotation p-4">{props.noWebgl}</p>}
    >
      <Scene {...props} />
    </Canvas>
  )
}

