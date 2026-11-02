import { useReducer, type ReactNode } from 'react'
import { DEFAULT_CONFIG } from './config'
import { DesignContext } from './design-context'
import { designReducer } from './reducer'

export function DesignProvider({ children }: { children: ReactNode }) {
  const [config, dispatch] = useReducer(designReducer, DEFAULT_CONFIG, structuredClone)

  return <DesignContext.Provider value={{ config, dispatch }}>{children}</DesignContext.Provider>
}
