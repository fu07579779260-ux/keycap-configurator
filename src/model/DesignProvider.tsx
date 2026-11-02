import { useEffect, useReducer, type ReactNode } from 'react'
import { designFromHash, loadSession, saveSession, stripShareParam } from '@/persistence/session'
import { DEFAULT_CONFIG, type KeycapConfig } from './config'
import { DesignContext } from './design-context'
import { designReducer } from './reducer'

/** Start from a shared link if there is one, else the last visit, else the defaults. */
function initialDesign(): KeycapConfig {
  const shared = designFromHash(window.location.hash)
  if (shared) {
    stripShareParam()
    return shared
  }
  return loadSession() ?? structuredClone(DEFAULT_CONFIG)
}

const AUTOSAVE_DELAY = 300

export function DesignProvider({ children }: { children: ReactNode }) {
  const [config, dispatch] = useReducer(designReducer, undefined, initialDesign)

  // Autosave shortly after the last change (sliders fire many changes)
  useEffect(() => {
    const timer = setTimeout(() => saveSession(config), AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
  }, [config])

  // A share link opened while the app is already open
  useEffect(() => {
    const onHashChange = () => {
      const shared = designFromHash(window.location.hash)
      if (!shared) return
      stripShareParam()
      dispatch({ type: 'load', config: shared })
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return <DesignContext.Provider value={{ config, dispatch }}>{children}</DesignContext.Provider>
}
