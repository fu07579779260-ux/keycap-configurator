import { createContext, useContext, type Dispatch } from 'react'
import { DEFAULT_CONFIG, type KeycapConfig, type Section } from './config'
import type { DesignAction } from './reducer'

export const DesignContext = createContext<{
  config: KeycapConfig
  dispatch: Dispatch<DesignAction>
}>({ config: DEFAULT_CONFIG, dispatch: () => {} })

/** Current keycap design plus typed helpers to change it. */
export function useDesign() {
  const { config, dispatch } = useContext(DesignContext)
  return {
    config,
    dispatch,
    patch: <S extends Section>(section: S, values: Partial<KeycapConfig[S]>) =>
      dispatch({ type: 'patch', section, values } as DesignAction),
    load: (input: unknown) => dispatch({ type: 'load', config: input }),
    reset: () => dispatch({ type: 'reset' }),
  }
}
