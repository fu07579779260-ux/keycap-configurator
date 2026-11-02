import { Edges } from '@react-three/drei'
import { placeholderSize } from '@/geometry/dimensions'
import { useDesign } from '@/model/design-context'

// A box with the keycap's footprint and height; replaced by real geometry in build step 5
export function KeycapPlaceholder() {
  const { config } = useDesign()
  const { width, depth, height } = placeholderSize(config)
  const opacity = 1 - config.manufacturing.translucency / 100

  return (
    <mesh position={[0, height / 2, 0]} castShadow>
      <boxGeometry args={[width, height, depth]} />
      <meshStandardMaterial
        color={config.manufacturing.mainColour}
        roughness={0.55}
        transparent={opacity < 1}
        opacity={opacity}
      />
      <Edges color="#111111" lineWidth={1.25} />
    </mesh>
  )
}
