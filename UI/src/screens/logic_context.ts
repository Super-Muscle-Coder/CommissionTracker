/**
 * Context that carries the Routers of every interface workflow, placed there
 * by Main (i2-scaffold.md, Step I2.6). Pages and screen hooks get Routers only
 * through useLogic(), never by importing a Routers value (R8).
 */
import { createContext, useContext } from 'react'
import type { ManageClientRouters } from '../logic/workflows/manage_client/routers'

// The set of Routers, composed from each interface workflow's Routers type
// (imported as a type from logic/workflows/<name>/routers).
export type LogicRouters = {
  manageClient: ManageClientRouters
}

export const LogicContext = createContext<LogicRouters | null>(null)

export function useLogic(): LogicRouters {
  const routers = useContext(LogicContext)
  if (routers === null) throw new Error('LogicContext is missing: the screen is rendered outside Main')
  return routers
}
