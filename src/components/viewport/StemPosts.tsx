/** How far the preview lifts the keycap so the stems underneath are visible. */
export const STEM_PREVIEW_HEIGHT = 4

const POST_RADIUS = 2.75

interface Props {
  main: [number, number]
  stabilisers: [number, number][]
}

// Simple posts at the stem positions; the real stem shapes arrive in build step 8.
// Drawn "x-ray" (no depth test) like hidden lines on a drawing, so they show through the cap.
// Positions are Z-up (x, y on the base); y = back maps to -z in the Y-up scene.
export function StemPosts({ main, stabilisers }: Props) {
  const posts = [
    { at: main, colour: '#111111' },
    ...stabilisers.map((at) => ({ at, colour: '#d9480f' })),
  ]

  return (
    <>
      {posts.map(({ at: [x, y], colour }) => (
        <mesh key={`${x},${y}`} position={[x, STEM_PREVIEW_HEIGHT / 2, -y]} renderOrder={10}>
          <cylinderGeometry args={[POST_RADIUS, POST_RADIUS, STEM_PREVIEW_HEIGHT, 24]} />
          {/* Faint, so the posts hint at the stems without hiding the top surface */}
          <meshBasicMaterial color={colour} transparent opacity={0.22} depthTest={false} depthWrite={false} />
        </mesh>
      ))}
    </>
  )
}
