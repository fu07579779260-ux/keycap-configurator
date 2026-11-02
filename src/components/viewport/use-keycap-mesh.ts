import { useEffect, useMemo, useState } from 'react'
import { bodyParams, buildBody, type MeshData } from '@/geometry/body'
import { loadManifold } from '@/geometry/manifold-loader'
import { buildKeycap } from '@/geometry/solid'
import { keycapExtras } from '@/geometry/text-outline'
import type { KeycapConfig } from '@/model/config'

/**
 * The printable keycap mesh for a design. The solid body shows instantly;
 * the hollow shell with stems replaces it once the WASM geometry kernel
 * has loaded (and after each change, a few milliseconds later).
 */
export function useKeycapMesh(config: KeycapConfig): { mesh: MeshData; hollow: boolean } {
  const solid = useMemo(() => buildBody(bodyParams(config)), [config])
  const [shell, setShell] = useState<{ config: KeycapConfig; mesh: MeshData } | null>(null)

  useEffect(() => {
    let cancelled = false
    loadManifold()
      .then((wasm) => {
        if (!cancelled) setShell({ config, mesh: buildKeycap(wasm, config, keycapExtras(config)) })
      })
      .catch((error) => console.error('Could not build the hollow keycap', error))
    return () => {
      cancelled = true
    }
  }, [config])

  // Keep showing the previous shell while the next one is built, so the view doesn't flicker
  if (shell) return { mesh: shell.mesh, hollow: true }
  return { mesh: solid, hollow: false }
}
