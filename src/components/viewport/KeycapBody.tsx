import { Edges } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import type { MeshData } from '@/geometry/body'
import type { Material } from '@/model/options'

/** How each material looks: matte nylon and TPU, glossy resin, clear resin almost glassy. */
const FINISH: Record<Material, { roughness: number; clearcoat: number }> = {
  pla: { roughness: 0.55, clearcoat: 0 },
  petg: { roughness: 0.35, clearcoat: 0.3 },
  tpu: { roughness: 0.8, clearcoat: 0 },
  standard: { roughness: 0.3, clearcoat: 0.4 },
  tough: { roughness: 0.4, clearcoat: 0.2 },
  clear: { roughness: 0.12, clearcoat: 1 },
  pa12: { roughness: 0.9, clearcoat: 0 },
}

interface Props {
  mesh: MeshData
  colour: string
  material: Material
  translucency: number
  /** Draw crease outlines (off for small accent parts, where they'd turn into clutter). */
  outline?: boolean
}

// Geometry is built Z-up (like the exported files); rotate it into three.js' Y-up scene
export function KeycapBody({ mesh, colour, material, translucency, outline = true }: Props) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(mesh.positions, 3))
    g.setIndex(new BufferAttribute(mesh.indices, 1))
    g.computeVertexNormals()
    return g
  }, [mesh])

  useEffect(() => () => geometry.dispose(), [geometry])

  const opacity = 1 - translucency / 100
  const finish = FINISH[material] ?? FINISH.pla

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshPhysicalMaterial
        color={colour}
        roughness={finish.roughness}
        clearcoat={finish.clearcoat}
        transparent={opacity < 1}
        opacity={opacity}
        depthWrite={opacity >= 1}
      />
      {/* Outline only the creases, like a line drawing */}
      {outline && <Edges threshold={35} color="#111111" lineWidth={1.25} />}
    </mesh>
  )
}
