import { Edges } from '@react-three/drei'
import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry } from 'three'
import type { MeshData } from '@/geometry/body'

interface Props {
  mesh: MeshData
  colour: string
  translucency: number
}

// Geometry is built Z-up (like the exported files); rotate it into three.js' Y-up scene
export function KeycapBody({ mesh, colour, translucency }: Props) {
  const geometry = useMemo(() => {
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(mesh.positions, 3))
    g.setIndex(new BufferAttribute(mesh.indices, 1))
    g.computeVertexNormals()
    return g
  }, [mesh])

  useEffect(() => () => geometry.dispose(), [geometry])

  const opacity = 1 - translucency / 100

  return (
    <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial color={colour} roughness={0.55} transparent={opacity < 1} opacity={opacity} />
      {/* Outline only the creases, like a line drawing */}
      <Edges threshold={35} color="#111111" lineWidth={1.25} />
    </mesh>
  )
}
