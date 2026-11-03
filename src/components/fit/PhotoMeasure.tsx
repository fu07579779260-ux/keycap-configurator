import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { findIndexFinger } from '@/fit/hand-detector'
import { acrossFingertip, CARD_LONG_EDGE, distance, findEdges, pixelsPerMm, type Point } from '@/fit/measure'
import { fill, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'

type Stage = 'pick' | 'card' | 'finding' | 'finger' | 'done'

/** Largest size the photo is worked on at (enough for 0.1 mm at arm's length; keeps detection fast). */
const MAX_SIDE = 1600

/**
 * Measure a fingertip from a photo: mark the card's long edge for scale,
 * then the fingertip edges are found automatically (MediaPipe + colour
 * edges) or clicked by hand. Calls `onWidth` with the width in mm.
 */
export function PhotoMeasure({ onWidth }: { onWidth: (mm: number) => void }) {
  const t = useT()
  const inputId = useId()
  const canvas = useRef<HTMLCanvasElement>(null)
  const photo = useRef<HTMLCanvasElement | null>(null)
  const pixels = useRef<ImageData | null>(null)
  const [stage, setStage] = useState<Stage>('pick')
  const [card, setCard] = useState<Point[]>([])
  const [finger, setFinger] = useState<Point[]>([])
  const [note, setNote] = useState<StringKey | null>(null)

  // Redraw the photo and every mark
  const draw = useCallback(() => {
    const c = canvas.current
    const p = photo.current
    if (!c || !p) return
    c.width = p.width
    c.height = p.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(p, 0, 0)
    const dot = Math.max(4, p.width / 160)
    const line = (pts: Point[], colour: string) => {
      ctx.strokeStyle = colour
      ctx.fillStyle = colour
      ctx.lineWidth = dot / 2
      for (const pt of pts) {
        ctx.beginPath()
        ctx.arc(pt.x, pt.y, dot, 0, Math.PI * 2)
        ctx.fill()
      }
      if (pts.length === 2) {
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        ctx.lineTo(pts[1].x, pts[1].y)
        ctx.stroke()
      }
    }
    line(card, '#c2410c')
    line(finger, '#1d4ed8')
  }, [card, finger])

  useEffect(draw, [draw])

  const loadPhoto = async (file: File | undefined) => {
    if (!file) return
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    const p = document.createElement('canvas')
    p.width = Math.round(bitmap.width * scale)
    p.height = Math.round(bitmap.height * scale)
    const ctx = p.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(bitmap, 0, 0, p.width, p.height)
    pixels.current = ctx.getImageData(0, 0, p.width, p.height)
    photo.current = p
    setCard([])
    setFinger([])
    setNote(null)
    setStage('card')
  }

  const colourAt = ({ x, y }: Point): [number, number, number] | null => {
    const img = pixels.current
    if (!img) return null
    const xi = Math.round(x)
    const yi = Math.round(y)
    if (xi < 0 || yi < 0 || xi >= img.width || yi >= img.height) return null
    const i = (yi * img.width + xi) * 4
    return [img.data[i], img.data[i + 1], img.data[i + 2]]
  }

  /** Card marked: try to find the fingertip on our own. */
  const autoFinger = async (cardPts: Point[]) => {
    setStage('finding')
    try {
      const found = photo.current ? await findIndexFinger(photo.current) : null
      if (!found) {
        setNote('fit.photo.noHand')
        setStage('finger')
        return
      }
      const { centre, across } = acrossFingertip(found.dip, found.tip)
      const pxPerMm = pixelsPerMm(cardPts[0], cardPts[1], CARD_LONG_EDGE)
      const edges = findEdges(colourAt, centre, across, pxPerMm * 15)
      if (!edges) {
        setNote('fit.photo.noEdges')
        setStage('finger')
        return
      }
      finish(cardPts, edges)
      setNote('fit.photo.auto')
    } catch (error) {
      console.error('Hand detection failed', error)
      setNote('fit.photo.detectorFailed')
      setStage('finger')
    }
  }

  const finish = (cardPts: Point[], fingerPts: Point[]) => {
    setFinger(fingerPts)
    setStage('done')
    onWidth(distance(fingerPts[0], fingerPts[1]) / pixelsPerMm(cardPts[0], cardPts[1], CARD_LONG_EDGE))
  }

  const onClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const c = canvas.current
    if (!c) return
    const box = c.getBoundingClientRect()
    const pt = { x: ((event.clientX - box.left) / box.width) * c.width, y: ((event.clientY - box.top) / box.height) * c.height }
    if (stage === 'card') {
      const next = [...card, pt]
      setCard(next)
      if (next.length === 2) void autoFinger(next)
    } else if (stage === 'finger' || stage === 'done') {
      // Clicking after a result starts a hand measurement
      const next = stage === 'done' ? [pt] : [...finger, pt]
      setFinger(next)
      setStage(next.length === 2 ? 'done' : 'finger')
      if (next.length === 2) {
        setNote('fit.photo.manual')
        finish(card, next)
      }
    }
  }

  const instructions: Record<Stage, StringKey> = {
    pick: 'fit.photo.howTo',
    card: card.length === 0 ? 'fit.photo.cardFirst' : 'fit.photo.cardSecond',
    finding: 'fit.photo.finding',
    finger: finger.length === 0 ? 'fit.photo.fingerFirst' : 'fit.photo.fingerSecond',
    done: 'fit.photo.adjust',
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-graphite">{t('fit.photo.howTo')}</p>
      <label
        htmlFor={inputId}
        className="inline-flex cursor-pointer items-center border border-ink bg-card px-3 py-2 text-sm hover:bg-secondary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
      >
        {stage === 'pick' ? t('fit.photo.choose') : t('fit.photo.another')}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => void loadPhoto(e.target.files?.[0])}
        />
      </label>

      {stage !== 'pick' && (
        <>
          <p role="status" className="text-sm font-medium">
            {t(instructions[stage])}
          </p>
          {note && <p className="text-xs text-graphite">{t(note)}</p>}
          <canvas
            ref={canvas}
            onClick={onClick}
            aria-label={t('fit.photo.canvas')}
            className="w-full max-w-2xl cursor-crosshair border border-ink"
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="border-ink" onClick={() => { setCard([]); setFinger([]); setNote(null); setStage('card') }}>
              {t('fit.photo.restart')}
            </Button>
            {card.length === 2 && (
              <Button size="sm" variant="outline" className="border-ink" onClick={() => { setFinger([]); setNote(null); setStage('finger') }}>
                {t('fit.photo.byHand')}
              </Button>
            )}
          </div>
          {card.length === 2 && (
            <p className="text-xs text-graphite">
              {fill(t('fit.photo.scale'), { px: pixelsPerMm(card[0], card[1], CARD_LONG_EDGE).toFixed(1) })}
            </p>
          )}
        </>
      )}
    </div>
  )
}
