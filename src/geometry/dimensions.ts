/** Key pitch: centre-to-centre distance between neighbouring keys. */
export const KEY_PITCH = 19.05
/** Gap left between neighbouring keycaps at the base. */
export const KEY_GAP = 1.05

/** Base footprint in mm: 1u → 18.00 × 18.00. */
export function footprint(widthU: number) {
  return { width: widthU * KEY_PITCH - KEY_GAP, depth: KEY_PITCH - KEY_GAP }
}

/** Overall size of a Z-up mesh: width (x), depth (y), height (z). */
export function meshSize(positions: Float32Array) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      min[k] = Math.min(min[k], positions[i + k])
      max[k] = Math.max(max[k], positions[i + k])
    }
  }
  return { width: max[0] - min[0], depth: max[1] - min[1], height: max[2] - min[2] }
}
