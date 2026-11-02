import { useEffect, useMemo, useState } from 'react'
import { bodyParams, buildBody, type MeshData } from '@/geometry/body'
import { loadManifold } from '@/geometry/manifold-loader'
import { buildKeycap, buildKeycapParts } from '@/geometry/solid'
import { keycapExtras } from '@/geometry/keycap-extras'
import type { KeycapConfig } from '@/model/config'
import { useUploadedBase } from '@/model/upload-store'

interface KeycapMeshes {
  /** Main-colour part (the whole keycap when there's no second colour). */
  body: MeshData
  /** Second-colour part, when a second colour is on and there's something to colour. */
  accent: MeshData | null
  hollow: boolean
}

/**
 * The printable keycap meshes for a design. The solid body shows instantly;
 * the hollow shell with stems replaces it once the WASM geometry kernel
 * has loaded (and after each change, a few milliseconds later).
 */
export function useKeycapMesh(config: KeycapConfig): KeycapMeshes {
  const solid = useMemo(() => buildBody(bodyParams(config)), [config])
  const [built, setBuilt] = useState<{ body: MeshData; accent: MeshData | null } | null>(null)
  const upload = useUploadedBase()

  useEffect(() => {
    let cancelled = false
    loadManifold()
      .then((wasm) => {
        if (cancelled) return
        const extras = keycapExtras(config, upload)
        setBuilt(
          config.manufacturing.secondColour
            ? buildKeycapParts(wasm, config, extras)
            : { body: buildKeycap(wasm, config, extras), accent: null },
        )
      })
      .catch((error) => console.error('Could not build the hollow keycap', error))
    return () => {
      cancelled = true
    }
  }, [config, upload])

  // Keep showing the previous result while the next one is built, so the view doesn't flicker
  if (built) return { ...built, hollow: true }
  return { body: solid, accent: null, hollow: false }
}
