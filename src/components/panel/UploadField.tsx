import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { loadRhino } from '@/export/load-rhino'
import type { MeshData } from '@/geometry/body'
import { meshSize } from '@/geometry/dimensions'
import { loadManifold } from '@/geometry/manifold-loader'
import { toManifold } from '@/geometry/manifold-mesh'
import { parse3dm, parseStl, type UploadError } from '@/geometry/upload'
import { fill, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { useDesign } from '@/model/design-context'
import { uploadStore, useUploadedBase } from '@/model/upload-store'
import { ToggleField } from './controls'

type Problem = UploadError | 'not-closed' | 'wrong-type'

/** Read a file into a mesh, and check it's a closed solid the geometry kernel can merge. */
async function readBase(file: File): Promise<MeshData | Problem> {
  const ext = file.name.toLowerCase().split('.').pop()
  if (ext !== 'stl' && ext !== '3dm') return 'wrong-type'
  const buffer = await file.arrayBuffer()
  const mesh = ext === 'stl' ? parseStl(buffer) : parse3dm(await loadRhino(), buffer)
  if (typeof mesh === 'string') return mesh
  try {
    const solid = toManifold(await loadManifold(), mesh)
    solid.delete()
    return mesh
  } catch {
    return 'not-closed'
  }
}

export function UploadField() {
  const t = useT()
  const { config, patch } = useDesign()
  const upload = useUploadedBase()
  const inputId = useId()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<Problem | null>(null)

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setProblem(null)
    try {
      const result = await readBase(file)
      if (typeof result === 'string') {
        setProblem(result)
        return
      }
      uploadStore.set({ name: file.name, mesh: result, triangles: result.indices.length / 3 })
      patch('stem', { uploadName: file.name })
    } catch (error) {
      console.error('Upload failed', error)
      setProblem('unreadable')
    } finally {
      setBusy(false)
    }
  }

  const remove = () => {
    uploadStore.set(null)
    patch('stem', { uploadName: null })
  }

  // The design remembers the file name, but the file itself is gone after a reload
  const missing = !upload && config.stem.uploadName
  const size = upload ? meshSize(upload.mesh.positions) : null

  return (
    <div className="space-y-3">
      <label
        htmlFor={inputId}
        className="flex cursor-pointer items-center justify-center border border-dashed border-ink bg-card px-3 py-4 text-sm hover:bg-secondary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
      >
        {busy ? t('upload.reading') : upload ? t('upload.replace') : t('upload.choose')}
        <input
          id={inputId}
          type="file"
          accept=".stl,.3dm"
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            void onFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </label>

      <div role="status" className="space-y-1 text-xs">
        {upload && size && (
          <p>
            <span className="font-mono break-all">{upload.name}</span>
            <span className="text-graphite">
              {' '}
              · {upload.triangles.toLocaleString()} {t('export.triangles')} · {size.width.toFixed(2)} × {size.depth.toFixed(2)} ×{' '}
              {size.height.toFixed(2)} mm
            </span>
          </p>
        )}
        {missing && <p className="text-signal">{fill(t('upload.missing'), { name: config.stem.uploadName ?? '' })}</p>}
        {problem && <p className="text-signal">{t(`upload.error.${problem}` as StringKey)}</p>}
        {!upload && !missing && !problem && <p className="text-graphite">{t('upload.hint')}</p>}
      </div>

      <ToggleField
        label={t('upload.autoPlace')}
        checked={config.stem.uploadAutoPlace}
        onChange={(uploadAutoPlace) => patch('stem', { uploadAutoPlace })}
        hint={config.stem.uploadAutoPlace ? t('upload.autoPlaceOn') : t('upload.autoPlaceOff')}
      />

      {upload && (
        <Button size="sm" variant="ghost" onClick={remove}>
          {t('upload.remove')}
        </Button>
      )}
    </div>
  )
}
