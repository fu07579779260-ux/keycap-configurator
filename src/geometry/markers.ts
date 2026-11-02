import type { Manifold } from 'manifold-3d'
import type { TopConfig } from '@/model/config'
import { topSurfaceZ, type BodyParams } from './body'

/** How far a marker's base sinks into the top so it fuses with the shell. */
const EMBED = 0.3
/** Never reach deeper than this below the surface (keeps clear of the cavity). */
const MAX_EMBED = 0.6
/** Texture: bump diameter and spacing. */
const TEXTURE_DOT = 0.8
const TEXTURE_PITCH = 1.6
/** Ring: width of the band. */
const RING_BAND = 0.8

/**
 * Raised tactile marker on the top surface (dot, bar, ring or texture),
 * or null when the top form isn't tactile. Position is relative to the
 * centre of the top; the marker rises `markerHeight` above the surface.
 */
export function buildMarker(M: typeof Manifold, p: BodyParams, top: TopConfig): Manifold | null {
  if (top.form !== 'tactile') return null

  const owned: Manifold[] = []
  const own = (m: Manifold) => (owned.push(m), m)
  const cx = top.markerX
  const cy = p.topSkew + top.markerY
  const size = top.markerSize
  const h = top.markerHeight

  /** Lowest surface point under a footprint, so the base is buried everywhere. */
  const baseZ = (x: number, y: number, halfX: number, halfY: number) => {
    let min = Infinity
    for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) min = Math.min(min, topSurfaceZ(p, x + dx * halfX, y + dy * halfY))
    return Math.max(min - EMBED, topSurfaceZ(p, x, y) - MAX_EMBED)
  }

  /** Smooth bump: a sphere flattened to height h, centred on the surface. */
  const dome = (x: number, y: number, diameter: number) => {
    const r = diameter / 2
    return own(own(own(M.sphere(r, 32)).scale([1, 1, h / r])).translate(x, y, topSurfaceZ(p, x, y)))
  }

  try {
    let marker: Manifold
    let base: number

    switch (top.markerType) {
      case 'dot':
        marker = dome(cx, cy, size)
        base = baseZ(cx, cy, size / 2, size / 2)
        break

      case 'bar': {
        // Rounded bar along x, like the F and J homing bars
        const width = Math.min(1.6, Math.max(0.8, size * 0.25))
        const reach = Math.max(0, size - width) / 2
        marker = own(M.hull([dome(cx - reach, cy, width), dome(cx + reach, cy, width)]))
        base = baseZ(cx, cy, size / 2, width / 2)
        break
      }

      case 'ring': {
        base = baseZ(cx, cy, size / 2, size / 2)
        const tall = topSurfaceZ(p, cx, cy) + h - base
        const outer = own(own(M.cylinder(tall, size / 2, size / 2, 48)).translate(cx, cy, base))
        const innerRadius = size / 2 - RING_BAND
        // Too small for a hole: a flat disc instead
        marker =
          innerRadius > 0.2
            ? own(outer.subtract(own(own(M.cylinder(tall + 2, innerRadius, innerRadius, 48)).translate(cx, cy, base - 1))))
            : outer
        break
      }

      case 'texture': {
        // Grid of small bumps filling a square of the marker size
        const count = Math.max(1, Math.floor(size / TEXTURE_PITCH))
        const start = -((count - 1) * TEXTURE_PITCH) / 2
        const dots: Manifold[] = []
        for (let i = 0; i < count; i++) {
          for (let j = 0; j < count; j++) {
            dots.push(dome(cx + start + i * TEXTURE_PITCH, cy + start + j * TEXTURE_PITCH, TEXTURE_DOT))
          }
        }
        marker = own(M.union(dots))
        base = baseZ(cx, cy, size / 2, size / 2)
        break
      }
    }

    // Keep only the part above the base; the result is returned, so not owned
    return marker.trimByPlane([0, 0, 1], base)
  } finally {
    for (const m of owned) m.delete()
  }
}
