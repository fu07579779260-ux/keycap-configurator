import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Spherical, Vector3 } from 'three'

/** Degrees per arrow press, and zoom factor per +/− press. */
const STEP = (10 * Math.PI) / 180
const ZOOM = 0.85

interface Controls {
  target: Vector3
  minDistance: number
  maxDistance: number
  update(): void
}

/**
 * Keyboard control for the 3D view: arrows rotate around the keycap,
 * + / − zoom, and 0 (or Home) asks for the starting view. The canvas
 * becomes focusable, so it's reachable with Tab.
 */
export function KeyboardOrbit({ onReset, label, describedBy }: { onReset: () => void; label: string; describedBy?: string }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as Controls | null
  const element = useThree((s) => s.gl.domElement)
  const invalidate = useThree((s) => s.invalidate)

  useEffect(() => {
    // The focusable canvas itself is the labelled image (a focusable child inside role="img" would be hidden)
    element.tabIndex = 0
    element.setAttribute('role', 'img')
    element.setAttribute('aria-label', label)
    if (describedBy) element.setAttribute('aria-describedby', describedBy)

    const onKey = (event: KeyboardEvent) => {
      if (!controls || event.altKey || event.ctrlKey || event.metaKey) return
      const offset = camera.position.clone().sub(controls.target)
      const s = new Spherical().setFromVector3(offset)
      switch (event.key) {
        case 'ArrowLeft':
          s.theta -= STEP
          break
        case 'ArrowRight':
          s.theta += STEP
          break
        case 'ArrowUp':
          s.phi = Math.max(0.05, s.phi - STEP)
          break
        case 'ArrowDown':
          s.phi = Math.min(Math.PI - 0.05, s.phi + STEP)
          break
        case '+':
        case '=':
          s.radius = Math.max(controls.minDistance, s.radius * ZOOM)
          break
        case '-':
        case '_':
          s.radius = Math.min(controls.maxDistance, s.radius / ZOOM)
          break
        case '0':
        case 'Home':
          event.preventDefault()
          onReset()
          return
        default:
          return
      }
      // Keep the page from scrolling while the view has focus
      event.preventDefault()
      camera.position.copy(controls.target).add(new Vector3().setFromSpherical(s))
      camera.lookAt(controls.target)
      controls.update()
      invalidate()
    }

    element.addEventListener('keydown', onKey)
    return () => element.removeEventListener('keydown', onKey)
  }, [camera, controls, element, invalidate, onReset, label, describedBy])

  return null
}
