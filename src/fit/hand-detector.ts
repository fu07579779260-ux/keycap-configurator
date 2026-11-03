import type { HandLandmarker } from '@mediapipe/tasks-vision'
import type { Point } from './measure'

let ready: Promise<HandLandmarker> | undefined

/**
 * MediaPipe hand landmarker, loaded on first use from this site's own
 * public/mediapipe folder (WASM ≈14 MB, model ≈7.6 MB) instead of
 * Google's CDN. Runs entirely in the browser: the photo never leaves it.
 */
export function loadHandDetector(): Promise<HandLandmarker> {
  ready ??= (async () => {
    const { FilesetResolver, HandLandmarker } = await import('@mediapipe/tasks-vision')
    const base = import.meta.env.BASE_URL
    const fileset = await FilesetResolver.forVisionTasks(`${base}mediapipe/wasm`)
    return HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: `${base}mediapipe/hand_landmarker.task`, delegate: 'CPU' },
      runningMode: 'IMAGE',
      numHands: 1,
    })
  })().catch((error) => {
    ready = undefined
    throw error
  })
  return ready
}

/** Index finger's last knuckle (DIP) and tip in image pixels, or null when no hand is found. */
export async function findIndexFinger(image: HTMLImageElement | HTMLCanvasElement): Promise<{ dip: Point; tip: Point } | null> {
  const detector = await loadHandDetector()
  const result = detector.detect(image)
  const hand = result.landmarks[0]
  if (!hand) return null
  const w = image.width
  const h = image.height
  // MediaPipe landmarks 7 and 8: index finger DIP joint and fingertip (normalised 0–1)
  return { dip: { x: hand[7].x * w, y: hand[7].y * h }, tip: { x: hand[8].x * w, y: hand[8].y * h } }
}
